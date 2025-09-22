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
	pages: { page: string; layouts: string[]; shell: string; error?: string }[]
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
		layoutIds?: string[]
		pageId?: string
		errorId?: string
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
	 * @returns data.prerenders - the prerenderable routes
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
	 * @param prev - the previous layout and error results
	 * @returns a result object containing page and API routes
	 */
	async #scan(
		dir: string,
		res: ScanResult = { pages: [], endpoints: [] },
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

					await this.#scan(route, res, next)
				} else {
					const base = path.basename(file.name)
					const relative = path.relative(process.cwd(), route).replace(/\\/g, '/')

					if (validFiles[TYPES.layout].has(base)) {
						currLayout = relative
					} else if (validFiles[TYPES.error].has(base)) {
						currError = relative
					} else if (validFiles[TYPES.api].has(base)) {
						res.endpoints.push(relative)
					} else if (validFiles[TYPES.page].has(base)) {
						const layouts = currLayout ? [...prev.layouts, currLayout] : prev.layouts
						const errors = currError ? [...prev.errors, currError] : prev.errors
						const shell = layouts?.[0]

						if (!shell) throw new Error('!Shell')

						res.pages.push({
							page: relative,
							error: errors?.[errors?.length - 1],
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
	 * @returns an object containing finalised manifest, imports, and prerenders
	 */
	async process(res: ScanResult) {
		const processed = new Set<string>()
		const prerenders = new Set<string>()

		const manifest: Record<string, Page | Endpoint | (Page | Endpoint)[]> = {}

		const imports: Imports = {
			endpoints: { static: new Map() },
			components: { static: new Map(), dynamic: new Map() },
		}

		const modules: Modules = {}

		for (const file of res.pages) {
			try {
				if (!this.ctx || !this.config) continue

				const { shell, layouts, page, error } = file

				const route = RouteProcessor.toCanonicalRoute(page)
				const params = RouteProcessor.getParams(page)

				const isDynamic = route.includes(':')
				const isCatchAll = route.includes('*')

				let hasInheritedPrerender = false

				const shellImport = RouteProcessor.getImportPath(shell)

				const shellId = `${EntryKind.SHELL}${Bun.hash(shellImport)}`
				const layoutIds: string[] = []
				let errorId: string | undefined

				if (!processed.has(shell)) {
					hasInheritedPrerender = await isPrerenderable(shell, this.ctx)

					imports.components.static.set(shellId, shellImport)
					processed.add(shell)
				}

				for (const layout of layouts) {
					if (!processed.has(layout)) {
						const layoutImport = RouteProcessor.getImportPath(layout)
						const layoutId = `${EntryKind.LAYOUT}${Bun.hash(layoutImport)}`
						hasInheritedPrerender ||= await isPrerenderable(layout, this.ctx)

						layoutIds.push(layoutId)
						imports.components.dynamic.set(layoutId, layoutImport)
						processed.add(layout)
					}
				}

				if (error && !processed.has(error)) {
					const errorImport = RouteProcessor.getImportPath(error)
					errorId = `${EntryKind.ERROR}${Bun.hash(errorImport)}`

					imports.components.dynamic.set(errorId, errorImport)
					processed.add(error)
				}

				const pageImport = RouteProcessor.getImportPath(page)
				const pageId = `${EntryKind.PAGE}${Bun.hash(pageImport)}`
				const shouldPrerender =
					hasInheritedPrerender ||
					this.config?.prerender === 'full' ||
					(await isPrerenderable(page, this.ctx))

				if (shouldPrerender) {
					if (!isDynamic && !isCatchAll) {
						prerenders.add(route)
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

						const dynamicPrerenders = createPrerenderRoutesFromParamsList(
							page,
							paramsList,
						)

						if (!dynamicPrerenders?.length) {
							this.ctx?.logger.warn(
								'[process]',
								`No prerenderable routes found for ${page}, skipping prerendering`,
							)
						} else {
							for (const r of dynamicPrerenders) prerenders.add(r)
						}
					}
				}

				const entry = {
					__id: pageId,
					__path: route,
					__params: params,
					__kind: EntryKind.PAGE,
					method: 'get' as const,
					paths: {
						shell,
						layouts,
						error: error ?? null,
					},
					shouldPrerender,
					isDynamic,
					isCatchAll,
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
				modules[pageId] = { shellId, layoutIds, pageId, errorId }
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

		return { manifest, imports, prerenders, modules }
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
