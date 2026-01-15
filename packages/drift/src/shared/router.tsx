import { lazy } from 'react'

import type {
	DynamicImport,
	EnhancedMatch,
	ImportMap,
	Manifest,
	ManifestEntry,
	Match,
	Params,
	Primitive,
	Segment,
	Metadata as TMetadata,
	View,
} from '../types'

import { EntryKind } from '../build/route-processor'

import { HttpException } from './http-exception'
import { Logger } from './logger'
import { PRIORITY } from './metadata'

/**
 * Handle routing and matching of within the application
 * @param manifest - contains all the routes (pages and api) and their metadata
 * @param map - contains the static and dynamic imports for each route
 * @see {@link Manifest} for the structure of the manifest
 * @see {@link ImportMap} for the structure of the import map
 */
export class Router {
	/**
	 * Cache of enhanced matches
	 */
	static #enhancedMatchCache = new Map<string, EnhancedMatch>()

	/**
	 * Cache of loaded modules from dynamic imports
	 */
	static #moduleCache = new WeakMap<
		DynamicImport,
		{
			/**
			 * The promise resolving to the module
			 */
			promise: Promise<Record<string, unknown>>
			/**
			 * The loaded module
			 */
			module?: Record<string, unknown>
			/**
			 * The (maybe lazy) React component loaded from the module
			 */
			Component?: View<React.ComponentProps<any>>
		}
	>()

	static #logger: Logger = new Logger()

	#manifest: Manifest = {}
	#importMap: ImportMap = {}

	#routes: Array<{
		entry: Segment
		segments: string[]
		score: number
	}> = []
	#staticRoutes = new Map<string, Segment>()
	#routesByLength = new Map<
		number,
		Array<{ entry: Segment; segments: string[]; score: number }>
	>()

	constructor(manifest: Manifest, importMap: ImportMap) {
		this.#manifest = manifest
		this.#importMap = importMap

		for (const path in this.#manifest) {
			const entry = this.#manifest[path]

			// process array entries (multiple entries per path)
			// and register each page entry with the router
			if (Array.isArray(entry)) {
				for (const e of entry) {
					if (e.__kind !== EntryKind.PAGE) continue
					const route = Router.#createRouteEntry(e)
					this.#routes.push(route)
					if (!e.__path.includes(':') && !e.__path.includes('*')) {
						this.#staticRoutes.set(e.__path, e)
					} else {
						const bucket = this.#routesByLength.get(route.segments.length) ?? []
						bucket.push(route)
						this.#routesByLength.set(route.segments.length, bucket)
					}
				}

				continue
			}

			// single entry - only register if it's a page
			if (entry.__kind !== EntryKind.PAGE) continue
			const route = Router.#createRouteEntry(entry)
			this.#routes.push(route)
			if (!entry.__path.includes(':') && !entry.__path.includes('*')) {
				this.#staticRoutes.set(entry.__path, entry)
			} else {
				const bucket = this.#routesByLength.get(route.segments.length) ?? []
				bucket.push(route)
				this.#routesByLength.set(route.segments.length, bucket)
			}
		}
	}

	/**
	 * Narrow down a route entry to a page entry if it exists
	 * @param entry - the route entry to narrow
	 * @returns the narrowed page entry or null
	 */
	static narrow(entry?: ManifestEntry | ManifestEntry[]) {
		if (Array.isArray(entry)) {
			return entry.find(e => e.__kind === EntryKind.PAGE) || null
		}

		return entry?.__kind === EntryKind.PAGE ? entry : null
	}

	/**
	 * Get the status code for a matched route that may or may not have errored
	 * @param match - the matched route
	 * @returns the status code
	 */
	static getMatchStatusCode(match: Match | EnhancedMatch | null) {
		if (!match) return 404

		if ('error' in match) {
			return match.error instanceof HttpException ? match.error.status : 500
		}

		return 200
	}

	/**
	 * Load and cache a module from a dynamic import
	 * @param loader - the dynamic import
	 * @returns the module entry
	 */
	static #load(loader: DynamicImport) {
		let entry = Router.#moduleCache.get(loader)
		if (entry) return entry

		const promise = loader()
			.then(mod => {
				const entry = Router.#moduleCache.get(loader)
				if (entry) entry.module = mod

				return mod
			})
			.catch(err => {
				Router.#moduleCache.delete(loader)
				throw err
			})

		entry = { promise }
		Router.#moduleCache.set(loader, entry)

		return entry
	}

	/**
	 * Lazily load and cache a component from a dynamic import
	 * @param loader - the dynamic import
	 * @returns a React lazy component
	 */
	static #view<T extends React.ComponentType<any>>(
		loader: DynamicImport,
	): View<React.ComponentProps<T>> {
		const entry = Router.#load(loader)

		Router.#logger?.debug(
			'[#view]',
			loader.toString().slice(0, 60),
			entry.module ? 'SYNC' : 'LAZY',
		)

		if (entry.module?.default) {
			entry.Component = entry.module.default as View<React.ComponentProps<T>>
			return entry.Component
		}

		if (entry.Component) return entry.Component as View<React.ComponentProps<T>>

		const Component = lazy(() =>
			entry.promise.then(mod => ({ default: mod.default as T })),
		)
		entry.Component = Component as View<React.ComponentProps<T>>

		return entry.Component
	}

	static #createRouteEntry(entry: Segment) {
		const segments = entry.__path.split('/').filter(Boolean)

		const score = segments.reduce((score, segment) => {
			if (segment === '*') return score
			if (segment.startsWith(':')) return score + 1
			return score + 2
		}, 0)

		return {
			entry,
			segments,
			score,
		}
	}

	static #matchEntry(
		route: { entry: Segment; segments: string[] },
		pathSegments: string[],
	) {
		const { entry, segments } = route

		if (entry.catch_all) {
			if (pathSegments.length < segments.length - 1) return null
		} else if (segments.length !== pathSegments.length) {
			return null
		}

		const params: Params = {}

		for (let index = 0; index < segments.length; index += 1) {
			const pattern = segments[index]
			const value = pathSegments[index]

			if (pattern === '*') {
				const name = entry.__params[0]
				params[name] = pathSegments.slice(index).join('/')
				return params
			}

			if (pattern.startsWith(':')) {
				if (!value) return null

				const name = pattern.slice(1)
				params[name] = value
				continue
			}

			if (pattern !== value) return null
		}

		return params
	}

	/**
	 * Match a route against the registered routes
	 * @param path - the path to match against the routes
	 * @returns the matched route or the closest parent for a 404.
	 */
	match(path: string) {
		const normalized = path === '/' ? path : path.replace(/\/$/, '')
		const directMatch = this.#staticRoutes.get(normalized)

		if (directMatch) {
			return {
				...directMatch,
				params: {},
			}
		}

		const pathSegments = normalized.split('/').filter(Boolean)
		const candidates = this.#routesByLength.get(pathSegments.length) ?? this.#routes

		let best: { entry: Segment; params: Params } | null = null
		let bestScore = -1

		for (const route of candidates) {
			const match = Router.#matchEntry(route, pathSegments)
			if (!match) continue

			if (route.score > bestScore) {
				best = { entry: route.entry, params: match }
				bestScore = route.score
			}
		}

		if (best) {
			return {
				...best.entry,
				params: best.params,
			}
		}

		// @note: if there's no match we'll traverse backwards
		// to find the closest user supplied error boundary
		const entry = this.closest(path, 'paths.404s')

		if (entry) {
			return {
				...entry,
				params: {},
				error: new HttpException(404, 'Not found'),
			}
		}

		return null
	}

	/**
	 * Enhance a matched route with its associated components
	 * @param match - the matched route to enhance
	 * @returns the enhanced route or null
	 */
	enhance(match: Match) {
		if (!match) return null

		const { __id } = match
		const cached = Router.#enhancedMatchCache.get(__id)

		if (cached) {
			Router.#logger?.debug('[enhance]', __id, 'CACHED')

			// update params and error in case they changed as part
			// of a dynamic route navigation
			cached.params = match.params
			cached.error = 'error' in match ? match.error : undefined

			return cached
		}

		const entry = this.#importMap[__id]
		if (!entry) return null

		const enhanced: EnhancedMatch = {
			ui: {
				layouts: [],
				Page: null,
				'404s': [],
				loaders: [],
			},
			...match,
		}

		// shell is a static import, layouts[0] in the enhanced match
		if (entry.shell) {
			enhanced.ui.layouts = [entry.shell.default as EnhancedMatch['ui']['layouts'][0]]
		}

		if (entry.layouts?.length) {
			const dynamicLayouts = entry.layouts.map(l =>
				l ? Router.#view<NonNullable<EnhancedMatch['ui']['layouts'][number]>>(l) : null,
			)
			enhanced.ui.layouts = [...enhanced.ui.layouts, ...dynamicLayouts]
		}

		if (entry.page) {
			enhanced.ui.Page = Router.#view<NonNullable<EnhancedMatch['ui']['Page']>>(
				entry.page,
			)
		}

		// load 404 boundaries
		if (entry['404s']?.length) {
			enhanced.ui['404s'] = entry['404s'].map(e =>
				e ? Router.#view<NonNullable<EnhancedMatch['ui']['404s'][number]>>(e) : null,
			)
		}

		// each route can display a loading component whilst layouts
		// are suspended - not inherited like other components
		if (entry.loaders?.length) {
			enhanced.ui.loaders = entry.loaders.map(l =>
				l ? Router.#view<NonNullable<EnhancedMatch['ui']['loaders'][number]>>(l) : null,
			)
		}

		if (entry.endpoint) enhanced.endpoint = entry.endpoint

		enhanced.metadata = ({ params, error }: { params?: Params; error?: Error }) => {
			const tasks: { task: Promise<TMetadata>; priority: number }[] = []

			if (entry.shell) {
				const metadata = entry.shell.metadata

				if (metadata) {
					if (typeof metadata === 'function') {
						tasks.push({
							task: Promise.resolve(metadata({ params, error })).catch(err => {
								Router.#logger?.error(`[enhance.metadata]: ${__id}`, err)
								return Promise.resolve({})
							}),
							priority: PRIORITY[EntryKind.SHELL],
						})
					} else if (typeof metadata === 'object') {
						tasks.push({
							task: Promise.resolve(metadata),
							priority: PRIORITY[EntryKind.SHELL],
						})
					}
				}
			}

			if (entry.layouts?.length) {
				for (const l of entry.layouts) {
					if (!l) continue
					const e = Router.#load(l)

					if (e.module && 'metadata' in e.module) {
						const metadata = e.module?.metadata

						if (metadata) {
							if (typeof metadata === 'function') {
								tasks.push({
									task: Promise.resolve(metadata({ params, error })).catch(err => {
										Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
										return {}
									}),
									priority: PRIORITY[EntryKind.LAYOUT],
								})
							} else if (typeof metadata === 'object') {
								tasks.push({
									task: Promise.resolve(metadata),
									priority: PRIORITY[EntryKind.LAYOUT],
								})
							}
						}
					} else {
						tasks.push({
							task: e.promise.then(m => {
								const metadata = m.metadata
								if (!metadata) return {}

								if (typeof metadata === 'function') {
									return metadata({ params, error }).catch((err: unknown) => {
										Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
										return {}
									})
								} else if (typeof metadata === 'object') {
									return metadata
								}
							}),
							priority: PRIORITY[EntryKind.LAYOUT],
						})
					}
				}
			}

			if (entry.page) {
				const e = Router.#load(entry.page)

				if (e.module && 'metadata' in e.module) {
					const metadata = e.module.metadata

					if (metadata) {
						if (typeof metadata === 'function') {
							tasks.push({
								task: Promise.resolve(metadata({ params, error })).catch(err => {
									Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
									return {}
								}),
								priority: PRIORITY[EntryKind.PAGE],
							})
						} else if (typeof metadata === 'object') {
							tasks.push({
								task: Promise.resolve(metadata),
								priority: PRIORITY[EntryKind.PAGE],
							})
						}
					}
				} else {
					tasks.push({
						task: e.promise.then(m => {
							const metadata = m.metadata
							if (!metadata) return {}

							if (typeof metadata === 'function') {
								return metadata({ params, error }).catch((err: unknown) => {
									Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
									return {}
								})
							} else if (typeof metadata === 'object') {
								return metadata
							}
						}),
						priority: PRIORITY[EntryKind.PAGE],
					})
				}
			}

			if (entry['404s'] && error) {
				for (const errLoader of entry['404s']) {
					if (!errLoader) continue
					const e = Router.#load(errLoader)

					if (e.module && 'metadata' in e.module) {
						const metadata = e.module.metadata

						if (metadata) {
							if (typeof metadata === 'function') {
								tasks.push({
									task: Promise.resolve(metadata({ params, error })).catch(err => {
										Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
										return {}
									}),
									priority: PRIORITY[EntryKind[404]],
								})
							} else if (typeof metadata === 'object') {
								tasks.push({
									task: Promise.resolve(metadata),
									priority: PRIORITY[EntryKind[404]],
								})
							}
						}
					} else {
						tasks.push({
							task: e.promise.then(m => {
								const metadata = m.metadata
								if (!metadata) return {}

								if (typeof metadata === 'function') {
									return metadata({ params, error }).catch((err: unknown) => {
										Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
										return {}
									})
								} else if (typeof metadata === 'object') {
									return metadata
								}
							}),
							priority: PRIORITY[EntryKind[404]],
						})
					}
				}
			}

			return Promise.allSettled(tasks)
		}

		Router.#enhancedMatchCache.set(__id, enhanced)

		return enhanced
	}

	/**
	 * Find the closest ancestor entry for a given path and property
	 * @param path - the path to start searching from
	 * @param property - the property to match against
	 * @returns the closest ancestor entry or null
	 */
	closest(path: string, property: string, value?: Omit<Primitive, 'undefined'>) {
		const parts = path.split('/').filter(Boolean)
		const segments = property.split('.')

		for (let i = parts.length; i >= 0; i--) {
			const testPath = i === 0 ? '/' : `/${parts.slice(0, i).join('/')}`
			const entry = this.#manifest[testPath]
			if (!entry) continue

			const pageEntry = Router.narrow(entry)
			if (!pageEntry) continue

			let curr: unknown = pageEntry

			for (const seg of segments) {
				if (
					typeof curr !== 'object' ||
					curr === null ||
					!(seg in (curr as Record<string, unknown>))
				) {
					curr = undefined
					break
				}

				curr = (curr as Record<string, unknown>)[seg]
				if (curr === undefined) break
			}

			if (curr !== undefined && curr !== null) {
				// if the matched property is an array (e.g. paths.errors),
				// only consider it present if it contains at least one
				// non-null value. If all entries are null/undefined
				// then treat it as absent and continue searching
				if (Array.isArray(curr)) {
					if (!curr.some(e => e != null)) curr = undefined
				}

				// if the check above cleared curr, continue searching
				if (curr === undefined || curr === null) continue
				// if a specific value was provided, ensure it matches
				if (value !== undefined && curr !== value) return null

				return pageEntry
			}
		}

		return null
	}

	/**
	 * Preload a route's assets
	 * @param path - the path to preload
	 * @returns a promise that resolves when all assets are loaded
	 */
	async preload(path: string) {
		const match = this.match(path)
		if (!match) return

		const imports = this.#importMap[match.__id]
		if (!imports) return

		const loads: Promise<unknown>[] = []

		if (imports.layouts) {
			for (const l of imports.layouts) {
				if (!l) continue
				loads.push(Router.#load(l).promise)
			}
		}

		if (imports.page) loads.push(Router.#load(imports.page).promise)

		if (imports['404s']) {
			for (const err of imports['404s']) {
				if (!err) continue
				loads.push(Router.#load(err).promise)
			}
		}

		if (imports.loaders) {
			for (const loader of imports.loaders) {
				if (!loader) continue
				loads.push(Router.#load(loader).promise)
			}
		}

		return Promise.allSettled(loads)
	}

	get manifest() {
		return this.#manifest
	}

	get importMap() {
		return this.#importMap
	}
}
