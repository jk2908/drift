'use client'

import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from 'react'

import type { EnhancedMatch, PluginConfig, Metadata as TMetadata } from '../types'

import { MetadataCollection } from '../shared/metadata'
import type { Router } from '../shared/router'
import { Tree } from '../shared/tree'

type GoConfig = {
	replace?: boolean
	query?: Record<string, string | number | boolean>
}

const DEFAULT_GO_CONFIG = {
	replace: false,
} satisfies GoConfig

export const RouterContext = createContext<{
	match: EnhancedMatch | null
	go: (to: string, config?: GoConfig) => string
	preload: (path: string) => ReturnType<typeof Router.prototype.preload>
	isPending: boolean
}>({
	match: null,
	go: () => '',
	preload: () => Promise.resolve([]),
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
		metadata?: TMetadata
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
	const [metadata, setMetadata] = useState<TMetadata>(initial?.metadata ?? {})

	const [isPending, startTransition] = useTransition()

	const update = useCallback(
		(match: EnhancedMatch | null) => {
			setMatch(match)

			const collection = new MetadataCollection(config.metadata)

			if (!match) {
				setMetadata(collection.base)
			} else {
				match
					.metadata?.({ params: match.params, error: match.error })
					.then(async m => {
						setMetadata(
							await collection
								.add(...m.filter(r => r.status === 'fulfilled').map(r => r.value))
								.run()
								.catch(() => ({})),
						)
					})
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

	/**
	 * Preload a route's assets
	 * @param path - the path to preload
	 * @returns a promise that resolves when all assets are loaded
	 */
	const preload = useCallback(
		(path: string) => router.preload(new URL(path, window.location.origin).pathname),
		[router.preload],
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
			preload,
			isPending,
		}),
		[match, go, preload, isPending],
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
