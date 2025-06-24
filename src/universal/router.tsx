import {
	createContext,
	useState,
	use,
	useEffect,
	useCallback,
	useTransition,
	useMemo,
	useRef,
} from 'react'

import { manifest } from 'drift/manifest'

import type { Config, Metadata, Manifest, PageRoute, Params } from '../types'
import { HYDRATE_ID } from '../constants'
import { ErrorBoundary } from './error-boundary'
import type { $ErrorOptions } from './error'
import { merge } from './metadata'
import { Tree } from './tree'

type Match = PageRoute & {
	params: Params
}

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

const STATIC = 'S'
const DYNAMIC = 'D'

export class Router {
	manifest: Manifest = {}

	#patterns = new Map<string, Pattern>()
	#lengths = new Map<number, string[]>()

	#fallback: {
		Component: React.ComponentType<{ error?: $ErrorOptions; reset?: () => void }>
		metadata: ({ error }: { error?: $ErrorOptions }) => Promise<Metadata>
	} = {
		Component: ({ error }: { error?: $ErrorOptions }) => <div>{error?.message}</div>,
		async metadata({ error }: { error?: $ErrorOptions }) {
			return {
				title: error?.message ?? 'UnknownError',
				meta: [
					{
						name: 'description',
						content: error?.message ?? 'An unknown error occurred',
					},
				],
			}
		},
	}

	constructor() {
		this.manifest = manifest

		for (const [route, entry] of Object.entries(this.manifest)) {
			// @note: an api entry can be singular or an array of
			// multiple HTTP methods. Either way, don't parse it
			if (Array.isArray(entry) || entry.type === 'api') continue

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

		this.#preload()
	}

	// do async setup? Preload the fallback component
	#preload() {
		const mods = import.meta.glob('#/app/error.{tsx,jsx,ts,js}', {
			eager: true,
		})

		if (Object.keys(mods).length > 1) {
			throw new Error(
				'framework:router:preload: Please ensure there is only one error component in your app dir',
			)
		}

		const mod = Object.values(mods)[0] as
			| {
					default?: React.ComponentType<{ error?: $ErrorOptions }>
					metadata?:
						| Metadata
						| (({ error }: { error?: $ErrorOptions }) => Promise<Metadata>)
			  }
			| undefined

		if (mod?.metadata) {
			if (typeof mod.metadata === 'function') {
				this.#fallback.metadata = mod.metadata
			} else if (typeof mod.metadata === 'object') {
				this.#fallback.metadata = async () => mod.metadata as Metadata
			}
		}

		if (typeof mod?.default === 'function') {
			this.#fallback.Component = mod.default
		}
	}

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
				pattern.names.push(segment.slice(1))
				pattern.parts.push(null)
				signature += DYNAMIC
			} else {
				pattern.parts.push(segment)
				signature += STATIC
				pattern.specificity++
			}
		}

		pattern.signature = signature

		this.#patterns.set(route, pattern)
		const routes = this.#lengths.get(parts.length) || []
		this.#lengths.set(parts.length, routes)

		routes.push(route)
	}

	#isSignatureCompatible(sig1: string, sig2: string) {
		if (sig1.length !== sig2.length) return false

		for (let i = 0; i < sig2.length; i++) {
			if (sig1[i] !== STATIC && sig2[i] === STATIC) {
				return false
			}
		}

		return true
	}

	match(route: string) {
		const entry = this.manifest[route]

		if (Array.isArray(entry) || entry?.type === 'api') return null

		if (entry?.type === 'page') {
			return {
				...entry,
				params: {},
			} satisfies Match
		}

		const pathParts = route.split('/')
		const candidates = this.#lengths.get(pathParts.length)

		if (!candidates) return null

		const signature = STATIC.repeat(pathParts.length)

		for (const route of candidates) {
			const pattern = this.#patterns.get(route)

			if (!pattern) continue

			if (!this.#isSignatureCompatible(signature, pattern.signature)) continue

			let isMatch = true

			for (let i = 0; i < pattern.parts.length; i++) {
				if (pattern.parts[i] !== null && pattern.parts[i] !== pathParts[i]) {
					isMatch = false
					break
				}
			}

			if (isMatch) {
				const params: Params = {}

				for (let i = 0; i < pattern.indices.length; i++) {
					const paramIdx = pattern.indices[i]
					params[pattern.names[i]] = pathParts[paramIdx]
				}

				const entry = this.manifest[route]
				if (!entry || Array.isArray(entry) || entry.type === 'api') continue

				return {
					...entry,
					params,
				} satisfies Match
			}
		}

		return null
	}

	get fallback() {
		return this.#fallback
	}
}

export const router = new Router()

const $error404 = {
	name: 'NotFoundError',
	message: 'Resource not found',
	status: 404,
} satisfies $ErrorOptions

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
		  }: { el: React.ReactNode; metadata: React.ReactNode }) => React.ReactNode)
}) {
	const fallback = useMemo(() => router.fallback, [router])

	const [match, setMatch] = useState<Match | null>(initial?.match ?? null)
	const [metadata, setMetadata] = useState<Metadata>(initial?.metadata ?? {})

	const config = useRef<Partial<Config>>({})

	const [isPending, startTransition] = useTransition()

	const update = useCallback(
		(match: Match | null) => {
			setMatch(match)

			if (!match) {
				fallback
					.metadata({ error: $error404 })
					.then(m => setMetadata(merge(config.current?.metadata ?? {}, m)))
					.catch(() => setMetadata({}))
			} else {
				match
					.metadata?.({ params: match.params })
					.then(m => setMetadata(merge(config.current?.metadata ?? {}, m)))
					.catch(() => setMetadata({}))
			}
		},
		[fallback],
	)

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

	// @TODO: fix error boundary handling and error types
	const el = useMemo(
		() =>
			!match ? (
				<fallback.Component error={$error404} />
			) : (
				<ErrorBoundary
					fallback={(err, reset) => <fallback.Component error={err} reset={reset} />}>
					<Tree leaves={[...(match.layouts ?? []), (props: { params: Record<string, string>; children: React.ReactNode }) => <match.Component {...props} />]} params={match.params} />
				</ErrorBoundary>
			),
		[match, fallback],
	)

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
}: { behavior?: ScrollToOptions['behavior'] }) {
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
