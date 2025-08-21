/// <reference types="bun" />

    import { hc } from 'hono/client'

    import type { App } from '.drift/server'
    import { manifest } from '.drift/manifest'
    import { config } from '.drift/config'

    import { browser } from '@jk2908/drift/render/env/browser'
    
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
      browser(Shell, manifest, config)
    }