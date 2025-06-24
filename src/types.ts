import type { ConfigEnv } from 'vite'
import type { Context } from 'hono'

import type { HTTP_METHODS } from './constants'

export type Config = {
	ctx: ConfigEnv
	precompress?: boolean
	prerender?: 'full' | 'declarative'
	outDir?: string
	metadata?: Metadata
}

export type Params<
	K extends string = string,
	V extends string | number | boolean = string,
> = {
	[key in K]: V
}

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

export type MetadataFn = ({ params }: { params?: Params }) => Promise<Metadata>

export type PageRoute = {
	// biome-ignore lint/suspicious/noExplicitAny: //
	Component: React.LazyExoticComponent<React.ComponentType<{ params?: any }>>
	layouts: React.ComponentType<{ children: React.ReactNode; params: Params }>[]
	metadata?: MetadataFn
	prerender: boolean
	dynamic: boolean
	type: 'page'
}

export type ApiRoute = {
	method: string
	handler: (ctx: Context) => Promise<Response> | Response
	type: 'api'
}

export type Route = PageRoute | ApiRoute

export type Routes = {
	[key: string]: Route
}

export type Manifest = {
	[key: string]: Route | Route[]
}

export type HttpMethod = (typeof HTTP_METHODS)[number]
