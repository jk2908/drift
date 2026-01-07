import type { ReactFormState } from 'react-dom/client'

import {
	createTemporaryReferenceSet,
	decodeAction,
	decodeFormState,
	decodeReply,
	loadServerAction,
	renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'

import type { ImportMap, Manifest, Metadata } from '../../types'

import {
	HttpException,
	type Payload as HttpExceptionPayload,
	type StatusCode,
} from '../../shared/error'
import { Logger } from '../../shared/logger'
import { MetadataCollection } from '../../shared/metadata'
import { Router } from '../../shared/router'
import { Tree } from '../../shared/tree'

import { getKnownDigest } from './utils'

export type RSCPayload = {
	returnValue?: { ok: boolean; data: unknown }
	formState?: ReactFormState
	root: React.ReactNode
	metadata?: Promise<Metadata>
}

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
	const logger = new Logger()
	const url = new URL(req.url)
	const match = router.enhance(router.match(url.pathname))

	if (!match) {
		const error = new HttpException('Not found', 404)
		const title = `${error.status} - ${error.message}`

		const rscPayload: RSCPayload = {
			root: (
				<html lang="en">
					<head>
						<meta charSet="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<meta name="robots" content="noindex,nofollow" />

						<title>{title}</title>
					</head>

					<body>
						<h1>{title}</h1>
						<p>{error.message}</p>

						{error.stack && <pre>{error.stack}</pre>}
					</body>
				</html>
			),
			returnValue,
			formState,
		}

		return {
			stream: renderToReadableStream(rscPayload, {
				temporaryReferences,
				onError(err: unknown) {
					const digest = getKnownDigest(err)
					if (digest) return digest

					logger.error('[rsc]', err)
				},
			}),
			status: 404,
		}
	}

	const collection = new MetadataCollection(baseMetadata)

	const metadata = match
		.metadata?.({ params: match.params, error: match.error })
		.then(m =>
			collection.add(...m.filter(r => r.status !== 'rejected').map(r => r.value)).run(),
		)

	const rscPayload: RSCPayload = {
		root: (
			<>
				<Tree
					depth={match.__depth}
					params={match.params}
					error={match.error}
					ui={match.ui}
				/>
			</>
		),
		returnValue,
		formState,
		metadata,
	}

	// status code comes from route match error if any
	const status = match.error instanceof HttpException ? match.error.status : 200

	try {
		const stream = renderToReadableStream(rscPayload, {
			temporaryReferences,
			onError(err: unknown) {
				const digest = getKnownDigest(err)
				if (digest) return digest

				logger.error('rsc', err)
			},
		})

		return { stream, status }
	} catch (err) {
		// shell failed to render - return minimal fallback
		logger.error('rsc shell', err)

		const title =
			err instanceof Error
				? 'status' in err
					? `${err.status} - ${err.message}`
					: `500 - ${err.message}`
				: '500 - Unknown server error'
		const message = err instanceof Error ? err.message : 'Unknown server error'

		return {
			stream: renderToReadableStream(
				{
					root: (
						<html lang="en">
							<head>
								<meta charSet="UTF-8" />
								<meta name="viewport" content="width=device-width, initial-scale=1.0" />
								<meta name="robots" content="noindex,nofollow" />

								<title>{title}</title>
							</head>

							<body>
								<h1>{title}</h1>
								<p>{message}</p>

								{err instanceof Error && err.stack && <pre>{err.stack}</pre>}
							</body>
						</html>
					),
					returnValue,
					formState,
				},
				{
					temporaryReferences,
				},
			),
			status: 500,
		}
	}
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
			v instanceof HttpException ? v.status : undefined,
			v instanceof HttpException ? v.payload : undefined,
		]
	},
}

export const driftPayloadReviver = {
	Error: ([name, message, cause, stack, status, payload]: [
		string,
		string,
		unknown,
		string | undefined,
		StatusCode | undefined,
		HttpExceptionPayload | undefined,
	]) => {
		if (name === 'HttpException' && status !== undefined) {
			const error = new HttpException(message, status, { payload, cause })
			if (stack) error.stack = stack

			return error
		} else {
			const error = new Error(message, { cause })
			if (stack) error.stack = stack

			return error
		}
	},
}
