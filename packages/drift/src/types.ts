import type { Context } from 'hono'

import type { EntryKind } from './config'

import type { HTTPException } from './shared/error'
import type { Logger, LogLevel } from './shared/logger'
import type { PRIORITY } from './shared/metadata'
import type { Router } from './shared/router'

import type { RouteProcessor } from './build/route-processor'

export type PluginConfig = {
	app?: {
		url?: `http://${string}` | `https://${string}`
	}
	precompress?: boolean
	prerender?: 'full' | 'declarative'
	outDir?: string
	metadata?: Metadata
	trailingSlash?: boolean
	readonly logger?: {
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
	prerenderableRoutes: Set<string>
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

export type Segment = {
	__id: string
	__path: string
	__params: string[]
	__kind: typeof EntryKind.PAGE
	__depth: number
	method: 'get'
	paths: {
		layouts: (string | null)[]
		errors?: (string | null)[]
		loaders: (string | null)[]
		page?: string | null
	}
	error?: HTTPException | Error
	prerender: boolean
	dynamic: boolean
	catch_all: boolean
}

export type Endpoint = {
	__id: string
	__path: string
	__params: string[]
	__kind: typeof EntryKind.ENDPOINT
	method: Lowercase<HTTPMethod>
}

export type ManifestEntry = Segment | Endpoint

export type Manifest = Awaited<
	ReturnType<typeof RouteProcessor.prototype.process>
>['manifest']

export type Match = ReturnType<Router['match']>

export type View<TProps> =
	| React.ComponentType<TProps>
	| React.LazyExoticComponent<React.ComponentType<TProps>>

export type EnhancedMatch = Match & {
	ui: {
		layouts: (View<{
			children?: React.ReactNode
			params?: Params
		}> | null)[]
		Page: View<{
			children?: React.ReactNode
			params?: Params
		}> | null
		errors: (View<{
			children?: React.ReactNode
			error?: HTTPException | Error
		}> | null)[]
		loaders: (View<{
			children?: React.ReactNode
		}> | null)[]
	}
	endpoint?: (c: Context) => unknown
	metadata?: ({ params, error }: { params?: Params; error?: Error }) => Promise<
		PromiseSettledResult<{
			task: Promise<Metadata>
			priority: (typeof PRIORITY)[keyof typeof PRIORITY]
		}>[]
	>
}

export type StaticImport = Record<string, unknown>
export type DynamicImport<T = Record<string, unknown>> = () => Promise<T>

export type MapEntry = {
	shell?: StaticImport
	page?: DynamicImport
	layouts?: readonly (DynamicImport | null)[]
	errors?: readonly (DynamicImport | null)[]
	loaders?: readonly (DynamicImport | null)[]
	endpoint?: (c?: Context) => unknown
}

export type ImportMap = Record<string, MapEntry>

export type PathMap = {
	layouts: Record<string, StaticImport | DynamicImport>
	pages: Record<string, DynamicImport>
	errors: Record<string, DynamicImport>
	loaders: Record<string, DynamicImport>
	endpoints: Partial<
		Record<
			Lowercase<HTTPMethod>,
			Record<string, (c?: Context) => Response | Promise<Response>>
		>
	>
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type Primitive = string | number | boolean | bigint | symbol | null | undefined

export type LooseNumber<T extends number> = T | (number & {})
