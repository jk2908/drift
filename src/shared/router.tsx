import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from 'react'

import { RegExpRouter } from 'hono/router/reg-exp-router'

import type { Manifest, Metadata, PageRoute, Params, PluginConfig } from '../types'

import { EntryKind, HYDRATE_ID } from '../config'

import { merge } from '../shared/metadata'
import { Tree } from '../shared/tree'

import { HTTPException } from './error'

export type Match = ReturnType<Router['match']>

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
	#manifest: Manifest = {}
	#router: RegExpRouter<PageRoute> = new RegExpRouter()

	constructor(manifest: Manifest) {
		this.#manifest = manifest

		for (const path in this.#manifest) {
			const entry = this.#manifest[path]

			if (Array.isArray(entry) || entry.type !== EntryKind.PAGE) continue

			this.#router.add('GET', path, entry)
		}
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
					if (entry.catchAll) {
						// for a catch-all, we use the __path property on the matched entry.
						// Neccessary because Hono doesn't expose wildcard params so we need
						// to grab them from here. Derive the value by removing the
						// static part of the pattern from the full path that was
						// matched by the router
						const staticPart = entry.__path.substring(0, entry.__path.indexOf('*'))
						const value = paramStash[0].substring(staticPart.length)
						params[entry.__params[0]] = value.split('/')
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
		const entry = this.#getNearestErrorBoundary(path)

		if (entry) {
			return {
				...entry,
				params: {},
				error: new HTTPException(404, 'Not found'),
			}
		}

		return null
	}

	#getNearestErrorBoundary(route: string) {
		const parts = route.split('/').filter(Boolean)

		for (let i = parts.length; i >= 0; i--) {
			const testPath = i === 0 ? '/' : `/${parts.slice(0, i).join('/')}`
			const entry = this.#manifest[testPath]

			if (!entry || Array.isArray(entry) || entry.type !== EntryKind.PAGE) continue

			return entry
		}

		return null
	}

	get manifest() {
		return this.#manifest
	}
}

const DEFAULT_GO_CONFIG = {
	replace: false,
} satisfies GoConfig

export const RouterContext = createContext<{
	match: Match | null
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
	children,
}: {
	router: Router
	initial: {
		match: Match | null
		metadata?: Metadata
	}
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
	const [match, setMatch] = useState<Match | null>(initial?.match ?? null)
	const [metadata, setMetadata] = useState<Metadata>(initial?.metadata ?? {})

	const config = useRef<Partial<PluginConfig>>({})

	const [isPending, startTransition] = useTransition()

	const update = useCallback((match: Match | null) => {
		setMatch(match)

		if (!match) {
			setMetadata(merge(config.current?.metadata ?? {}, {}))
		} else {
			match
				.metadata?.({ params: match.params })
				.then(m => setMetadata(merge(config.current?.metadata ?? {}, m)))
				.catch(() => setMetadata({}))
		}
	}, [])

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
				update(router.match(path))

				if (replace) {
					window.history.replaceState(null, '', path)
				} else {
					window.history.pushState(null, '', path)
				}
			})

			return path
		},
		[router.match, update],
	)

	useEffect(() => {
		const onPopState = () => {
			startTransition(() => {
				update(router.match(window.location.pathname))
			})
		}

		window.addEventListener('popstate', onPopState)

		return () => {
			window.removeEventListener('popstate', onPopState)
		}
	}, [router.match, update])

	useEffect(() => {
		const el = document.getElementById(HYDRATE_ID)

		if (!el || !el.textContent) return

		config.current = JSON.parse(el.textContent)?.config ?? {}
		el.remove()
	}, [])

	// @todo: fix error boundary handling and error types
	const el = useMemo(() => <Tree match={match} />, [match])

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

			<ScrollRestoration />
		</RouterContext>
	)
}

export function useRouter() {
	return use(RouterContext)
}

export function ScrollRestoration({
	behavior = 'smooth',
}: {
	behavior?: ScrollToOptions['behavior']
}) {
	const { match } = useRouter()

	useEffect(() => {
		match &&
			window.scrollTo({
				top: 0,
				left: 0,
				behavior,
			})
	}, [match, behavior])

	return null
}
