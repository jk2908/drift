/// <reference types="bun" />

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { trimTrailingSlash, appendTrailingSlash } from 'hono/trailing-slash'

import { manifest } from '.drift/manifest'
import { config } from '.drift/config'

import { ssr } from '@jk2908/drift/render/ssr'

import { GET as $AK7lKN8reGt } from '../app/posts/+api'
import { POST as $AWyqilYZGpp } from '../app/posts/+api'

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
		.get('/', c => ssr(c, Shell, manifest, config))
		.get('/foo', c => ssr(c, Shell, manifest, config))
		.get('/posts', async c => {
			const accept = c.req.header('Accept') ?? ''

			if (accept.includes('text/html')) {
				return ssr(c, Shell, manifest, config)
			}

			// handler might be called with no args so
			// ignore to prevent red squigglies
			// @ts-ignore
			return $AK7lKN8reGt(c)
		})
		.post('/posts', $AWyqilYZGpp)
		.get('/test/*', c => ssr(c, Shell, manifest, config))
		.get('/about', c => ssr(c, Shell, manifest, config))
		.get('/about/another', c => ssr(c, Shell, manifest, config))
		.get('/about/me', c => ssr(c, Shell, manifest, config))
		.get('/p/:id', c => ssr(c, Shell, manifest, config))
}

export type App = ReturnType<typeof handle>
