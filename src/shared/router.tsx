import { lazy } from 'react'

import { RegExpRouter } from 'hono/router/reg-exp-router'
import { SmartRouter } from 'hono/router/smart-router'
import { TrieRouter } from 'hono/router/trie-router'

import type {
	DynamicImport,
	EnhancedMatch,
	ImportMap,
	Manifest,
	ManifestEntry,
	Match,
	Page,
	Params,
	Primitive,
	Metadata as TMetadata,
	View,
} from '../types'

import { EntryKind } from '../config'

import { HTTPException } from './error'
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
	static #enhancedMatchCache = new Map<string, EnhancedMatch>()
	static #moduleCache = new WeakMap<
		DynamicImport,
		{
			p: Promise<Record<string, unknown>>
			v?: Record<string, unknown>
			L?: View<React.ComponentProps<any>>
		}
	>()
	static #logger: Logger = new Logger()

	#manifest: Manifest = {}
	#importMap: ImportMap = {}

	// @see: https://hono.dev/docs/concepts/routers
	#router: SmartRouter<Page> = new SmartRouter({
		routers: [new RegExpRouter(), new TrieRouter()],
	})

	constructor(manifest: Manifest, importMap: ImportMap) {
		this.#manifest = manifest
		this.#importMap = importMap

		for (const path in this.#manifest) {
			const entry = this.#manifest[path]

			if (Array.isArray(entry)) {
				for (const e of entry) {
					if (e.__kind !== EntryKind.PAGE) continue

					this.#router.add('GET', path, e)
				}

				continue
			}

			if (entry.__kind !== EntryKind.PAGE) continue

			this.#router.add('GET', path, entry)
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
			return match.error instanceof HTTPException ? match.error.status : 500
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

		const p = loader()
			.then(mod => {
				const entry = Router.#moduleCache.get(loader)
				if (entry) entry.v = mod

				return mod
			})
			.catch(err => {
				Router.#moduleCache.delete(loader)
				throw err
			})

		entry = { p }
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
			entry.v ? 'SYNC' : 'LAZY',
		)

		if (entry.v?.default) {
			entry.L = entry.v.default as View<React.ComponentProps<T>>
			return entry.L
		}

		if (entry.L) return entry.L as View<React.ComponentProps<T>>

		const L = lazy(() => entry.p.then(mod => ({ default: (mod as any).default as T })))
		entry.L = L as View<React.ComponentProps<T>>

		return entry.L
	}

	/**
	 * Match a route against the registered routes using Hono's engine
	 * @param path - the path to match against the routes
	 * @returns the matched route or the closest parent for a 404.
	 */
	match(path: string) {
		const result = this.#router.match('GET', path)

		if (result) {
			const [handlers, paramStash] = result
			const entry = handlers?.[0]?.[0]

			// a match is valid if we have a handler. Params are optional
			if (entry) {
				const params: Params = {}

				// only process parameters if the router returned any
				if (paramStash?.length) {
					if (entry.isCatchAll) {
						// for a catch-all, we use the __path property on the matched entry.
						// Neccessary because Hono doesn't expose wildcard params so we need
						// to grab them from here. Derive the value by removing the
						// static part of the pattern from the full path that was
						// matched by the router
						const staticPart = entry.__path.substring(0, entry.__path.indexOf('*'))
						const value = paramStash[0].substring(staticPart.length)
						params[entry.__params[0]] = value
					} else {
						// for dynamic routes, values are in paramStash starting at index 1
						const paramValues = paramStash.slice(1)

						// loop through the params and assign values to match.params
						for (let i = 0; i < entry.__params.length; i++) {
							const name = entry.__params[i]
							const value = paramValues[i]

							if (value === undefined) continue

							params[name] = value
						}
					}
				}

				return {
					...entry,
					params,
				}
			}
		}

		// @note: if there's no match we'll traverse backwards
		// to find the closest user supplied error boundary
		const entry = this.closest(path, 'paths.error')

		if (entry) {
			return {
				...entry,
				params: {},
				error: new HTTPException(404, 'Not found'),
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

			// this route might(?) have been loaded previously without
			// an error present. If we've got an error now, and the
			// cached version doesn't have an error boundary, we
			// need to load it up
			if ('error' in match && match.error && !cached.ui.Err) {
				const entry = this.#importMap[__id]

				if (entry.error) {
					cached.ui.Err = Router.#view<NonNullable<EnhancedMatch['ui']['Err']>>(
						entry.error,
					)
				}
			}

			return cached
		}

		const entry = this.#importMap[__id]
		if (!entry) return null

		const enhanced: EnhancedMatch = {
			ui: {
				Shell: null,
				layouts: [],
				Page: null,
				Err: null,
				loaders: [],
			},
			...match,
		}

		if (entry.shell) {
			enhanced.ui.Shell = entry.shell.default as EnhancedMatch['ui']['Shell']
		}

		if (entry.layouts) {
			enhanced.ui.layouts = entry.layouts.map(l =>
				Router.#view<NonNullable<EnhancedMatch['ui']['layouts'][number]>>(l),
			)
		}

		if (entry.page) {
			enhanced.ui.Page = Router.#view<NonNullable<EnhancedMatch['ui']['Page']>>(
				entry.page,
			)
		}

		// don't load an error boundary if we don't have an error.
		// We'll cover this later (above in cached) when/if one
		// is thrown
		if (entry.error && 'error' in match && match.error) {
			enhanced.ui.Err = Router.#view<NonNullable<EnhancedMatch['ui']['Err']>>(entry.error)
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
					const e = Router.#load(l)

					if (e.v && 'metadata' in e.v) {
						const metadata = e.v?.metadata

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
							task: e.p.then(m => {
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

				if (e.v && 'metadata' in e.v) {
					const metadata = e.v.metadata

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
						task: e.p.then(m => {
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

			if (entry.error && error) {
				const e = Router.#load(entry.error)

				if (e.v && 'metadata' in e.v) {
					const metadata = e.v.metadata

					if (metadata) {
						if (typeof metadata === 'function') {
							tasks.push({
								task: Promise.resolve(metadata({ params, error })).catch(err => {
									Router.#logger?.error(`[enhanced.metadata]: ${__id}`, err)
								}),
								priority: PRIORITY[EntryKind.ERROR],
							})
						} else if (typeof metadata === 'object') {
							tasks.push({
								task: Promise.resolve(metadata),
								priority: PRIORITY[EntryKind.ERROR],
							})
						}
					}
				} else {
					tasks.push({
						task: e.p.then(m => {
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
						priority: PRIORITY[EntryKind.ERROR],
					})
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

			if (curr !== undefined) {
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
			for (const l of imports.layouts) loads.push(Router.#load(l).p)
		}

		if (imports.page) loads.push(Router.#load(imports.page).p)
		if (imports.error) loads.push(Router.#load(imports.error).p)
		if (imports.loaders?.length) {
			for (const loader of imports.loaders) {
				if (!loader) continue
				loads.push(Router.#load(loader).p)
			}
		}

		return await Promise.allSettled(loads)
	}

	get manifest() {
		return this.#manifest
	}

	get importMap() {
		return this.#importMap
	}
}
