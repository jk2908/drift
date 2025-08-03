/// <reference types="bun" />

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { RegExpRouter } from 'hono/router/reg-exp-router'
import { trimTrailingSlash, appendTrailingSlash } from 'hono/trailing-slash'

import { manifest } from '.drift/manifest'
import { config } from '.drift/config'

import { ssr } from '@jk2908/drift/render/ssr'

export function handle(
	Shell: ({
		children,
		assets,
		metadata,
	}: {
		children: React.ReactNode
		assets?: React.ReactNode
		metadata?: React.ReactNode
	}) => React.ReactNode,
) {
	return new Hono({
		router: new RegExpRouter(),
	})
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
		.get('/', c => ssr(c, Shell, manifest, config))
		.get('/test/*', c => ssr(c, Shell, manifest, config))
		.get('/about', c => ssr(c, Shell, manifest, config))
		.get('/about/another', c => ssr(c, Shell, manifest, config))
		.get('/p/:id', c => ssr(c, Shell, manifest, config))
		.get('/about/me', c => ssr(c, Shell, manifest, config))
}

export type App = ReturnType<typeof handle>
