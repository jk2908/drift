import type { Hono } from 'hono'

import type { Manifest } from './types'

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
	export const manifest: Manifest
}

declare module 'drift/runtime' {
	export const runtime: React.ReactNode
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
