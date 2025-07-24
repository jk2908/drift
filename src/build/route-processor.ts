import fs from 'node:fs/promises'
import path from 'node:path'

import type { BuildContext, PluginConfig } from '../types'

import { APP_DIR, EntryKind, GENERATED_DIR } from '../config'

import { id } from '../shared/utils'

import {
	createPrerenderRoutesFromParamsList,
	getPrerenderParamsList,
	isPrerenderable,
} from '../server/prerender'

export type ComposeResult = {
	pages: { page: string; layouts: string[]; shell: string; error?: string }[]
	apis: string[]
}

export type Imports = {
	apis: { static: Map<string, string> }
	pages: { static: Map<string, string>; dynamic: Map<string, string> }
}

export type Handlers = string[]
export type prerenders = BuildContext['prerenders']

export class RouteProcessor {
	ctx: BuildContext | null = null
	config: PluginConfig | null = null

	cwd: ReturnType<NodeJS.Process['cwd']> = ''
	generatedDir: string = ''

	#prerenders: BuildContext['prerenders'] = new Set()
	#apiHandlers: Handlers = []
	#imports: Imports = {
		apis: { static: new Map() },
		pages: { static: new Map(), dynamic: new Map() },
	}

	constructor(ctx: BuildContext, config: PluginConfig) {
		this.ctx = ctx
		this.config = config

		this.cwd = process.cwd()
		this.generatedDir = path.join(this.cwd, GENERATED_DIR)
	}

	/**
	 * Run the scanner to get the app route and associated data
	 * needed for codegen
	 * @returns data needed for codegen
	 * @returns data.entries - the full list of entries for the manifest
	 * @returns data.imports - the dynamic and static imports for page and API routes
	 * @returns data.apiHandlers - the API handlers ids
	 * @returns data.prerenders - the prerenderable routes
	 * @throws if an error occurs during scanning
	 */
	async run() {
		try {
			const routes = await this.compose(APP_DIR)
			const [pageEntries, apiEntries] = await Promise.all([
				this.createPageEntries(routes.pages),
				this.createAPIEntries(routes.apis),
			])

			return {
				entries: [...pageEntries, ...apiEntries].filter(e => e !== null),
				imports: this.#imports,
				apiHandlers: this.#apiHandlers,
				prerenders: this.#prerenders,
			}
		} catch (err) {
			this.ctx?.logger.error('Scanner:run: failed to build manifest', err)
			throw err
		}
	}

	/**
	 * Compose the route manifest from the file system
	 * @param dir the directory to compose the tree from
	 * @param EXTENSIONS the EXTENSIONS to compose the tree from
	 * @param res the result object to populate
	 * @param prev the previous layout and error results
	 * @returns the composed route manifest
	 */
	async compose(
		dir: string,
		res: ComposeResult = { pages: [], apis: [] },
		prev: { layouts: string[]; errors: string[] } = { layouts: [], errors: [] },
	) {
		try {
			const files = await fs.readdir(dir, { withFileTypes: true })

			const EXTENSIONS = {
				page: ['tsx', 'jsx'],
				api: ['ts', 'js'],
			} as const

			const TYPES = {
				page: '+page',
				error: '+error',
				layout: '+layout',
				api: '+api',
			} as const

			const validFiles = {
				[TYPES.page]: new Set(EXTENSIONS.page.map(ext => `${TYPES.page}.${ext}`)),
				[TYPES.error]: new Set(EXTENSIONS.page.map(ext => `${TYPES.error}.${ext}`)),
				[TYPES.layout]: new Set(EXTENSIONS.page.map(ext => `${TYPES.layout}.${ext}`)),
				[TYPES.api]: new Set(EXTENSIONS.api.map(ext => `${TYPES.api}.${ext}`)), // route.ts, route.js
			}

			let currLayout: string | undefined
			let currError: string | undefined

			for (const file of files) {
				const route = path.join(dir, file.name)

				if (file.isDirectory()) {
					const next = {
						layouts: currLayout ? [...prev.layouts, currLayout] : prev.layouts,
						errors: currError ? [...prev.errors, currError] : prev.errors,
					}

					await this.compose(route, res, next)
				} else {
					const base = path.basename(file.name)
					const relative = path.relative(this.cwd, route).replace(/\\/g, '/')

					if (validFiles[TYPES.layout].has(base)) {
						currLayout = relative
					} else if (validFiles[TYPES.error].has(base)) {
						currError = relative
					} else if (validFiles[TYPES.api].has(base)) {
						res.apis.push(relative)
					} else if (validFiles[TYPES.page].has(base)) {
						const layouts = currLayout ? [...prev.layouts, currLayout] : prev.layouts
						const errors = currError ? [...prev.errors, currError] : prev.errors
						const shell = layouts?.[0]

						if (!shell) throw new Error('Must provide app shell')

						res.pages.push({
							page: relative,
							error: errors?.[errors?.length - 1],
							layouts: layouts.length > 1 ? layouts.slice(1) : [],
							shell,
						})
					}
				}
			}

			return res satisfies ComposeResult
		} catch (err) {
			this.ctx?.logger.error(
				`Scanner:compose: Failed to compose manifest from ${dir}`,
				err,
			)

			return {
				pages: [],
				apis: [],
			} satisfies ComposeResult
		}
	}

	/**
	 * Create the page entries for the manifest
	 * @param routes the routes to create entries for
	 * @returns the created entries
	 */
	async createPageEntries(routes: ComposeResult['pages']) {
		if (!routes.length) return []

		try {
			const layoutCache = new Map<string, { id: string; prerender: boolean }>()

			let shellId: string | undefined
			let errorId: string | undefined

			const entries = await Promise.all(
				routes.map(async ({ page, layouts, shell, error }) => {
					if (!this.ctx) throw new Error('Build context is not set')

					const layoutIds: string[] = []

					const pageImportPath = this.#getImportPath(page)
					const pageRoute = this.#toManifestRoute(page)
					const pageId = `${EntryKind.PAGE}${id()}`

					const isDynamic = pageRoute.includes(':')
					const isCatchAll = isDynamic && pageRoute.includes('*')

					let hasInheritedPrerender = false
					let cachedShell = layoutCache.get(shell)

					if (!cachedShell) {
						shellId = `${EntryKind.SHELL}${id()}`

						cachedShell = {
							id: shellId,
							prerender: await isPrerenderable(shell, this.ctx),
						}

						layoutCache.set(shell, cachedShell)
						this.#imports.pages.static?.set(
							`default as ${shellId}`,
							this.#getImportPath(shell),
						)
					}

					hasInheritedPrerender = cachedShell.prerender

					for (const layout of layouts) {
						let cachedLayout = layoutCache.get(layout)

						if (!cachedLayout) {
							const layoutId = `${EntryKind.LAYOUT}${id()}`

							cachedLayout = {
								id: layoutId,
								prerender: await isPrerenderable(layout, this.ctx),
							}

							layoutCache.set(layout, cachedLayout)
							this.#imports.pages.dynamic?.set(
								layoutId,
								`import('${this.#getImportPath(layout)}')`,
							)
						}

						layoutIds.push(cachedLayout.id)
						hasInheritedPrerender ||= cachedLayout.prerender
					}

					const shouldPrerender =
						hasInheritedPrerender ||
						(this.config?.prerender === 'full' && !isDynamic) ||
						(await isPrerenderable(page, this.ctx))

					if (shouldPrerender) {
						if (!isDynamic) {
							this.#prerenders.add(page)
						} else {
							const list = await getPrerenderParamsList(
								path.resolve(this.cwd, page),
								this.ctx,
							)

							if (!list?.length) {
								this.ctx?.logger.warn(
									`No prerenderable params found for ${page}, skipping prerendering`,
								)
							}

							const routesToPrerender = createPrerenderRoutesFromParamsList(page, list)

							if (!routesToPrerender?.length) {
								this.ctx?.logger.warn(
									`No prerenderable routes found for ${page}, skipping prerendering`,
								)
							} else {
								for (const route of routesToPrerender) this.#prerenders.add(route)
							}
						}
					}

					this.#imports.pages.dynamic?.set(pageId, `import('${pageImportPath}')`)

					if (error) {
						errorId = `${EntryKind.ERROR}${id()}`

						this.#imports.pages.dynamic?.set(
							errorId,
							`import('${this.#getImportPath(error)}')`,
						)
					}

					return `
          '${pageRoute}': {
              id: '${pageId}',
              Shell: ${shellId},
              layouts: [${layoutIds
								.map(id => `lazy(() => ${id}.then(m => ({ default: m.default })))`)
								.reverse()
								.join(', ')}],
              Cmp: lazy(() => ${pageId}.then(m => ({ default: m.default }))),
              Err: ${error ? `lazy(() => ${errorId}.then(m => ({ default: m.default })))` : 'null'},
              async metadata({ params }: { params?: Params }) {
                const m = await ${pageId}
                // @todo: fix type
                const metadata = 
                  'metadata' in m ? m.metadata as ((({ params }: { params?: Params }) => Promise<Metadata>) | Metadata) : null
  
                if (!metadata) return {}
                if (typeof metadata !== 'function') return metadata
                
                return metadata.length > 0 ? metadata({ params }) : metadata({})
              },
              prerender: ${shouldPrerender},
              dynamic: ${isDynamic},
              catchAll: ${isCatchAll},
              type: '${EntryKind.PAGE}',
            }
          `.trim()
				}),
			)

			return entries.filter(Boolean)
		} catch (err) {
			this.ctx?.logger.error(
				'Scanner:createPageEntries: Failed to create page entries',
				err,
			)
			return []
		}
	}

	/**
	 * Create the API entries for the manifest
	 * @param routes the routes to create entries for
	 * @returns the created entries
	 */
	async createAPIEntries(routes: ComposeResult['apis']) {
		try {
			if (!routes.length) return []

			const entries = await Promise.all(
				routes.map(async file => {
					if (!this.ctx) throw new Error('Build context is not set')

					const importPath = this.#getImportPath(file)
					const route = this.#toManifestRoute(file)
					const mod = await import(path.resolve(this.cwd, file))

					const group: string[] = []

					for (const key in mod) {
						if (
							!['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(key)
						) {
							this.ctx?.logger.warn(`Ignoring unsupported HTTP verb: ${key} in ${file}`)
							continue
						}

						const method = key.toLowerCase()
						const apiId = `${EntryKind.API}${id()}`

						this.#imports.apis.static?.set(`${key} as ${apiId}`, importPath)

						group.push(`{
              id: '${apiId}',
              method: '${method.toUpperCase()}',
              handler: ${apiId},
              type: '${EntryKind.API}',
            }`)

						this.#apiHandlers.push(`.${method}('${route}', ${apiId})`)
					}

					if (group.length) {
						if (group.length > 1) {
							return `'${route}': [${group.join(',\n')}]`
						}
						return `'${route}': ${group[0]}`
					}

					return null
				}),
			)

			return entries.filter(Boolean)
		} catch (err) {
			this.ctx?.logger.error(
				`Scanner:createAPIEntries: Failed to create API entries`,
				err,
			)
			return []
		}
	}

	/**
	 * Convert a file path to a valid manifest route
	 * @param file the file to convert to a manifest route
	 * @returns the converted manifest route
	 * @example `./+page.tsx` becomes `/`
	 */
	#toManifestRoute(file: string) {
		const route = file
			.replace(new RegExp(`^${APP_DIR}`), '')
			.replace(/\/\+page\.(j|t)sx?$/, '')
			.replace(/\/\+api\.(j|t)sx?$/, '')
			.replace(/\[\.\.\.(.+?)\]/g, ':$1*')
			.replace(/\[(.+?)\]/g, ':$1')

		if (!route || route === '') return '/'

		return route.startsWith('/') ? route : `/${route}`
	}

	/**
	 * Get the import path for a file
	 * This finds the relative path from the generated
	 * directory to the file, removes the extension and
	 * replaces backslashes with forward slashes.
	 * @param file the file to get the import path for
	 * @returns the import path for the file
	 */
	#getImportPath(file: string) {
		return path
			.relative(this.generatedDir, path.resolve(this.cwd, file))
			.replace(/\\/g, '/')
			.replace(/\.(t|j)sx?$/, '')
	}
}
