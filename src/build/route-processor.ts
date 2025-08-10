import fs from 'node:fs/promises'
import path from 'node:path'

import type { BuildContext, HTTPMethod, PluginConfig } from '../types'

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

export type Handlers = Map<
	string,
	{ handler: string; id: string; type: typeof EntryKind.PAGE | typeof EntryKind.API }
>

export type prerenders = BuildContext['prerenders']

type UnifiedEntries = {
	[route: string]: string | string[]
}

export class RouteProcessor {
	ctx: BuildContext | null = null
	config: PluginConfig | null = null

	#prerenders: BuildContext['prerenders'] = new Set()
	#imports: Imports = {
		apis: { static: new Map() },
		pages: { static: new Map(), dynamic: new Map() },
	}
	#handlers: Handlers = new Map()

	constructor(ctx: BuildContext, config: PluginConfig) {
		this.ctx = ctx
		this.config = config
	}

	/**
	 * Run the RouteProcessor to get the app route and associated data
	 * needed for codegen
	 * @returns data needed for codegen
	 * @returns data.entries - the full list of entries for the manifest
	 * @returns data.imports - the dynamic and static imports for page and API routes
	 * @returns data.handlers - the Hono route handlers
	 * @returns data.prerenders - the prerenderable routes
	 * @throws if an error occurs during scanning
	 */
	async run() {
		try {
			const routes = await this.compose(APP_DIR)
			const entries = this.createUnifiedEntries(
				...(await Promise.all([
					this.createPageEntries(routes.pages),
					this.createAPIEntries(routes.apis),
				])),
			)

			return {
				entries,
				imports: this.#imports,
				handlers: this.#handlers,
				prerenders: this.#prerenders,
			}
		} catch (err) {
			this.ctx?.logger.error('RouteProcessor:run: failed to build manifest', err)
			throw err
		}
	}

	/**
	 * Compose the route manifest from the file system
	 * @param dir - the directory to compose the tree from
	 * @param res - the result object to populate
	 * @param prev - the previous layout and error results
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
				[TYPES.api]: new Set(EXTENSIONS.api.map(ext => `${TYPES.api}.${ext}`)),
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
					const relative = path.relative(process.cwd(), route).replace(/\\/g, '/')

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
				`RouteProcessor:compose: Failed to compose manifest from ${dir}`,
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
	 * @param routes - the routes to create entries for
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

					const pageImportPath = RouteProcessor.getImportPath(page)
					const route = RouteProcessor.toCanonicalRoute(page)
					const params = RouteProcessor.#getParams(page)

					const pageId = `${EntryKind.PAGE}${id()}`

					const isDynamicRoute = route.includes(':')
					const isCatchAllRoute = route.includes('*')

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
							`* as ${shellId}`,
							RouteProcessor.getImportPath(shell),
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
								`import('${RouteProcessor.getImportPath(layout)}')`,
							)
						}

						layoutIds.push(cachedLayout.id)
						hasInheritedPrerender ||= cachedLayout.prerender
					}

					const shouldPrerender =
						hasInheritedPrerender ||
						(this.config?.prerender === 'full' && !isDynamicRoute) ||
						(await isPrerenderable(page, this.ctx))

					if (shouldPrerender) {
						if (!isDynamicRoute) {
							this.#prerenders.add(page)
						} else {
							const list = await getPrerenderParamsList(
								path.resolve(process.cwd(), page),
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
					this.#handlers.set(`get/${route}`, {
						handler: this.#createHandlerEntry('get', route, pageId, EntryKind.PAGE),
						id: pageId,
						type: EntryKind.PAGE,
					})

					if (error) {
						errorId = `${EntryKind.ERROR}${id()}`

						this.#imports.pages.dynamic?.set(
							errorId,
							`import('${RouteProcessor.getImportPath(error)}')`,
						)
					}

					return {
						route,
						entry: `
          	{
              __id: '${pageId}',
							__path: '${route}',
							__params: [${params.map(p => `'${p}'`).join(', ')}],
              Shell: ${shellId}.default,
              layouts: [${layoutIds
								.map(id => `lazy(() => ${id}.then(m => ({ default: m.default })))`)
								.reverse()
								.join(', ')}],
              Cmp: lazy(() => ${pageId}.then(m => ({ default: m.default }))),
              Err: ${error ? `lazy(() => ${errorId}.then(m => ({ default: m.default })))` : 'null'},
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve(${shellId}),
									${layoutIds.length ? `${layoutIds.join(', ')},` : ''}
									error ? ${errorId ? `${errorId}` : 'Promise.resolve()'} : ${pageId}
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: ${shouldPrerender},
              dynamic: ${isDynamicRoute},
              catchAll: ${isCatchAllRoute},
              type: '${EntryKind.PAGE}',
            }
          `.trim(),
					}
				}),
			)

			return entries.filter(Boolean)
		} catch (err) {
			this.ctx?.logger.error(
				'RouteProcessor:createPageEntries: Failed to create page entries',
				err,
			)

			return []
		}
	}

	/**
	 * Create the API entries for the manifest
	 * @param routes - the routes to create entries for
	 * @returns the created entries
	 */
	async createAPIEntries(routes: ComposeResult['apis']) {
		try {
			if (!routes.length) return []

			const entries = await Promise.all(
				routes.map(async file => {
					if (!this.ctx) throw new Error('Build context is not set')

					const importPath = RouteProcessor.getImportPath(file)
					const route = RouteProcessor.toCanonicalRoute(file)
					const params = RouteProcessor.#getParams(file)

					const mod = await import(path.resolve(process.cwd(), file))

					const group: string[] = []

					for (const key in mod) {
						if (
							!['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(key)
						) {
							this.ctx?.logger.warn(`Ignoring unsupported HTTP verb: ${key} in ${file}`)
							continue
						}

						const method = key.toLowerCase() as Lowercase<HTTPMethod>
						const apiId = `${EntryKind.API}${id()}`

						this.#imports.apis.static?.set(`${key} as ${apiId}`, importPath)

						group.push(`{
              __id: '${apiId}',
							__path: '${route}',
							__params: [${params.map(p => `'${p}'`).join(', ')}],
              method: '${method.toUpperCase()}',
              handler: ${apiId},
              type: '${EntryKind.API}',
            }`)

						this.#handlers.set(`${method}/${route}`, {
							handler: this.#createHandlerEntry(method, route, apiId, EntryKind.API),
							id: apiId,
							type: EntryKind.API,
						})
					}

					if (group.length) {
						if (group.length > 1) {
							return { route, entry: group }
						}

						return { route, entry: group[0] }
					}

					return null
				}),
			)

			return entries.filter(Boolean)
		} catch (err) {
			this.ctx?.logger.error(
				`RouteProcessor:createAPIEntries: Failed to create API entries`,
				err,
			)

			return []
		}
	}

	/**
	 * @param pageEntries - the page entries
	 * @param apiEntries - the API entries
	 * @returns the unified entries
	 */
	createUnifiedEntries(
		pageEntries: Awaited<ReturnType<typeof this.createPageEntries>>,
		apiEntries: Awaited<ReturnType<typeof this.createAPIEntries>>,
	) {
		const entries = [...pageEntries, ...apiEntries]
			.filter(n => n !== null)
			.reduce<UnifiedEntries>((acc, { route, entry }) => {
				if (acc[route]) {
					if (!Array.isArray(acc[route])) {
						acc[route] = [acc[route]]
					}

					if (Array.isArray(entry)) {
						acc[route].push(...entry)
					} else {
						acc[route].push(entry)
					}
				} else {
					acc[route] = entry
				}
				return acc
			}, {})

		return Object.entries(entries).map(([route, entry]) => {
			if (Array.isArray(entry)) {
				return `'${route}': [${entry.join(',\n')}]`
			}

			return `'${route}': ${entry}`
		})
	}

	/**
	 * Create a handler entry for a route
	 * @param method - the HTTP method
	 * @param route - the route path
	 * @param id - the entry id
	 * @param type - the entry type
	 * @returns the handler entry
	 */
	#createHandlerEntry(
		method: Lowercase<HTTPMethod>,
		route: string,
		id: string,
		type: typeof EntryKind.PAGE | typeof EntryKind.API,
	) {
		const key = `${method}/${route}`

		if (!this.#handlers.has(key)) {
			switch (type) {
				case EntryKind.PAGE: {
					return `.${method}('${route}', c => ssr(c, Shell, manifest, config))`
				}
				case EntryKind.API: {
					return `.${method}('${route}', ${id})`
				}
				default: {
					throw new Error(`createHandlerEntry: Unknown entry type: ${type}`)
				}
			}
		}

		// @note: if we reach here, there is a page route and an API route
		// with the same method (GET) and path

		const existing = this.#handlers.get(key)
		const handler = (existing?.type === EntryKind.API && existing?.id) || id

		return `.${method}('${route}', async c => {
			const accept = c.req.header('Accept') ?? ''

			if (accept.includes('text/html')) {
				return ssr(c, Shell, manifest, config)
			}

			// handler might be called with no args so 
			// ignore to prevent red squigglies
			// @ts-ignore
			return ${handler}(c)
		})`
	}

	/**
	 * Extracts dynamic parameter names from a file path
	 * @param file - the file path to extract parameters from
	 * @returns an array of parameter names
	 */
	static #getParams(file: string) {
		return Array.from(file.matchAll(/\[(?:\.\.\.)?([^\]]+)\]/g), m => m[1])
	}

	/**
	 * Convert a file path to a Hono-compatible route.
	 * @param file - the file to convert to a route
	 * @returns the converted route
	 */
	static toCanonicalRoute(file: string) {
		const route = file
			.replace(new RegExp(`^${APP_DIR}`), '')
			.replace(/\/\+page\.(j|t)sx?$/, '')
			.replace(/\/\+api\.(j|t)sx?$/, '')
			.replace(/\[\.\.\..+?\]/g, '*') // catch-all routes
			.replace(/\[(.+?)\]/g, ':$1') // dynamic routes

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
	static getImportPath(file: string) {
		const cwd = process.cwd()
		const generatedDir = path.join(cwd, GENERATED_DIR)

		return path
			.relative(generatedDir, path.resolve(cwd, file))
			.replace(/\\/g, '/')
			.replace(/\.(t|j)sx?$/, '')
	}
}
