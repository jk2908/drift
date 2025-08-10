import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import * as devalue from 'devalue'

import type { Manifest, PluginConfig } from '../types'

import { DRIFT_PAYLOAD_ID } from '../config'

import { Logger } from '../shared/logger'
import { Router, RouterProvider } from '../shared/router'
import { getRelativeBasePath } from '../shared/utils'

import { readDriftPayload } from '../client/hydration'
import { Runtime } from '../client/runtime'

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

	try {
		const payload = readDriftPayload()
		const { error, metadata = {} } = payload ? devalue.parse(payload) : {}

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

		if (error) {
			throw new Error(
				`Error during server-side rendering: ${error.message ?? 'Unknown error'}`,
				{ cause: error },
			)
		}

		const match = router.match(window.location.pathname)

		hydrateRoot(
			document,
			<StrictMode>
				<RouterProvider
					router={router}
					initial={{ match, metadata }}>
					{({ el, metadata }) => (
						<Shell assets={assets} metadata={metadata}>
							{el}
						</Shell>
					)}
				</RouterProvider>
			</StrictMode>,
		)
	} catch (err) {
		logger.error(Logger.print(err), err)

    // if we've errored either during SSR or hydration,
		// we re-create the app from scratch

		const payload = readDriftPayload()
		const { metadata = {} } = payload ? JSON.parse(payload) : {}

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

		createRoot(document).render(
			<StrictMode>
				<RouterProvider
					router={router}
					initial={{ match: null, metadata, }}>
					{({ el, metadata }) => (
						<Shell assets={assets} metadata={metadata}>
							{el}
						</Shell>
					)}
				</RouterProvider>
			</StrictMode>,
		)
	}
}
