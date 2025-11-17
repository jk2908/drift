import { use } from 'react'
import type { ReactFormState } from 'react-dom/client'
import { renderToReadableStream } from 'react-dom/server.edge'

import { createFromReadableStream } from '@vitejs/plugin-rsc/browser'
import { injectRSCPayload } from 'rsc-html-stream/server'

import { Logger } from '../../shared/logger'

import type { RscPayload } from './rsc'

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

export async function ssr(
	rscStream: ReadableStream<Uint8Array>,
	opts?: {
		returnValue?: unknown
		formState?: ReactFormState
		temporaryReferences?: unknown
		nonce?: string
	},
) {
	const logger = new Logger()

	try {
		const [s1, s2] = rscStream.tee()

		let payload: Promise<RscPayload>

		function A() {
			payload ??= createFromReadableStream<RscPayload>(s1)

			return <B>{use(payload).root}</B>
		}

		function B({ children }: { children: React.ReactNode }) {
			return <>{children}</>
		}

		const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent(
			'index',
		)
		const htmlStream = await renderToReadableStream(<A />, {
			bootstrapScriptContent,
			nonce: opts?.nonce,
			formState: opts?.formState,
		})

		return htmlStream.pipeThrough(
			injectRSCPayload(s2, {
				nonce: opts?.nonce,
			}),
		)
	} catch (err) {
		logger.error('[ssr]', err)
		throw err
	}
}
