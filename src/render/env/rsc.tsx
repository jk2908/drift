import type { ReactFormState } from 'react-dom/client'

import {
	createTemporaryReferenceSet,
	decodeAction,
	decodeFormState,
	decodeReply,
	loadServerAction,
	renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import * as devalue from 'devalue'
import { Tree } from 'src/shared/tree'

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

export type RscPayload = {
	returnValue?: unknown
	formState?: ReactFormState
	root: React.ReactNode
}

/**
 * RSC rendering handler - returns a ReadableStream response for RSC requests
 * @param req - the incoming request
 * @param Shell - the app root (shell) component to render
 * @param opts - the options including manifest, map, config and RSC-specific data
 * @param opts.manifest - the application manifest containing routes and metadata
 * @param opts.map - the import map for route components and endpoints
 * @param opts.config - the plugin configuration
 * @param opts.returnValue - the return value from a server action, if any
 * @returns a ReadableStream response for RSC requests
 */
export async function rsc(
	req: Request,
	Shell: ({ children }: { children: React.ReactNode }) => React.ReactNode,
	manifest: Manifest,
	importMap: ImportMap,
	config: PluginConfig,
	opts: {
		returnValue?: unknown
		formState?: ReactFormState
		temporaryReferences?: unknown
	},
) {
	const logger = new Logger(config.logger?.level)
	const router = new Router(manifest, importMap, logger)

	try {
		const url = new URL(req.url)
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

		const driftPayload = devalue.stringify(
			{
				entry: {
					__path: match?.__path,
					params: match?.params,
					error: match?.error,
				},
				metadata,
			},
			driftPayloadReducer,
		)

		const assets = createAssets(relativeBase, driftPayload)
		const initial = { match, metadata }
		const { returnValue, formState, temporaryReferences } = opts ?? {}

		const rscPayload: RscPayload = {
			root: (
				<RouterProvider>
					{assets}

					<Shell>{match ? <Tree match={match} /> : null}</Shell>
				</RouterProvider>
			),
			returnValue,
			formState,
		}

		return renderToReadableStream(rscPayload, { temporaryReferences })
	} catch (err) {
		logger.error('[rsc]', err)
		return new Response(null, { status: 500 })
	}
}

export async function action(req: Request, opts: { config: PluginConfig }) {
	const logger = new Logger(opts.config.logger?.level)

	try {
		let returnValue: unknown
		let formState: ReactFormState | undefined
		let temporaryReferences: unknown

		const id = req.headers.get('x-rsc-action-id')

		if (id) {
			// x-rsc-action header exists when action is
			// called via ReactClient.setServerCallback

			const body = req.headers.get('content-type')?.startsWith('multipart/form-data')
				? await req.formData()
				: await req.text()

			temporaryReferences = createTemporaryReferenceSet()

			const args = await decodeReply(body, {
				temporaryReferences,
			})
			const action = await loadServerAction(id)

			returnValue = await action.apply(null, args)
		} else {
			// otherwise server function is called via
			// <form action={...}> aka without js
			const formData = await req.formData()
			const decodedAction = await decodeAction(formData)
			const result = await decodedAction()

			formState = await decodeFormState(result, formData)
		}

		return { returnValue, formState, temporaryReferences }
	} catch (err) {
		logger.error('[rsc][action]', err)
		throw err
	}
}

const driftPayloadReducer = {
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
