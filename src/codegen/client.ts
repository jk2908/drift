import { PKG_NAME } from '../config'

import { AUTO_GEN_MSG } from './utils'

/**
 * Generates the exported client-side code for mounting the 
 * application shell and initialising the RPC client
 * @returns the stringified code
 */
export function writeClient() {
	return `
    ${AUTO_GEN_MSG}

    /// <reference types="bun" />

    import { hc } from 'hono/client'

    import { browser } from '${PKG_NAME}/render/env/browser'

    import type { App } from './server'
    import { manifest } from './manifest'
    import { map } from './map'
    import { config } from './config'
    
    export const client = hc<App>(config.app?.url ?? import.meta.env.VITE_APP_URL)

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
  `.trim()
}
