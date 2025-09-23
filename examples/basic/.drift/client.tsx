// auto-generated

/// <reference types="bun" />

import { hc } from 'hono/client'

import { browser } from '@jk2908/drift/render/env/browser'

import type { App } from './server'
import { manifest } from './manifest'
import { map } from './map'
import { config } from './config'

export const client = hc<App>(import.meta.env.VITE_APP_URL)

export async function mount(
	Shell: ({
		children,
		assets,
		metadata,
	}: {
		children: React.ReactNode
		assets?: React.ReactNode
		metadata?: React.ReactNode
	}) => React.ReactNode,
) {
	browser(Shell, manifest, map, config)
}
