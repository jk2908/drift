'use client'

import { createContext, use, useCallback, useEffect, useMemo, useTransition } from 'react'

import { createFromFetch } from '@vitejs/plugin-rsc/browser'

import { NAME } from '../config'

import type { RscPayload } from '../render/env/rsc'

type GoConfig = {
	replace?: boolean
	query?: Record<string, string | number | boolean>
}

const DEFAULT_GO_CONFIG = {
	replace: false,
} satisfies GoConfig

const preloadCache = new Map<string, Promise<Response>>()

export const RouterContext = createContext<{
	go: (to: string, config?: GoConfig) => string
	preload: (path: string) => void
	isPending: boolean
}>({
	go: () => '',
	preload: () => {},
	isPending: false,
})

export function RouterProvider({ children }: { children: React.ReactNode }) {
	const [isPending, startTransition] = useTransition()

	/**
	 * Navigate to a new route
	 * @param to - the path to navigate to
	 * @param goConfig - configuration for the navigation
	 * @param goConfig.replace - whether to replace the current history entry (default: false)
	 * @returns the new path
	 */
	const go = useCallback((to: string, goConfig?: GoConfig) => {
		const url = new URL(to, window.location.origin)
		const replace = goConfig?.replace ?? DEFAULT_GO_CONFIG.replace
		const path = url.pathname + url.search + url.hash

		startTransition(async () => {
			try {
				const promise =
					preloadCache.get(path) ??
					fetch(path, { headers: { Accept: 'text/x-component' } })

				if (!preloadCache.has(path)) preloadCache.set(path, promise)

				window[`__${NAME}__`]?.setPayload?.(await createFromFetch<RscPayload>(promise))

				if (replace) {
					window.history.replaceState(null, '', path)
				} else {
					window.history.pushState(null, '', path)
				}
			} catch {
				// fail
			} finally {
				preloadCache.delete(path)
			}
		})

		return path
	}, [])

	/**
	 * Preload a route's assets by fetching the RSC payload
	 * @param path - the path to preload
	 * @returns a promise that resolves when the fetch completes
	 */
	const preload = useCallback((path: string) => {
		if (!preloadCache.has(path)) {
			preloadCache.set(path, fetch(path, { headers: { Accept: 'text/x-component' } }))
		}
	}, [])

	useEffect(() => {
		const onPopState = () => {
			startTransition(async () => {
				window[`__${NAME}__`]?.setPayload?.(
					await createFromFetch<RscPayload>(fetch(window.location.href)),
				)
			})
		}

		window.addEventListener('popstate', onPopState)

		return () => {
			window.removeEventListener('popstate', onPopState)
		}
	}, [])

	/*
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
	)*/

	const value = useMemo(
		() => ({
			go,
			preload,
			isPending,
		}),
		[go, preload, isPending],
	)

	return <RouterContext value={value}>{children}</RouterContext>
}

export function useRouter() {
	return use(RouterContext)
}

export function useParams() {
	// @todo
}

export function useSearchParams() {
	// @todo
}
