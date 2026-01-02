import type { ReactFormState } from 'react-dom/client'

import type { ContentfulStatusCode } from 'hono/utils/http-status'

import {
	createTemporaryReferenceSet,
	decodeAction,
	decodeFormState,
	decodeReply,
	loadServerAction,
	renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import * as devalue from 'devalue'

import type { ImportMap, Manifest, Metadata } from '../../types'

import { EntryKind } from '../../config'

import { HTTPException, type Payload as HTTPExceptionPayload } from '../../shared/error'
import { PRIORITY as METADATA_PRIORITY, MetadataCollection } from '../../shared/metadata'
import { Router } from '../../shared/router'
import { Tree } from '../../shared/tree'

import {
	default as DefaultErrorPage,
	metadata as defaultErrorMetadata,
} from '../../ui/defaults/+error'

import { onError } from './utils'

export type RSCPayload = {
	returnValue?: { ok: boolean; data: unknown }
	formState?: ReactFormState
	root: React.ReactNode
	driftPayload?: string
	metadata?: Promise<Metadata>
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
	const collection = new MetadataCollection(baseMetadata)

	const url = new URL(req.url)
	const match = router.enhance(router.match(url.pathname))

	if (!match) {
		const error = new HTTPException('Not found', 404)

		const metadata = collection
			.add({
				task: defaultErrorMetadata({ error }),
				priority: METADATA_PRIORITY[EntryKind.ERROR],
			})
			.run()

		const rscPayload: RSCPayload = {
			root: (
				<>
					<DefaultErrorPage error={error} />
				</>
			),
			returnValue,
			formState,
			metadata,
		}

		return renderToReadableStream(rscPayload, {
			temporaryReferences,
			onError,
		})
	}

	const metadata = match
		.metadata?.({ params: match.params, error: match.error })
		.then(m =>
			collection.add(...m.filter(r => r.status !== 'rejected').map(r => r.value)).run(),
		)

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
				<Tree
					depth={match.__depth}
					paths={match.paths}
					params={match.params}
					error={match.error}
					ui={match.ui}
				/>
			</>
		),
		returnValue,
		formState,
		driftPayload,
		metadata,
	}

	return renderToReadableStream(rscPayload, {
		temporaryReferences,
		onError,
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

export const driftPayloadReviver = {
	Error: ([name, message, cause, stack, status, payload]: [
		string,
		string,
		unknown,
		string | undefined,
		ContentfulStatusCode | undefined,
		HTTPExceptionPayload | undefined,
	]) => {
		if (name === 'HTTPException' && status !== undefined) {
			const error = new HTTPException(message, status, { payload, cause })
			if (stack) error.stack = stack

			return error
		} else {
			const error = new Error(message, { cause })
			if (stack) error.stack = stack

			return error
		}
	},
}
