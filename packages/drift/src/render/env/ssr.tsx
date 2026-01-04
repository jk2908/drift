import { Suspense, use } from 'react'
import type { ReactFormState } from 'react-dom/client'
import { renderToReadableStream } from 'react-dom/server.edge'

import { createFromReadableStream } from '@vitejs/plugin-rsc/ssr'
import { injectRSCPayload } from 'rsc-html-stream/server'

import { DRIFT_PAYLOAD_ID } from '../../config'

import { Logger } from '../../shared/logger'
import { Metadata } from '../../shared/metadata'

import { RouterProvider } from '../../client/router'

import { RedirectBoundary } from '../../ui/defaults/redirect-boundary'

import type { RSCPayload } from './rsc'
import { getDigest } from './utils'

/**
 * SSR handler - returns a ReadableStream response for HTML requests
 * @param rscStream - the RSC ReadableStream to render
 * @param formState - optional React form state for hydration
 * @param nonce - optional nonce for CSP
 * @returns a ReadableStream of the rendered HTML
 */
export async function ssr(
	rscStream: ReadableStream<Uint8Array>,
	formState?: ReactFormState,
	nonce?: string,
) {
	const logger = new Logger()
	const [s1, s2] = rscStream.tee()
	const payloadPromise: Promise<RSCPayload> = createFromReadableStream<RSCPayload>(s1)

	function A() {
		const payload = use(payloadPromise)

		return (
			<RedirectBoundary>
				<RouterProvider>
					<Suspense fallback={null}>
						<Metadata metadata={payload.metadata} />
					</Suspense>

					{payload.root}
				</RouterProvider>
			</RedirectBoundary>
		)
	}

	const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent(
		'index',
	)

	const htmlStream = await renderToReadableStream(<A />, {
		bootstrapScriptContent,
		nonce,
		formState,
		onError(err) {
			const digest = getDigest(err)
			if (digest) return digest

			logger.error('ssr', err)
		},
	})

	return htmlStream.pipeThrough(injectDriftPayload(payloadPromise)).pipeThrough(
		injectRSCPayload(s2, {
			nonce,
		}),
	)
}

function injectDriftPayload(payloadPromise: Promise<RSCPayload>) {
	const encoder = new TextEncoder()
	const decoder = new TextDecoder()
	const TM = 25

	let buf = ''
	let timeout: ReturnType<typeof setTimeout> | null = null
	let done = false

	const emptyPayload = { driftPayload: '' } satisfies Partial<RSCPayload>

	return new TransformStream<Uint8Array, Uint8Array>({
		start() {},

		transform(chunk, controller) {
			buf += decoder.decode(chunk, { stream: true })

			if (timeout) return

			timeout = setTimeout(async () => {
				try {
					const idx = buf.indexOf('</head>')

					if (idx !== -1 && !done) {
						const before = buf.slice(0, idx)
						const after = buf.slice(idx)

						const payload = await Promise.race<
							[Promise<RSCPayload>, Promise<Partial<RSCPayload>>]
						>([
							payloadPromise,
							new Promise(res => setTimeout(() => res(emptyPayload), TM)),
						])

						const content = payload.driftPayload ?? ''
						const tag = `<script id="${DRIFT_PAYLOAD_ID}" type="application/json">${escapeScript(content)}</script>`

						controller.enqueue(encoder.encode(before + tag + after))
						buf = ''
						done ||= !!payload.driftPayload
					} else {
						controller.enqueue(encoder.encode(buf))
						buf = ''
					}
				} catch (err) {
					controller.error(err)
				} finally {
					if (timeout) {
						clearTimeout(timeout)
						timeout = null
					}
				}
			}, 0)
		},

		async flush(controller) {
			if (timeout) {
				clearTimeout(timeout)
				timeout = null
			}

			if (buf.length > 0) {
				const payload = await Promise.race<
					[Promise<RSCPayload>, Promise<Partial<RSCPayload>>]
				>([payloadPromise, new Promise(res => setTimeout(() => res(emptyPayload), 100))])

				const content = payload.driftPayload ?? ''

				if (!done && content) {
					const tag = `<script id="${DRIFT_PAYLOAD_ID}" type="application/json">${escapeScript(content)}</script>`

					controller.enqueue(encoder.encode(buf + tag))
					done = true
				} else {
					controller.enqueue(encoder.encode(buf))
				}

				buf = ''
				return
			}

			if (!done) {
				let payload: Partial<RSCPayload>

				try {
					payload = await payloadPromise
				} catch {
					payload = emptyPayload
				}

				const content = payload.driftPayload ?? ''

				if (payload && content) {
					const tag = `<script id="${DRIFT_PAYLOAD_ID}" type="application/json">${escapeScript(content)}</script>`

					controller.enqueue(encoder.encode(tag))
					done = true
				}
			}
		},
	})
}

// from rsc-html-stream
function escapeScript(script: string) {
	return script.replace(/<!--/g, '<\\!--').replace(/<\/(script)/gi, '</\\$1')
}
