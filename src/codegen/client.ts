import { GENERATED_DIR, PKG_NAME } from '../config'

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

    import type { App } from '${GENERATED_DIR}/server'
    import { manifest } from '${GENERATED_DIR}/manifest'
    import { map } from '${GENERATED_DIR}/map'
    import { config } from '${GENERATED_DIR}/config'

    import { browser } from '${PKG_NAME}/render/env/browser'
    
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
  `.trim()
}
