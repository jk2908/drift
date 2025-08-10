import { GENERATED_DIR, PKG_NAME } from '../config'

export function createClient() {
	return `
    /// <reference types="bun" />

    import { hc } from 'hono/client'

    import type { App } from '${GENERATED_DIR}/server'
    import { manifest } from '${GENERATED_DIR}/manifest'
    import { config } from '${GENERATED_DIR}/config'

    import { browser } from '${PKG_NAME}/render/browser'
    
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
  `.trim()
}
