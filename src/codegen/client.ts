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

    import type { App } from './server'
    
    export const client = hc<App>(config.app?.url ?? import.meta.env.VITE_APP_URL)
  `.trim()
}
