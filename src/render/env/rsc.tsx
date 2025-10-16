import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc'

import type { ImportMap, Manifest, PluginConfig } from '../../types'

import { NOT_FOUND } from '../../shared/error'
import { Logger } from '../../shared/logger'
import { Router, RouterProvider } from '../../shared/router'

import * as fallback from '../../ui/+error'

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
		const initial = { match, metadata: {} }

		const stream = renderToReadableStream(
			<RouterProvider router={router} initial={initial} config={config}>
				{({ el }) => (
					<Shell assets={null} metadata={null}>
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
