import { StrictMode, startTransition, useEffect, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'

import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import { rscStream } from 'rsc-html-stream/client'
import { NAME } from 'src/config'

import { Metadata } from '../../shared/metadata'

import { RouterProvider } from '../../client/router'

import type { RSCPayload } from './rsc'

declare global {
	interface Window {
		[key: `__${string}__`]: {
			setPayload?: (payload: RSCPayload) => void
		}
	}
}

/**
 * Browser RSC hydration entry point
 */
export async function browser() {
	let setPayload: (payload: RSCPayload) => void = () => {}

	const payload = await createFromReadableStream<RSCPayload>(rscStream)

	function R() {
		const [p, setP] = useState<RSCPayload>(payload)

		useEffect(() => {
			setPayload = v => startTransition(() => setP(v))

			const name = NAME.toUpperCase()

			window[`__${name}__`] ??= {}
			window[`__${name}__`].setPayload = setPayload

			return () => {
				delete window[`__${name}__`].setPayload
			}
		}, [])

		return p.root
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
			<RouterProvider>
				<Metadata driftPayload={payload.driftPayload} />

				<R />
			</RouterProvider>
		</StrictMode>,
		{
			formState: payload.formState,
		},
	)

	import.meta.hot?.on?.('rsc:update', async () => {
		setPayload(await createFromFetch<RSCPayload>(fetch(window.location.href)))
	})
}
