import type { ConfigEnv } from 'vite'

import type { Context } from 'hono'
import type { HTTPException } from 'hono/http-exception'

import { DRIFT_PAYLOAD_ID, type EntryKind } from './config'

import type { Logger, LogLevel } from './shared/logger'
import type { Router } from './shared/router'

import type { RouteProcessor } from './build/route-processor'

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
	[DRIFT_PAYLOAD_ID]?: {
		removeOnMount?: boolean
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

export type Page = {
	__id: string
	__path: string
	__params: string[]
	__kind: typeof EntryKind.PAGE
	method: 'get'
	paths: {
		shell: string
		layouts?: string[]
		error?: string | null
	}
	error?: HTTPException
	shouldPrerender: boolean
	isDynamic: boolean
	isCatchAll: boolean
}

export type Endpoint = {
	__id: string
	__path: string
	__params: string[]
	__kind: typeof EntryKind.ENDPOINT
	method: Lowercase<HTTPMethod>
}

export type ManifestEntry = Page | Endpoint

export type Manifest = Awaited<
	ReturnType<typeof RouteProcessor.prototype.process>
>['manifest']

export type Match = ReturnType<Router['match']>

export type EnhancedMatch = Match & {
	ui: {
		Shell: React.ComponentType<{
			children?: React.ReactNode
			metadata?: React.ReactNode
			assets?: React.ReactNode
		}> | null
		layouts: React.LazyExoticComponent<
			React.ComponentType<{
				children?: React.ReactNode
				params?: Params
			}>
		>[]
		Page: React.LazyExoticComponent<
			React.ComponentType<{
				children?: React.ReactNode
				params?: Params
			}>
		> | null
		Err: React.LazyExoticComponent<
			React.ComponentType<{
				children?: React.ReactNode
				error?: Error
			}>
		> | null
	}
	endpoint?: (c: Context) => unknown
	metadata?: ({
		params,
		error,
	}: {
		params?: Params
		error?: Error
	}) => Promise<Metadata[]>
}

export type StaticImport = Record<string, unknown>
export type DynamicImport<T = Record<string, unknown>> = () => Promise<T>

export type MapEntry = {
	shell?: StaticImport
	page?: DynamicImport
	layouts?: readonly DynamicImport[]
	error?: DynamicImport
	endpoint?: (c: Context) => unknown
}

export type ImportMap = Record<string, MapEntry>

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
