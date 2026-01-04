import {
	StrictMode,
	Suspense,
	useCallback,
	useEffect,
	useState,
	useTransition,
} from 'react'
import { hydrateRoot } from 'react-dom/client'

import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from '@vitejs/plugin-rsc/browser'
import { rscStream } from 'rsc-html-stream/client'

import { Metadata } from '../../shared/metadata'

import { RouterProvider } from '../../client/router'

import { RedirectBoundary } from '../../ui/defaults/redirect-boundary'

import type { RSCPayload } from './rsc'

/**
 * Browser RSC hydration entry point
 */
export async function browser() {
	const payload = await createFromReadableStream<RSCPayload>(rscStream)
	let setPayload: (payload: RSCPayload) => void = () => {}

	function A() {
		const [p, setP] = useState<RSCPayload>(payload)
		const [isPending, startTransition] = useTransition()

		const setPayloadInTransition = useCallback((payload: RSCPayload) => {
			startTransition(() => {
				setP(payload)
			})
		}, [])

		useEffect(() => {
			// expose external setPayload - used inside
			// server callback to update payload after
			// action execution
			setPayload = setPayloadInTransition
		}, [setPayloadInTransition])

		return (
			<RedirectBoundary>
				<RouterProvider setPayload={setPayloadInTransition} isNavigating={isPending}>
					<Suspense fallback={null}>
						<Metadata metadata={p.metadata} />
					</Suspense>

					{p.root}
				</RouterProvider>
			</RedirectBoundary>
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
