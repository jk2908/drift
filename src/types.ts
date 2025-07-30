import type { ConfigEnv } from 'vite'

import type { Context } from 'hono'

import type { EntryKind } from './config'

import type { HTTPException } from './shared/error'
import type { Logger, LogLevel } from './shared/logger'

export type PluginConfig = {
	ctx: ConfigEnv
	precompress?: boolean
	prerender?: 'full' | 'declarative'
	outDir?: string
	metadata?: Metadata
	trailingSlash?: boolean
	logger?: {
		level?: LogLevel
	}
}

export type BuildContext = {
	outDir: string
	bundle: {
		server: {
			entryPath: string | null
			outDir: string | null
		}
		client: {
			entryPath: string | null
			outDir: string | null
		}
	}
	transpiler: InstanceType<typeof Bun.Transpiler>
	logger: InstanceType<typeof Logger>
	prerenders: Set<string>
}

export type Params = Record<string, string | string[]>

type TagValue = string | number | boolean | undefined

export type MetaTag =
	| { charSet: string }
	| { name: string; content: TagValue }
	| { httpEquiv: string; content: TagValue }
	| { property: string; content: TagValue }

export type LinkTag = {
	rel: string
	href?: string
	as?: string
	type?: string
	media?: string
	sizes?: string
	crossOrigin?: 'anonymous' | 'use-credentials'
}

export type Metadata = {
	title?: TagValue
	meta?: MetaTag[]
	link?: LinkTag[]
}

export type PageRoute<P extends Params = Params> = {
	id: string
	Shell: React.ComponentType<{
		children: React.ReactNode
		params?: P
		assets?: React.ReactNode
		metadata?: React.ReactNode
	}>
	layouts: React.LazyExoticComponent<
		React.ComponentType<{
			children: React.ReactNode
			params?: P
			assets?: React.ReactNode
			metadata?: React.ReactNode
		}>
	>[]
	Cmp: React.LazyExoticComponent<React.ComponentType<{ params?: P }>>
	Err: React.LazyExoticComponent<
		React.ComponentType<{
			error: Error | HTTPException
		}>
	> | null
	metadata?: ({ params }: { params?: P }) => Promise<Metadata>
	error?: HTTPException | Error
	prerender: boolean
	dynamic: boolean
	catchAll: boolean
	type: typeof EntryKind.PAGE
}

export type ApiRoute = {
	id: string
	method: string
	handler: (ctx: Context) => Promise<Response> | Response
	type: typeof EntryKind.API
}

// biome-ignore lint/suspicious/noExplicitAny: @todo
export type Route = PageRoute<any> | ApiRoute

export type Routes = {
	[key: string]: Route
}

export type Manifest = {
	[key: string]: Route | Route[]
}

export type Render = ({
	children,
	assets,
	metadata,
}: {
	children: React.ReactNode
	assets: React.ReactNode
	metadata: React.ReactNode
}) => React.ReactNode
