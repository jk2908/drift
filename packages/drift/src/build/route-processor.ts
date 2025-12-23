import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { BuildContext, Endpoint, HTTPMethod, Page, PluginConfig } from '../types'

import { APP_DIR, EntryKind, GENERATED_DIR } from '../config'

import {
	createPrerenderRoutesFromParamsList,
	getPrerenderParamsList,
	isPrerenderable,
} from '../server/prerender'

export type ScanResult = {
	pages: {
		page: string
		layouts: (string | null)[]
		shell: string
		error?: string
		loaders?: (string | null)[]
	}[]
	endpoints: string[]
}

export type Imports = {
	endpoints: { static: Map<string, string> }
	components: { static: Map<string, string>; dynamic: Map<string, string> }
}

export type Modules = Record<
	string,
	{
		shellId?: string
		layoutIds?: (string | null)[]
		pageId?: string
		errorId?: string
		loadingIds?: (string | null)[]
		endpointId?: string
	}
>

const HTTP_VERBS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as const

export class RouteProcessor {
	ctx: BuildContext | null = null
	config: PluginConfig | null = null

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
	 * @returns data.prerenderableRoutes - the prerenderable routes
	 * @throws if an error occurs during scanning
	 */
	async run() {
		try {
			return await this.process(await this.#scan(APP_DIR))
		} catch (err) {
			this.ctx?.logger.error('[run]: failed to build manifest', err)
			throw err
		}
	}

	/**
	 * Scan the filesystem to get all routes for processing
	 * @param dir - the directory to scan
	 * @param res - the result object to populate
	 * @param prev - the previous layout, error and loading results
	 * @returns a result object containing page and API routes
	 */
	async #scan(
		dir: string,
		res: ScanResult = { pages: [], endpoints: [] },
		prev: { layouts: (string | null)[]; errors: string[]; loaders: (string | null)[] } = {
			layouts: [],
			errors: [],
			loaders: [],
		},
	) {
		try {
			// define valid route files
			const EXTENSIONS = {
				page: ['tsx', 'jsx'],
				api: ['ts', 'js'],
			} as const

			// define route file types
			const TYPES = {
				page: '+page',
				error: '+error',
				layout: '+layout',
				loading: '+loading',
				endpoint: '+endpoint',
			} as const

			// map of valid files for each type
			const validFiles = {
				[TYPES.page]: new Set(EXTENSIONS.page.map(ext => `${TYPES.page}.${ext}`)),
				[TYPES.error]: new Set(EXTENSIONS.page.map(ext => `${TYPES.error}.${ext}`)),
				[TYPES.loading]: new Set(EXTENSIONS.page.map(ext => `${TYPES.loading}.${ext}`)),
				[TYPES.layout]: new Set(EXTENSIONS.page.map(ext => `${TYPES.layout}.${ext}`)),
				[TYPES.endpoint]: new Set(EXTENSIONS.api.map(ext => `${TYPES.endpoint}.${ext}`)),
			}

			const files = await fs.readdir(dir, { withFileTypes: true })

			// keep a predictable order so layout/loading are picked
			// up before page. Avoids OS dir ordering causing pages
			// to steal layout/loaders first and drop alignment
			files.sort((a, b) => {
				if (a.isFile() && b.isDirectory()) return -1
				if (a.isDirectory() && b.isFile()) return 1

				if (a.isFile() && b.isFile()) {
					const priority = (d: Dirent) => {
						const base = path.basename(d.name)

						if (validFiles[TYPES.layout].has(base)) return 0
						if (validFiles[TYPES.error].has(base)) return 1
						if (validFiles[TYPES.loading].has(base)) return 2
						if (validFiles[TYPES.page].has(base)) return 3
						if (validFiles[TYPES.endpoint].has(base)) return 4

						return 5
					}

					return priority(a) - priority(b)
				}

				return 0
			})

			// current layout, error, and loader files
			let currentLayout: string | undefined
			let currentError: string | undefined
			let currentLoader: string | undefined

			for (const file of files) {
				const route = path.join(dir, file.name)

				if (file.isDirectory()) {
					const next = {
						layouts: [...prev.layouts, currentLayout ?? null],
						errors: currentError ? [...prev.errors, currentError] : prev.errors,
						loaders: [...prev.loaders, currentLoader ?? null],
					}

					await this.#scan(route, res, next)
				} else {
					const base = path.basename(file.name)
					const relative = path.relative(process.cwd(), route).replace(/\\/g, '/')

					if (validFiles[TYPES.layout].has(base)) {
						currentLayout = relative
					} else if (validFiles[TYPES.error].has(base)) {
						currentError = relative
					} else if (validFiles[TYPES.loading].has(base)) {
						currentLoader = relative
					} else if (validFiles[TYPES.endpoint].has(base)) {
						res.endpoints.push(relative)
					} else if (validFiles[TYPES.page].has(base)) {
						const layouts = [...prev.layouts, currentLayout ?? null]
						const errors = currentError ? [...prev.errors, currentError] : prev.errors
						const loaders = [...prev.loaders, currentLoader ?? null]
						const shell = layouts?.[0]

						if (!shell) throw new Error('Missing app shell')

						res.pages.push({
							page: relative,
							error: errors?.[errors?.length - 1],
							loaders,
							layouts: layouts.length > 1 ? layouts.slice(1) : [],
							shell,
						})
					}
				}
			}

			return res satisfies ScanResult
		} catch (err) {
			this.ctx?.logger.error(`[#scan]: Failed to compose manifest from ${dir}`, err)

			return {
				pages: [],
				endpoints: [],
			} satisfies ScanResult
		}
	}

	/**
	 * Process the scanned route data
	 * @param res the scanned route data
	 * @returns an object containing finalised manifest, imports, and prerenderable routes
	 */
	async process(res: ScanResult) {
		const processed = new Set<string>()
		const prerenderableRoutes = new Set<string>()

		const manifest: Record<string, Page | Endpoint | (Page | Endpoint)[]> = {}

		// imports for endpoints and components
		const imports: Imports = {
			endpoints: { static: new Map() },
			components: { static: new Map(), dynamic: new Map() },
		}

		const modules: Modules = {}
		const prerenderableCache = new Map<string, boolean>()

		for (const file of res.pages) {
			try {
				if (!this.ctx || !this.config) continue

				const { shell, layouts, page, error, loaders = [] } = file

				const route = RouteProcessor.toCanonicalRoute(page)
				const params = RouteProcessor.getParams(page)
				const depth = RouteProcessor.getDepth(route)

				const isDynamic = route.includes(':')
				const isCatchAll = route.includes('*')

				// track if any parent is prerenderable
				let hasInheritedPrerender = false

				const shellImport = RouteProcessor.getImportPath(shell)

				const shellId = `${EntryKind.SHELL}${Bun.hash(shellImport)}`
				const layoutIds: (string | null)[] = []
				let errorId: string | undefined
				const loadingIds: (string | null)[] = []

				// if shell not processed yet
				if (!processed.has(shell)) {
					let cached = prerenderableCache.get(shell)

					if (cached === undefined) {
						cached = await isPrerenderable(shell, this.ctx)
						prerenderableCache.set(shell, cached)
					}

					hasInheritedPrerender = cached

					imports.components.static.set(shellId, shellImport)
					processed.add(shell)
				} else {
					hasInheritedPrerender =
						hasInheritedPrerender || (prerenderableCache.get(shell) ?? false)
				}

				for (const layout of layouts) {
					if (!layout) {
						layoutIds.push(null)
						continue
					}

					const layoutImport = RouteProcessor.getImportPath(layout)
					const layoutId = `${EntryKind.LAYOUT}${Bun.hash(layoutImport)}`

					let cached = prerenderableCache.get(layout)

					if (cached === undefined) {
						cached = await isPrerenderable(layout, this.ctx)
						prerenderableCache.set(layout, cached)
					}

					hasInheritedPrerender ||= cached
					// always record chain. Only imports are deduped
					layoutIds.push(layoutId)

					// avoid re-importing seen layouts
					if (!processed.has(layout)) {
						imports.components.dynamic.set(layoutId, layoutImport)
						processed.add(layout)
					}
				}

				if (error) {
					const errorImport = RouteProcessor.getImportPath(error)
					errorId = `${EntryKind.ERROR}${Bun.hash(errorImport)}`

					// dedupe imports but keep the id for every
					// route that declares this error boundary
					if (!processed.has(error)) {
						imports.components.dynamic.set(errorId, errorImport)
						processed.add(error)
					}
				}

				for (const loader of loaders) {
					// hole if level does not declare a loader.
					// Keep slot so indices match layouts
					if (!loader) {
						loadingIds.push(null)
						continue
					}

					const loaderImport = RouteProcessor.getImportPath(loader)
					const loaderId = `${EntryKind.LOADING}${Bun.hash(loaderImport)}`

					loadingIds.push(loaderId)

					// dedupe imports but still assign the slot for this route
					if (!processed.has(loader)) {
						imports.components.dynamic.set(loaderId, loaderImport)
						processed.add(loader)
					}
				}

				const pageImport = RouteProcessor.getImportPath(page)
				const pageId = `${EntryKind.PAGE}${Bun.hash(pageImport)}`
				const shouldPrerender =
					hasInheritedPrerender ||
					this.config?.prerender === 'full' ||
					(await isPrerenderable(page, this.ctx))

				if (shouldPrerender) {
					if (!isDynamic && !isCatchAll) {
						prerenderableRoutes.add(route)
					} else {
						const paramsList = await getPrerenderParamsList(
							path.resolve(process.cwd(), page),
							this.ctx,
						)

						if (!paramsList?.length) {
							this.ctx?.logger.warn(
								'[process]',
								`No prerenderable params found for ${page}, skipping prerendering`,
							)
						}

						const dynamicPrerenderableRoutes = createPrerenderRoutesFromParamsList(
							route,
							paramsList,
						)

						if (!dynamicPrerenderableRoutes?.length) {
							this.ctx?.logger.warn(
								'[process]',
								`No prerenderable routes found for ${page}, skipping prerendering`,
							)
						} else {
							for (const r of dynamicPrerenderableRoutes) prerenderableRoutes.add(r)
						}
					}
				}

				const entry = {
					__id: pageId,
					__path: route,
					__params: params,
					__kind: EntryKind.PAGE,
					__depth: depth,
					method: 'get' as const,
					paths: {
						layouts: [shell, ...layouts],
						error: error ?? null,
						loaders,
					},
					prerender: shouldPrerender,
					dynamic: isDynamic,
					catch_all: isCatchAll,
				}

				if (manifest[route]) {
					if (Array.isArray(manifest[route])) {
						manifest[route].push(entry)
					} else {
						manifest[route] = [manifest[route], entry]
					}
				} else {
					manifest[route] = entry
				}

				imports.components.dynamic.set(pageId, pageImport)
				modules[pageId] = { shellId, layoutIds, pageId, errorId, loadingIds }
				processed.add(page)
			} catch (err) {
				this.ctx?.logger.error('[process]: failed to process page', err)
			}
		}

		for (const file of res.endpoints) {
			try {
				if (!this.ctx || processed.has(file)) continue

				const route = RouteProcessor.toCanonicalRoute(file)
				const params = RouteProcessor.getParams(file)

				const code = await Bun.file(file).text()
				const exports = this.ctx.transpiler.scan(code).exports

				const group: Endpoint[] = []

				for (const method of exports) {
					if (!HTTP_VERBS.includes(method as HTTPMethod)) {
						this.ctx?.logger.warn(
							'[process]',
							`Ignoring unsupported HTTP verb: ${method} in ${file}`,
						)
						continue
					}

					const m = method.toLowerCase() as Lowercase<HTTPMethod>
					const endpointId = `${EntryKind.ENDPOINT}${Bun.hash(RouteProcessor.getImportPath(file))}_${m}`

					group.push({
						__id: endpointId,
						__path: route,
						__params: params,
						__kind: EntryKind.ENDPOINT,
						method: m,
					})

					imports.endpoints.static.set(endpointId, RouteProcessor.getImportPath(file))
					modules[endpointId] = { endpointId }
					processed.add(file)
				}

				const entry = group.length === 1 ? group[0] : group

				if (manifest[route]) {
					if (Array.isArray(manifest[route])) {
						manifest[route] = [
							...manifest[route],
							...(Array.isArray(entry) ? entry : [entry]),
						]
					} else {
						manifest[route] = [
							manifest[route],
							...(Array.isArray(entry) ? entry : [entry]),
						]
					}
				} else {
					manifest[route] = entry
				}
			} catch (err) {
				this.ctx?.logger.error('[process]: failed to process route', err)
			}
		}

		return { manifest, imports, prerenderableRoutes, modules }
	}

	/**
	 * Extracts dynamic parameter names from a file path
	 * @param file - the file path to extract parameters from
	 * @returns an array of parameter names
	 */
	static getParams(file: string) {
		return Array.from(file.matchAll(/\[(?:\.\.\.)?([^\]]+)\]/g), m => m[1])
	}

	/**
	 * Get the depth of a route based on slashes
	 * @param route - the route to get the depth of
	 * @returns the depth of the route
	 */
	static getDepth(route: string) {
		if (route === '/') return 0

		// count slashes to determine depth
		return route.split('/').length - 1
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
			.replace(/\/\+endpoint\.(j|t)sx?$/, '')
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
