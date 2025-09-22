// auto-generated

/// <reference types="bun" />

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { trimTrailingSlash, appendTrailingSlash } from 'hono/trailing-slash'

import { manifest } from '.drift/manifest'
import { map } from '.drift/map'
import { config } from '.drift/config'

import { ssr } from '@jk2908/drift/render/env/ssr'

import { GET as $E36045888637312226_get } from '../app/posts/+api'
import { POST as $E36045888637312226_post } from '../app/posts/+api'

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
		.get('/', async c => ssr(c, Shell, manifest, map, config))
		.get('/about', async c => ssr(c, Shell, manifest, map, config))
		.get('/about/another', async c => ssr(c, Shell, manifest, map, config))
		.get('/about/me', async c => ssr(c, Shell, manifest, map, config))
		.get('/foo', async c => ssr(c, Shell, manifest, map, config))
		.get('/p/:id', async c => ssr(c, Shell, manifest, map, config))
		.get('/posts', async c => {
			const accept = c.req.header('Accept') ?? ''

			if (accept.includes('text/html')) {
				return ssr(c, Shell, manifest, map, config)
			}

			if (!$E36045888637312226_get) {
				throw new Error('Unified handler missing implementation')
			}

			// handler might be called with no args so
			// ignore to prevent red squigglies
			// @ts-ignore
			return $E36045888637312226_get(c)
		})
		.post('/posts', $E36045888637312226_post)
		.get('/profile', async c => ssr(c, Shell, manifest, map, config))
		.get('/test/*', async c => ssr(c, Shell, manifest, map, config))
		.notFound(c => ssr(c, Shell, manifest, map, config))
}

export type App = ReturnType<typeof handle>
