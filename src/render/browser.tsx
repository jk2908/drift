import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import type { ContentfulStatusCode } from 'hono/utils/http-status'

import * as devalue from 'devalue'

import type { Manifest, PluginConfig } from '../types'

import { DRIFT_PAYLOAD_ID } from '../config'

import { HTTPException, type Payload } from '../shared/error'
import { Logger } from '../shared/logger'
import { mergeMetadata } from '../shared/metadata'
import { Router, RouterProvider } from '../shared/router'
import { getRelativeBasePath } from '../shared/utils'

import { readDriftPayload } from '../client/hydration'
import { Runtime } from '../client/runtime'

import * as fallback from '../ui/+error'

/**
 * Hydration and routing handler for the browser env
 */
export async function browser(
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

	const relativeBase = getRelativeBasePath(window.location.pathname)

	const NOT_FOUND = new HTTPException(404, 'Not found')

	try {
		const payload = readDriftPayload()
		const { entry, metadata } = payload ? devalue.parse(payload, payloadReviver) : {}

		// reconstruct the match object from ssr'd payload data to avoid
		// redundant router.match call during hydration. Set match to
		// null to trigger fallback if lookup has failed. Could try
		// match w/ router.match(window.location.pathname) but
		// don't see why that would be worth it. This makes
		// fallback error handling marginally quicker
		const lookup = Router.narrow(manifest[entry?.__path])
		const match = lookup ? { ...lookup, params: entry.params, error: entry.error } : null

		const assets = (
			<>
				<Runtime relativeBase={relativeBase} />

				<script
					id={DRIFT_PAYLOAD_ID}
					type="application/json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: //
					dangerouslySetInnerHTML={{
						__html: payload,
					}}
				/>
			</>
		)

		hydrateRoot(
			document,
			<StrictMode>
				<RouterProvider router={router} initial={{ match, metadata }} config={config}>
					{({ el, metadata }) => (
						<Shell assets={assets} metadata={metadata}>
							{el ?? <fallback.default error={NOT_FOUND} />}
						</Shell>
					)}
				</RouterProvider>
			</StrictMode>,
		)
	} catch (err) {
		// if we've errored and made it to here, something bad
		// has happened - let's try build from scratch

		logger.error(Logger.print(err), err)

		const match = router.match(window.location.pathname)

		const routeMetadata = match
			? await match.metadata?.({
					params: match.params,
					error: match.error,
				})
			: [await fallback.metadata({ error: NOT_FOUND })]
		const metadata = mergeMetadata(config?.metadata ?? {}, ...(routeMetadata ?? []))

		const assets = (
			<>
				<Runtime relativeBase={relativeBase} />
			</>
		)

		createRoot(document).render(
			<StrictMode>
				<RouterProvider router={router} initial={{ match, metadata }} config={config}>
					{({ el, metadata }) => (
						<Shell assets={assets} metadata={metadata}>
							{el ?? <fallback.default error={NOT_FOUND} />}
						</Shell>
					)}
				</RouterProvider>
			</StrictMode>,
		)
	}
}

const payloadReviver = {
	Error: ([name, message, cause, stack, status, payload]: [
		string,
		string | undefined,
		unknown,
		string | undefined,
		ContentfulStatusCode | undefined,
		Payload | undefined,
	]) => {
		if (name === 'HTTPException' && status !== undefined) {
			const error = new HTTPException(status, message, { payload, cause })
			if (stack) error.stack = stack

			return error
		} else {
			const error = new Error(message, { cause })
			if (stack) error.stack = stack

			return error
		}
	},
}
