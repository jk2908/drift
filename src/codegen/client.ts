import type { PluginConfig } from '../types'

import { GENERATED_DIR, PKG_NAME } from '../config'

export function createClient({ config }: { config: PluginConfig }) {
	return `
    /// <reference types="bun" />

    import { StrictMode } from 'react'
    import { hydrateRoot, createRoot } from 'react-dom/client'
    import { hc } from 'hono/client'

    import type { App } from '${GENERATED_DIR}/server'
    import { runtime } from '${GENERATED_DIR}/runtime'
    import { manifest } from '${GENERATED_DIR}/manifest'

    import { HYDRATE_ID } from '${PKG_NAME}/config'
    import { Router, RouterProvider } from '${PKG_NAME}/shared/router'
    import { merge } from '${PKG_NAME}/shared/metadata'
    
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
          ${JSON.stringify(config.metadata ?? {})},
          {}
        )

        createRoot(document).render(
          <StrictMode>
            <RouterProvider 
              router={router}
              initial={{ match: null, metadata }}>
              {({ el, metadata }) => (
                render({
                  children: null
                })
              )}
            </RouterProvider>
          </StrictMode>,
        )
        return
      }

      const { metadata } = rest
      
      hydrateRoot(
        document,
        <StrictMode>
          <RouterProvider 
            router={router} 
            initial={{ match, metadata }}>
            {({ el, metadata }) =>
              render({ children: el, assets, metadata })
            }
          </RouterProvider>
        </StrictMode>,
      )
    }
  `.trim()
}
