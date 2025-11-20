// auto-generated

/// <reference types="bun" />

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { trimTrailingSlash, appendTrailingSlash } from 'hono/trailing-slash'

import { handler as rsc } from './entry.rsc'
import { config } from './config'

import { GET as $E36045888637312226_get } from '../app/posts/+api'
import { POST as $E36045888637312226_post } from '../app/posts/+api'

export function handle() {
	return new Hono()
		.use(!config.trailingSlash ? trimTrailingSlash() : appendTrailingSlash())
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
		.get('/', async c => rsc(c.req.raw))
		.get('/posts', async c => {
			const accept = c.req.header('Accept') ?? ''

			if (accept.includes('text/html')) {
				return rsc(c.req.raw)
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
		.get('/test/*', async c => rsc(c.req.raw))
		.get('/about', async c => rsc(c.req.raw))
		.get('/about/me', async c => rsc(c.req.raw))
		.get('/about/another', async c => rsc(c.req.raw))
		.get('/profile', async c => rsc(c.req.raw))
		.get('/foo', async c => rsc(c.req.raw))
		.get('/p/:id', async c => rsc(c.req.raw))
		.notFound(c => rsc(c.req.raw))
}

export type App = ReturnType<typeof handle>
