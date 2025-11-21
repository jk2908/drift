'use client'

import { createContext, use, useCallback, useEffect, useMemo, useTransition } from 'react'

import { createFromFetch } from '@vitejs/plugin-rsc/browser'

import { NAME } from '../config'

import type { RSCPayload } from '../render/env/rsc'

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
					fetch(path, { headers: { accept: 'text/x-component' } })

				if (!preloadCache.has(path)) preloadCache.set(path, promise)

				const res = await createFromFetch<RSCPayload>(promise)
				window[`__${NAME.toUpperCase()}__`]?.setPayload?.(res)

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
		if (preloadCache.has(path)) return

		preloadCache.set(path, fetch(path, { headers: { Accept: 'text/x-component' } }))
	}, [])

	useEffect(() => {
		const onPopState = () => {
			startTransition(async () => {
				window[`__${NAME}__`]?.setPayload?.(
					await createFromFetch<RSCPayload>(fetch(window.location.href)),
				)
			})
		}

		window.addEventListener('popstate', onPopState)

		return () => {
			window.removeEventListener('popstate', onPopState)
		}
	}, [])

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
