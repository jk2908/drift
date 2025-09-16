import {
	createContext,
	lazy,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from 'react'

import { RegExpRouter } from 'hono/router/reg-exp-router'
import { SmartRouter } from 'hono/router/smart-router'
import { TrieRouter } from 'hono/router/trie-router'

import type {
	DynamicImport,
	Endpoint,
	EnhancedMatch,
	ImportMap,
	Manifest,
	ManifestEntry,
	Match,
	Metadata,
	Page,
	Params,
	PluginConfig,
} from '../types'

import { EntryKind } from '../config'

import { mergeMetadata } from '../shared/metadata'
import { Tree } from '../shared/tree'

import { HTTPException } from './error'

type GoConfig = {
	replace?: boolean
	query?: Record<string, string | number | boolean>
}

/**
 * Handle routing and matching of within the application
 * @param manifest - contains all the routes (pages and api) and their metadata
 * @see {@link Manifest} for the structure of the manifest
 */
export class Router {
	static #enh = new Map<string, EnhancedMatch>()

	static #mods = new WeakMap<
		DynamicImport,
		{
			p: Promise<Record<string, unknown>>
			v?: Record<string, unknown>
			L?: React.LazyExoticComponent<React.ComponentType<any>>
		}
	>()

	#manifest: Manifest = {}
	#map: ImportMap = {}

	// @see: https://hono.dev/docs/concepts/routers
	#router: SmartRouter<Page> = new SmartRouter({
		routers: [new RegExpRouter(), new TrieRouter()],
	})

	constructor(manifest: Manifest, map: ImportMap) {
		this.#manifest = manifest
		this.#map = map

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

	static #load(loader: DynamicImport) {
		let e = Router.#mods.get(loader)
		if (e) return e

		const p = loader()
			.then(mod => {
				const entry = Router.#mods.get(loader)
				if (entry) entry.v = mod
				return mod
			})
			.catch(err => {
				Router.#mods.delete(loader)
				throw err
			})

		e = { p }
		Router.#mods.set(loader, e)

		return e
	}

	static #lazy<T extends React.ComponentType<any>>(loader: DynamicImport) {
		const e = Router.#load(loader)
		if (e.L) return e.L as React.LazyExoticComponent<T>

		const L = lazy(async () => {
			const mod = e.v ?? (await e.p)
			return { default: mod.default as T }
		})

		e.L = L
		return L as React.LazyExoticComponent<T>
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
		const entry = this.closest(path, 'error')

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

		if (Router.#enh.has(__id)) {
			return Router.#enh.get(__id) || null
		}

		const entry = this.#map[__id]
		if (!entry) return null

		const enhanced: EnhancedMatch = {
			ui: {
				Shell: null,
				layouts: [],
				Page: null,
				Err: null,
			},
			...match,
		}

		if (entry.shell) {
			enhanced.ui.Shell = entry.shell.default as EnhancedMatch['ui']['Shell']
		}

		if (entry.layouts) {
			enhanced.ui.layouts = entry.layouts.map(l =>
				Router.#lazy<NonNullable<EnhancedMatch['ui']['layouts'][number]>>(l),
			)
		}

		if (entry.page) {
			enhanced.ui.Page = Router.#lazy<NonNullable<EnhancedMatch['ui']['Page']>>(
				entry.page,
			)
		}

		if (entry.error) {
			enhanced.ui.Err = Router.#lazy<NonNullable<EnhancedMatch['ui']['Err']>>(entry.error)
		}

		if (entry.endpoint) enhanced.endpoint = entry.endpoint

		Router.#enh.set(__id, enhanced)

		return enhanced
	}

	/**
	 * Find the closest ancestor entry for a given path and property
	 * @param path - the path to start searching from
	 * @param property - the property to match against
	 * @returns the closest ancestor entry or null
	 */
	closest(path: string, property: keyof Page) {
		const parts = path.split('/').filter(Boolean)

		for (let i = parts.length; i >= 0; i--) {
			const testPath = i === 0 ? '/' : `/${parts.slice(0, i).join('/')}`
			const entry = this.#manifest[testPath]

			if (!entry) continue

			const pageEntry = Router.narrow(entry)

			if (pageEntry && property in pageEntry && pageEntry[property] !== undefined) {
				return pageEntry
			}
		}

		return null
	}

	async preload(path: string) {
		const match = this.match(path)
		if (!match) return

		const imports = this.#map[match.__id]
		if (!imports) return

		const tasks: Promise<unknown>[] = []

		if (imports.layouts?.length) {
			for (const loader of imports.layouts) {
				tasks.push(Router.#load(loader).p)
			}
		}

		if (imports.page) tasks.push(Router.#load(imports.page).p)
		if (imports.error) tasks.push(Router.#load(imports.error).p)

		return Promise.allSettled(tasks)
	}

	get manifest() {
		return this.#manifest
	}

	get map() {
		return this.#map
	}
}

const DEFAULT_GO_CONFIG = {
	replace: false,
} satisfies GoConfig

export const RouterContext = createContext<{
	match: EnhancedMatch | null
	go: (to: string, config?: GoConfig) => string
	isPending: boolean
}>({
	match: null,
	go: () => '',
	isPending: false,
})

export function RouterProvider({
	router,
	initial,
	config,
	children,
}: {
	router: Router
	initial: {
		match: EnhancedMatch | null
		metadata?: Metadata
	}
	config: Readonly<Partial<PluginConfig>>
	children:
		| React.ReactNode
		| (({
				el,
				metadata,
		  }: {
				el: React.ReactNode
				metadata: React.ReactNode
		  }) => React.ReactNode)
}) {
	const [match, setMatch] = useState<EnhancedMatch | null>(initial?.match ?? null)
	const [metadata, setMetadata] = useState<Metadata>(initial?.metadata ?? {})

	const [isPending, startTransition] = useTransition()

	const update = useCallback(
		(match: EnhancedMatch | null) => {
			setMatch(match)

			if (!match) {
				setMetadata(mergeMetadata(config.metadata ?? {}, {}))
			} else {
				match
					.metadata?.({ params: match.params })
					.then(([m]) => setMetadata(mergeMetadata(config?.metadata ?? {}, m)))
					.catch(() => setMetadata({}))
			}
		},
		[config],
	)

	/**
	 * Navigate to a new route
	 * @param to - the path to navigate to
	 * @param goConfig - configuration for the navigation
	 * @param goConfig.replace - whether to replace the current history entry (default: false)
	 * @returns the new path
	 */
	const go = useCallback(
		(to: string, goConfig?: GoConfig) => {
			const url = new URL(to, window.location.origin)
			const replace = goConfig?.replace ?? DEFAULT_GO_CONFIG.replace

			const path = url.pathname + url.search + url.hash

			startTransition(() => {
				update(router.enhance(router.match(path)))

				if (replace) {
					window.history.replaceState(null, '', path)
				} else {
					window.history.pushState(null, '', path)
				}
			})

			return path
		},
		[router.match, router.enhance, update],
	)

	useEffect(() => {
		const onPopState = () => {
			startTransition(() => {
				update(router.enhance(router.match(window.location.pathname)))
			})
		}

		window.addEventListener('popstate', onPopState)

		return () => {
			window.removeEventListener('popstate', onPopState)
		}
	}, [router.match, router.enhance, update])

	const el = useMemo(() => (match ? <Tree match={match} /> : null), [match])

	const tags = useMemo(
		() => (
			<>
				{metadata.title && <title>{metadata.title.toString()}</title>}

				{metadata.meta?.map(meta => {
					if ('charSet' in meta) {
						return <meta key={meta.charSet} charSet={meta.charSet} />
					}

					if ('name' in meta) {
						return (
							<meta key={meta.name} name={meta.name} content={meta.content?.toString()} />
						)
					}

					if ('httpEquiv' in meta) {
						return (
							<meta
								key={meta.httpEquiv}
								httpEquiv={meta.httpEquiv}
								content={meta.content?.toString()}
							/>
						)
					}

					if ('property' in meta) {
						return (
							<meta
								key={meta.property}
								property={meta.property}
								content={meta.content?.toString()}
							/>
						)
					}

					return null
				})}

				{metadata.link?.map(link => (
					<link key={`${link.rel}${link.href ?? ''}`} {...link} />
				))}
			</>
		),
		[metadata],
	)

	const value = useMemo(
		() => ({
			match,
			go,
			isPending,
		}),
		[match, go, isPending],
	)

	return (
		<RouterContext value={value}>
			{typeof children === 'function' ? children({ el, metadata: tags }) : children}
		</RouterContext>
	)
}

export function useRouter() {
	return use(RouterContext)
}

export function useParams() {
	return useRouter().match?.params ?? {}
}

export function useSearchParams() {
	// @todo
}
