import path from 'node:path'

import { renderToReadableStream } from 'react-dom/server.browser'

import type { Context as HonoContext } from 'hono'

import * as devalue from 'devalue'
import { isbot } from 'isbot'

import type { ImportMap, Manifest, PluginConfig } from '../../types'

import { EntryKind, NAME } from '../../config'

import { HTTPException, NOT_FOUND } from '../../shared/error'
import { Logger } from '../../shared/logger'
import { PRIORITY as METADATA_PRIORITY, MetadataCollection } from '../../shared/metadata'
import { Redirect } from '../../shared/redirect'
import { Router } from '../../shared/router'
import { getRelativeBasePath } from '../../shared/utils'

import { RouterProvider } from '../../client/router'

import * as fallback from '../../ui/+error'

import { createAssets } from '../utils'

/**
 * Server-side rendering handler to bridge incoming Hono requests with React
 * @param c - the Hono context
 * @param Shell - the app root (shell) component to render
 * @param manifest - the application manifest containing routes and metadata
 * @param config - the plugin configuration
 * @returns a Hono streaming response
 */
/*
export async function ssr(
	c: HonoContext,
	Shell: ({
		children,
		assets,
		metadata,
	}: {
		children: React.ReactNode
		assets: React.ReactNode
		metadata: React.ReactNode
	}) => React.ReactNode,
	manifest: Manifest,
	map: ImportMap,
	config: PluginConfig,
) {
	const logger = new Logger(config.logger?.level)
	const router = new Router(manifest, map, logger)

	const relativeBase = getRelativeBasePath(c.req.path)

	let controller: AbortController | null = new AbortController()
	let caughtError = null

	if (c.req.path.startsWith('/.well-known/appspecific/com.chrome.devtools.json')) {
		return c.body(null, 204)
	}

	try {
		const match = router.enhance(router.match(c.req.path))

		// early return of static html if route is prerendered
		if (match?.shouldPrerender && !import.meta.env.DEV && !Bun.env.PRERENDER) {
			const canonical = match?.__path ?? c.req?.path ?? '/'
			const rel = canonical.startsWith('/') ? canonical.slice(1) : canonical

			let outPath: string

			if (!rel) {
				outPath = path.join(import.meta.dir, 'index.html')
			} else {
				outPath = /[^/]+\.[^/]+$/.test(rel)
					? path.join(import.meta.dir, rel)
					: path.join(import.meta.dir, rel, 'index.html')
			}

			// read if exists, else continue to ssr
			try {
				const f = Bun.file(outPath)

				if (await f.exists()) {
					return c.html(await f.text(), {
						headers: {
							'X-Drift-Renderer': 'prerender',
						},
					})
				}
			} catch {}
		}

		const collection = new MetadataCollection(config.metadata)

		const metadata = match
			? await match
					.metadata?.({ params: match.params, error: match.error })
					.then(m =>
						collection
							.add(...m.filter(r => r.status !== 'rejected').map(r => r.value))
							.run(),
					)
			: await collection
					.add({
						task: fallback.metadata({ error: NOT_FOUND }),
						priority: METADATA_PRIORITY[EntryKind.ERROR],
					})
					.run()

		const payload = devalue.stringify(
			{
				entry: {
					__path: match?.__path,
					params: match?.params,
					error: match?.error,
				},
				metadata,
			},
			payloadReducer,
		)

		const assets = createAssets(relativeBase, payload)
		const initial = { match, metadata }

		const stream = await renderToReadableStream(
			<RouterProvider router={router} initial={initial} config={config}>
				{({ el, metadata }) => (
					<Shell assets={assets} metadata={metadata}>
						{el ?? <fallback.default error={NOT_FOUND} />}
					</Shell>
				)}
			</RouterProvider>,
			{
				signal: controller?.signal,
				onError: (err: unknown) => {
					logger.error(Logger.print(err), err)
					caughtError = err
				},
			},
		)

		if (caughtError) throw caughtError
		if (isbot(c.req.header('User-Agent'))) await stream.allReady

		const status = Router.getMatchStatusCode(match)

		return c.body(stream, {
			status,
			headers: {
				'Content-Type': 'text/html',
				'Transfer-Encoding': 'chunked',
				'X-Drift-Renderer': 'ssr',
			},
		})
	} catch (err) {
		if (err && err instanceof Redirect) {
			logger.info('[renderToReadableStream:Redirect]', `Redirecting to ${err.url}`)

			controller?.abort()
			controller = null
			caughtError = null

			return c.redirect(err.url, err.status)
		}

		if (err && err instanceof HTTPException) {
			logger.warn(
				'[renderToReadableStream:HTTPException]',
				`HTTPException thrown during render: ${err.status} ${err.message}`,
			)

			controller?.abort()
			controller = new AbortController()
			caughtError = null

			const errorMatch = router.closest(c.req.path, 'paths.error')
			const match = errorMatch
				? router.enhance({ ...errorMatch, params: {}, error: err })
				: null

			const collection = new MetadataCollection(config.metadata)
			const metadata = await collection
				.add({
					task: fallback.metadata({ error: NOT_FOUND }),
					priority: METADATA_PRIORITY[EntryKind.ERROR],
				})
				.run()

			const payload = devalue.stringify(
				{
					entry: {
						__path: match?.__path,
						params: {},
						error: err,
						metadata,
					},
				},
				payloadReducer,
			)

			const assets = createAssets(relativeBase, payload)
			const initial = { match, metadata }

			const stream = await renderToReadableStream(
				<RouterProvider router={router} initial={initial} config={config}>
					{({ el, metadata }) => (
						<Shell assets={assets} metadata={metadata}>
							{el ?? <fallback.default error={err} />}
						</Shell>
					)}
				</RouterProvider>,
				{
					signal: controller?.signal,
					onError: (err: unknown) => {
						logger.error(Logger.print(err), err)
						caughtError = err
					},
				},
			)

			if (isbot(c.req.header('User-Agent'))) await stream.allReady

			return c.body(stream, {
				status: Router.getMatchStatusCode(match),
				headers: {
					'Content-Type': 'text/html',
					'Transfer-Encoding': 'chunked',
					'X-Drift-Renderer': 'ssr',
				},
			})
		}

		logger.error(Logger.print(err), err)

		controller?.abort()
		controller = null
		caughtError = null

		return c.text(`${NAME}: internal server error`, 500)
	}
}*/

const payloadReducer = {
	Error: (v: unknown) => {
		if (!(v instanceof Error)) return false

		return [
			v.constructor.name,
			v.message,
			v.cause,
			v.stack,
			v instanceof HTTPException ? v.status : undefined,
			v instanceof HTTPException ? v.payload : undefined,
		]
	},
}
