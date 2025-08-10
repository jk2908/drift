import path from 'node:path'

import { renderToReadableStream } from 'react-dom/server.browser'

import type { Context as HonoContext } from 'hono'

import * as devalue from 'devalue'
import { isbot } from 'isbot'

import type { Manifest, PluginConfig } from '../types'

import { DRIFT_PAYLOAD_ID, NAME } from '../config'

import { HTTPException } from '../shared/error'
import { Logger } from '../shared/logger'
import { mergeMetadata } from '../shared/metadata'
import { Redirect } from '../shared/redirect'
import { Router, RouterProvider } from '../shared/router'
import { getRelativeBasePath } from '../shared/utils'

import { Runtime } from '../client/runtime'

/**
 * Server-side rendering handler to bridge incoming Hono requests with React
 * @param c - the Hono context
 * @param Shell - the app root (shell) component to render
 * @param manifest - the application manifest containing routes and metadata
 * @param config - the plugin configuration
 * @returns a Hono streaming response
 */
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
	config: PluginConfig,
) {
	const router = new Router(manifest)
	const logger = new Logger(config.logger?.level)

	const relativeBase = getRelativeBasePath(c.req.path)

	let controller: AbortController | null = new AbortController()
	let caughtError = null

	if (c.req.path.startsWith('/.well-known/appspecific/com.chrome.devtools.json')) {
		return c.body(null, 204)
	}

	try {
		const match = router.match(c.req.path)
		if (!match) throw new HTTPException(404, 'Not Found')

		if (match?.prerender && !import.meta.env.DEV && !Bun.env.PRERENDER) {
			const outPath =
				c.req.path === '/'
					? path.join(import.meta.dir, 'index.html')
					: path.join(import.meta.dir, c.req.path, 'index.html')

			return c.html(await Bun.file(outPath).text())
		}

		const metadata = mergeMetadata(
			config.metadata ?? {},
			...((await match.metadata?.({
				params: match.params,
				error: match.error,
			})) ?? []),
		)

		const data = devalue.stringify({ config, metadata })

		const assets = (
			<>
				<Runtime relativeBase={relativeBase} />

				<script
					id={DRIFT_PAYLOAD_ID}
					type="application/json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: //
					dangerouslySetInnerHTML={{
						__html: data,
					}}
				/>
			</>
		)

		const stream = await renderToReadableStream(
			<RouterProvider router={router} initial={{ match, metadata }}>
				{({ el, metadata }) => (
					<Shell assets={assets} metadata={metadata}>
						{el}
					</Shell>
				)}
			</RouterProvider>,
			{
				signal: controller?.signal,
				onError(err: unknown) {
					logger.error(Logger.print(err), err)
					caughtError = err
				},
			},
		)

		if (caughtError) throw caughtError
		if (isbot(c.req.header('User-Agent'))) await stream.allReady

		return c.body(stream, {
			status: 200,
			headers: {
				'Content-Type': 'text/html',
				'Transfer-Encoding': 'chunked',
			},
		})
	} catch (err) {
		if (err && err instanceof Redirect) {
			logger.info(`Redirecting to ${err.url}`)

			controller?.abort()
			controller = null
			caughtError = null

			return c.redirect(err.url, err.status)
		}

		if (err && err instanceof HTTPException) {
			logger.error(Logger.print(err), err)

			controller?.abort()
			controller = null
			caughtError = null

			const metadata = mergeMetadata(config.metadata ?? {}, {})
			const data = devalue.stringify({ metadata, error: err })

			const assets = (
				<>
					<Runtime relativeBase={relativeBase} />

					<script
						id={DRIFT_PAYLOAD_ID}
						type="application/json"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: //
						dangerouslySetInnerHTML={{
							__html: data,
						}}
					/>
				</>
			)

			return c.body(
				await renderToReadableStream(
					<RouterProvider router={router} initial={{ match: null, metadata }}>
						{({ metadata }) => (
							<Shell assets={assets} metadata={metadata}>
								{null}
							</Shell>
						)}
					</RouterProvider>,
				),
				{
					status: err.status,
					headers: {
						'Content-Type': 'text/html',
						'Transfer-Encoding': 'chunked',
					},
				},
			)
		}

		logger.error(Logger.print(err), err)

		controller?.abort()
		controller = null
		caughtError = null

		return c.text(`${NAME}: internal server error`, 500)
	}
}
