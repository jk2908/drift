'use client'

import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useSyncExternalStore,
} from 'react'

import { createFromFetch } from '@vitejs/plugin-rsc/browser'

import { DriftEvent } from '../shared/events'

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
	go: (to: string, config?: GoConfig) => Promise<string>
	preload: (path: string) => void
	isNavigating: boolean
}>({
	go: () => Promise.resolve(''),
	preload: () => {},
	isNavigating: false,
})

export function RouterProvider({
	children,
	setPayload,
	isNavigating = false,
}: {
	children: React.ReactNode
	setPayload?: (payload: RSCPayload) => void
	isNavigating?: boolean
}) {
	/**
	 * Navigate to a new route
	 * @param to - the path to navigate to
	 * @param goConfig - configuration for the navigation
	 * @param goConfig.replace - whether to replace the current history entry (default: false)
	 * @returns the new path
	 */
	const go = useCallback(async (to: string, goConfig?: GoConfig) => {
		const url = new URL(to, window.location.origin)
		const replace = goConfig?.replace ?? DEFAULT_GO_CONFIG.replace
		const path = url.pathname + url.search + url.hash

		try {
			const promise =
				preloadCache.get(path) ?? fetch(path, { headers: { accept: 'text/x-component' } })

			if (!preloadCache.has(path)) preloadCache.set(path, promise)

			const res = await createFromFetch<RSCPayload>(promise)

			// this state update is already wrapped in a
			// transition before being passed as props
			setPayload?.(res)

			if (replace) {
				window.history.replaceState(null, '', path)
			} else {
				window.history.pushState(null, '', path)
			}

			window.dispatchEvent(new DriftEvent('navigation', { path }))
		} catch {
			// fail
		} finally {
			preloadCache.delete(path)
		}

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
		const handler = () => go(window.location.href, { replace: true })
		window.addEventListener('popstate', handler)

		return () => {
			window.removeEventListener('popstate', handler)
		}
	}, [])

	const value = useMemo(
		() => ({
			go,
			preload,
			isNavigating,
		}),
		[go, preload, isNavigating],
	)

	return <RouterContext value={value}>{children}</RouterContext>
}

export function useRouter() {
	return use(RouterContext)
}

function onNavigationSubscription(cb: () => void) {
	window.addEventListener('popstate', cb)
	window.addEventListener('driftnavigation', cb)

	return () => {
		window.removeEventListener('popstate', cb)
		window.removeEventListener('driftnavigation', cb)
	}
}

export function useSearchParams() {
	const search = useSyncExternalStore(
		onNavigationSubscription,
		() => window.location.search,
		() => '',
	)

	return useMemo(() => new URLSearchParams(search), [search])
}
