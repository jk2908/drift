/// <reference types="bun" />

import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { hc } from 'hono/client'

import type { App } from '.drift/server'
import { manifest } from '.drift/manifest'
import { config } from '.drift/config'

import { HYDRATE_ID } from '@jk2908/drift/config'

import { Router, RouterProvider } from '@jk2908/drift/shared/router'
import { merge } from '@jk2908/drift/shared/metadata'
import { getRelativeBasePath } from '@jk2908/drift/shared/utils'

import { getHydrationData } from '@jk2908/drift/client/hydration'
import { Runtime } from '@jk2908/drift/client/runtime'

export const client = hc<App>(import.meta.env.VITE_APP_URL)
const router = new Router(manifest)

export async function mount(
	render: ({
		children,
		assets,
		metadata,
	}: {
		children: React.ReactNode
		assets?: React.ReactNode
		metadata?: React.ReactNode
	}) => React.ReactNode,
) {
	const match = router.match(window.location.pathname)
	const relativeBase = getRelativeBasePath(window.location.pathname)

	const data = getHydrationData()
	const { error, ...rest } = data ? JSON.parse(data) : {}

	const assets = (
		<>
			<Runtime relativeBase={relativeBase} />

			<script
				id={HYDRATE_ID}
				type="application/json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: //
				dangerouslySetInnerHTML={{
					__html: data,
				}}
			/>
		</>
	)

	if (error) {
		const metadata = merge(config.metadata ?? {}, {})

		createRoot(document).render(
			<StrictMode>
				<RouterProvider router={router} initial={{ match: null, metadata }}>
					{({ el, metadata }) =>
						render({
							children: null,
						})
					}
				</RouterProvider>
			</StrictMode>,
		)
		return
	}

	const { metadata } = rest

	hydrateRoot(
		document,
		<StrictMode>
			<RouterProvider router={router} initial={{ match, metadata }}>
				{({ el, metadata }) => render({ children: el, assets, metadata })}
			</RouterProvider>
		</StrictMode>,
	)
}
