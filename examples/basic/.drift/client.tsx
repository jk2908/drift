/// <reference types="bun" />

import { StrictMode } from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { hc } from 'hono/client'

import type { App } from '.drift/server'
import { runtime } from '.drift/runtime'
import { manifest } from '.drift/manifest'

import { HYDRATE_ID } from '@jk2908/drift/config'
import { Router, RouterProvider } from '@jk2908/drift/shared/router'
import { merge } from '@jk2908/drift/shared/metadata'

export const client = hc<App>(import.meta.env.VITE_APP_URL)
const router = new Router(manifest)

function getHydrationData() {
	const el = document.getElementById(HYDRATE_ID)
	return !el || !el.textContent ? null : JSON.parse(JSON.stringify(el.textContent))
}

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
	const data = getHydrationData()
	const { error, ...rest } = data ? JSON.parse(data) : {}

	const assets = (
		<>
			{runtime}
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
		const metadata = merge(
			{
				title: '%s - jk2908',
				meta: [
					{ name: 'random', content: 'This is a random meta tag for testing purposes' },
				],
			},
			{},
		)

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
