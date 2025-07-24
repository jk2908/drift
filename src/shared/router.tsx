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

import type { Manifest, Metadata, Params, PluginConfig } from '../types'

import { EntryKind, HYDRATE_ID } from '../config'

import { merge } from '../shared/metadata'
import { Tree } from '../shared/tree'

import { HTTPException } from './error'

export type Match = ReturnType<Router['match']>

type Pattern = {
	parts: (string | null)[]
	indices: number[]
	names: string[]
	signature: string
	specificity: number
}

type GoConfig = {
	replace?: boolean
	query?: Record<string, string | number | boolean>
}

const markers = {
	STATIC: 'S',
	DYNAMIC: 'D',
	CATCH_ALL: 'C',
} as const

/**
 * Handle routing and matching of within the application
 * @param manifest - contains all the routes (pages and api) and their metadata
 * @see {@link Manifest} for the structure of the manifest
 */
export class Router {
	#manifest: Manifest = {}
	#patterns = new Map<string, Pattern>()
	#lengths = new Map<number, string[]>()

	constructor(manifest: Manifest) {
		this.#manifest = manifest

		for (const [route, entry] of Object.entries(this.#manifest)) {
			// @note: an api entry can be singular or an array of
			// multiple HTTP methods. Either way, don't parse it
			if (Array.isArray(entry) || entry.type === EntryKind.API) continue

			this.parse(route)
		}

		for (const [length, routes] of this.#lengths.entries()) {
			const sorted = routes.sort((a, b) => {
				const patternA = this.#patterns.get(a)
				const patternB = this.#patterns.get(b)

				return (patternB?.specificity ?? 0) - (patternA?.specificity ?? 0)
			})

			this.#lengths.set(length, sorted)
		}
	}

	/**
	 * Parse a route and register it in the router
	 * @param route - the path to parse
	 */
	parse(route: string) {
		if (this.#patterns.has(route)) return

		const parts = route.split('/')
		const pattern: Pattern = {
			parts: [],
			indices: [],
			names: [],
			signature: '',
			specificity: 0,
		}

		let signature = ''

		for (let i = 0; i < parts.length; i++) {
			const segment = parts[i]

			if (segment.startsWith(':')) {
				pattern.indices.push(i)

				if (segment.endsWith('*')) {
					pattern.names.push(segment.slice(1, -1))
					pattern.parts.push(null)
					signature += markers.CATCH_ALL
				} else {
					pattern.names.push(segment.slice(1))
					pattern.parts.push(null)
					signature += markers.DYNAMIC
				}
			} else {
				pattern.parts.push(segment)
				signature += markers.STATIC
				pattern.specificity++
			}
		}

		pattern.signature = signature

		this.#patterns.set(route, pattern)
		const routes = this.#lengths.get(parts.length) || []
		this.#lengths.set(parts.length, routes)

		routes.push(route)
	}

	/**
	 * Match a route against the registered routes
	 * @param route - the path to match against the routes
	 * @returns the matched route (component, params, metadata) or null if no match is found
	 */
	match(route: string) {
		const entry = this.#manifest?.[route]

		if (Array.isArray(entry) || entry?.type === EntryKind.API) return null

		if (entry?.type === EntryKind.PAGE) {
			return {
				...entry,
				params: {},
			}
		}

		// no route found, this might be a dynamic route
		const pathParts = route.split('/')

		const candidateLengths = [...this.#lengths.keys()].filter(
			length => length <= pathParts.length,
		)

		if (!candidateLengths.length) return null

		for (const patternLength of candidateLengths) {
			const candidates = this.#lengths.get(patternLength) || []

			for (const routePattern of candidates) {
				const pattern = this.#patterns.get(routePattern)
				if (!pattern) continue

				const hasCatchAll = pattern.signature.includes(markers.CATCH_ALL)
				if (!hasCatchAll && pattern.parts.length !== pathParts.length) continue

				let isMatch = true
				const params: Params = {}

				for (let i = 0; i < pattern.parts.length; i++) {
					const patternPart = pattern.parts[i]
					const pathPart = pathParts[i]

					if (patternPart !== null) {
						// static segment - must match exactly
						if (patternPart !== pathPart) {
							isMatch = false
							break
						}
					} else {
						// dynamic segment - extract parameter
						const paramIdx = pattern.indices.indexOf(i)
						if (paramIdx === -1) continue

						const paramName = pattern.names[paramIdx]
						const signatureChar = pattern.signature[i]

						if (signatureChar === markers.CATCH_ALL) {
							// catch-all parameter - collect remaining segments
							params[paramName] = pathParts.slice(i)
							break // catch-all consumes rest of path
						} else {
							// regular dynamic parameter
							params[paramName] = pathPart
						}
					}
				}

				if (isMatch) {
					const entry = this.#manifest?.[routePattern]
					if (!entry || Array.isArray(entry) || entry.type === EntryKind.API) continue

					return {
						...entry,
						params,
					}
				}
			}
		}

		// no match found, try find closest route
		const closest = this.#getClosestParent(route)

		if (closest) {
			return {
				...closest,
				params: {},
				error: new HTTPException(404, 'Not Found'),
			}
		}

		return null
	}

	#getClosestParent(route: string) {
		const parts = route.split('/').filter(Boolean)

		for (let i = parts.length; i >= 0; i--) {
			const testPath = i === 0 ? '/' : `/${parts.slice(0, i).join('/')}`
			const entry = this.#manifest[testPath]

			if (!entry || Array.isArray(entry) || entry.type !== EntryKind.PAGE) continue

			return entry
		}

		return null
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
