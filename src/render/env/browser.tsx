import { StrictMode, useEffect, useState, useTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'

import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import { rscStream } from 'rsc-html-stream/client'
import { RouterProvider } from 'src/client/router'

import { Metadata } from '../../shared/metadata'

import type { RSCPayload } from './rsc'

/**
 * Browser RSC hydration entry point
 */
export async function browser() {
	let setPayload: (payload: RSCPayload) => void = () => {}

	const payload = await createFromReadableStream<RSCPayload>(rscStream)

	function A() {
		const [p, setP] = useState<RSCPayload>(payload)
		const [isPending, startTransition] = useTransition()

		useEffect(() => {
			// expose external setPayload - used inside
			// server callback to update payload after
			// action execution
			setPayload = v => startTransition(() => setP(v))
		}, [])

		return (
			<RouterProvider setPayload={setP} isNavigating={isPending}>
				<Metadata driftPayload={p.driftPayload} />

				{p.root}
			</RouterProvider>
		)
	}

	setServerCallback(async (id, args) => {
		const url = new URL(window.location.href)
		const temporaryReferences = createTemporaryReferenceSet()
		const payload = await createFromFetch<RSCPayload>(
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

		const { ok, data } = payload.returnValue ?? {}

		if (!ok) throw data
		return data
	})

	hydrateRoot(
		document,
		<StrictMode>
			<A />
		</StrictMode>,
		{
			formState: payload.formState,
		},
	)

	import.meta.hot?.on?.('rsc:update', async () => {
		setPayload(await createFromFetch<RSCPayload>(fetch(window.location.href)))
	})
}
