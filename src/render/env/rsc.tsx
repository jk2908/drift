import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'
import * as devalue from 'devalue'

import type { ImportMap, Manifest, PluginConfig } from '../../types'

import { EntryKind } from '../../config'

import { HTTPException, NOT_FOUND } from '../../shared/error'
import { Logger } from '../../shared/logger'
import { PRIORITY as METADATA_PRIORITY, MetadataCollection } from '../../shared/metadata'
import { Router } from '../../shared/router'
import { getRelativeBasePath } from '../../shared/utils'

import { RouterProvider } from '../../client/router'

import * as fallback from '../../ui/+error'

import { createAssets } from '../utils'

/**
 * RSC rendering handler - generates RSC stream from React tree
 * @param request - incoming request
 * @param Shell - shell component
 * @param manifest - route manifest
 * @param map - import map
 * @param config - plugin config
 */
export async function rsc(
	request: Request,
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

	try {
		const url = new URL(request.url)
		const match = router.enhance(router.match(url.pathname))
		const relativeBase = getRelativeBasePath(url.pathname)

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

		const stream = renderToReadableStream(
			<RouterProvider router={router} initial={initial} config={config}>
				{({ el, metadata }) => (
					<Shell assets={assets} metadata={metadata}>
						{el ?? <fallback.default error={NOT_FOUND} />}
					</Shell>
				)}
			</RouterProvider>,
		)

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/x-component;charset=utf-8',
			},
		})
	} catch (err) {
		logger.error('[rsc]', err)
		return new Response(null, { status: 500 })
	}
}

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
