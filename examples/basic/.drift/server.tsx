/// <reference types="bun" />

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { appendTrailingSlash, trimTrailingSlash } from 'hono/trailing-slash'

import { config } from '.drift/config'
import { manifest } from '.drift/manifest'
import { ssr } from '@jk2908/drift/server/ssr'

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
) {
	return new Hono()
		.use(
			'/assets/*',
			serveStatic({
				root: config.outDir,
				onFound(_path, c) {
					c.header('Cache-Control', 'public, immutable, max-age=31536000')
				},
				precompressed: config.precompress,
			}),
		)
		.use(!config.trailingSlash ? trimTrailingSlash() : appendTrailingSlash())
		.get('/', c => ssr(c, render, manifest, config))
		.get('/test/*', c => ssr(c, render, manifest, config))
		.get('/about', c => ssr(c, render, manifest, config))
		.get('/about/another', c => ssr(c, render, manifest, config))
		.get('/p/:id', c => ssr(c, render, manifest, config))
		.get('/about/me', c => ssr(c, render, manifest, config))
}

export type App = ReturnType<typeof handle>
