import type { Hono } from 'hono'

import type { Route } from './types'

declare module 'drift/client' {
	export const client: Hono
  
	export function mount(
		render: ({
			children,
			assets,
			metadata,
		}: {
			children: React.ReactNode
			assets?: React.ReactNode
			metadata?: React.ReactNode
		}) => React.ReactNode,
	): void
}

declare module 'drift/manifest' {
	export const manifest: Record<'page' | 'api', Route>
}

declare module 'drift/runtime' {
	export const assets: React.ReactNode
}

declare module 'drift/server' {
	export function handle(
		render: ({
			children,
			assets,
			metadata,
		}: {
			children: React.ReactNode
			assets?: React.ReactNode
			metadata?: React.ReactNode
		}) => React.ReactNode,
	): Hono

	export type App = ReturnType<typeof handle>
}
