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

import type { ImportMap, Manifest, Metadata } from '../../types'

import { EntryKind } from '../../config'

import { HTTPException, NOT_FOUND } from '../../shared/error'
import { PRIORITY as METADATA_PRIORITY, MetadataCollection } from '../../shared/metadata'
import { Router } from '../../shared/router'

import * as fallback from '../../ui/+error'

export type RSCPayload = {
	returnValue?: { ok: boolean; data: unknown }
	formState?: ReactFormState
	root: React.ReactNode
	driftPayload: string
	metadata: Promise<Metadata> | undefined
}

export type DriftPayload = {
	entry: {
		__path?: string
		params?: Record<string, string>
		error?: HTTPException | Error
	}
}

export type UnparsedDriftPayload = string

/**
 * RSC handler - returns a ReadableStream response for RSC requests
 * @param req - the incoming request
 * @param Shell - the app root (shell) component to render
 * @param manifest - the application manifest containing routes and metadata
 * @param importMap - the import map for route components and endpoints
 * @param baseMetadata - optional global metadata from config
 * @param returnValue - optional return value from an action
 * @param formState - optional React form state for hydration
 * @param temporaryReferences - optional temporary references for RSC
 * @returns a ReadableStream response for RSC requests
 */
export async function rsc(
	req: Request,
	manifest: Manifest,
	importMap: ImportMap,
	baseMetadata?: Metadata,
	returnValue?: { ok: boolean; data: unknown },
	formState?: ReactFormState,
	temporaryReferences?: unknown,
) {
	const router = new Router(manifest, importMap)

	const url = new URL(req.url)
	const match = router.enhance(router.match(url.pathname))

	const collection = new MetadataCollection(baseMetadata)

	const metadata = match
		? match
				.metadata?.({ params: match.params, error: match.error })
				.then(m =>
					collection
						.add(...m.filter(r => r.status !== 'rejected').map(r => r.value))
						.run(),
				)
		: collection
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
		},
		driftPayloadReducer,
	)

	const rscPayload: RSCPayload = {
		root: (
			<>
				{match ? <Tree params={match.params} error={match.error} ui={match.ui} /> : null}
			</>
		),
		returnValue,
		formState,
		driftPayload,
		metadata,
	}

	return renderToReadableStream(rscPayload, {
		temporaryReferences,
	})
}

export async function action(req: Request) {
	let returnValue: { ok: boolean; data: unknown } | undefined
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
