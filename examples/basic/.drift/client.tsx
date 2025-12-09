// auto-generated

/// <reference types="bun" />

import { hc } from 'hono/client'

import type { App } from './server'

export const client = hc<App>(config.app?.url ?? import.meta.env.VITE_APP_URL)
