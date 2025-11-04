import { StrictMode, startTransition, useEffect, useState } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import type { ContentfulStatusCode } from 'hono/utils/http-status'

import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from '@vitejs/plugin-rsc/browser-CQv7Z3J4'
import type { RscPayload } from '@vitejs/plugin-rsc/rsc-c22DF1A7'
import * as devalue from 'devalue'
import { rscStream } from 'rsc-html-stream/client'

import type { ImportMap, Manifest, PluginConfig } from '../../types'

import { EntryKind } from '../../config'

import { HTTPException, NOT_FOUND, type Payload } from '../../shared/error'
import { Logger } from '../../shared/logger'
import { PRIORITY as METADATA_PRIORITY, MetadataCollection } from '../../shared/metadata'
import { Router } from '../../shared/router'
import { getRelativeBasePath } from '../../shared/utils'

import { readDriftPayload } from '../../client/hydration'
import { RouterProvider } from '../../client/router'

import * as fallback from '../../ui/+error'

import { createAssets } from '../utils'

/**
 * Hydration and routing handler for the browser env
 */
/*
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
	map: ImportMap,
	config: PluginConfig,
) {
	const logger = new Logger(config.logger?.level)
	const router = new Router(manifest, map, logger)

	const relativeBase = getRelativeBasePath(window.location.pathname)

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

		const match = lookup
			? router.enhance({ ...lookup, params: entry.params, error: entry.error })
			: null

		const assets = createAssets(relativeBase, payload)
		const initial = { match, metadata }

		hydrateRoot(
			document,
			<StrictMode>
				<RouterProvider router={router} initial={initial} config={config}>
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

		const match = router.enhance(router.match(window.location.pathname))
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

		const assets = createAssets(relativeBase)

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
}*/

export async function browser() {
	let setPayload: (payload: RscPayload) => void

	const initial = await createFromReadableStream<RscPayload>(rscStream)

	function R() {
		const [p, setP] = useState<RscPayload>(initial)

		useEffect(() => {
			setPayload = v => startTransition(() => setP(v))
		}, [setP])

		return p.root
	}

	setServerCallback(async (id, args) => {
		const url = new URL(window.location.href)
		const temporaryReferences = createTemporaryReferenceSet()
		const payload = await createFromFetch<RscPayload>(
			fetch(url, {
				method: 'POST',
				body: await encodeReply(args, { temporaryReferences }),
				headers: {
					'x-rsc-action': id,
				},
			}),
			{ temporaryReferences },
		)

		setPayload(payload)

		return payload.returnValue
	})

	hydrateRoot(
		document,
		<StrictMode>
			<R />
		</StrictMode>,
		{
			formState: initial.formState,
		},
	)

	import.meta.hot?.on?.('rsc:update', async () => {
		setPayload(await createFromFetch<RscPayload>(fetch(window.location.href)))
	})
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
