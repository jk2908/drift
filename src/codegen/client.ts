import { GENERATED_DIR, PKG_NAME } from '../config'

export function createClient() {
	return `
    /// <reference types="bun" />

    import { StrictMode } from 'react'
    import { hydrateRoot, createRoot } from 'react-dom/client'
    import { hc } from 'hono/client'

    import type { App } from '${GENERATED_DIR}/server'
    import { manifest } from '${GENERATED_DIR}/manifest'
    import { config } from '${GENERATED_DIR}/config'

    import { HYDRATE_ID } from '${PKG_NAME}/config'
    
    import { Router, RouterProvider } from '${PKG_NAME}/shared/router'
    import { merge } from '${PKG_NAME}/shared/metadata'
    import { getRelativeBasePath } from '${PKG_NAME}/shared/utils'

    import { getHydrationData } from '${PKG_NAME}/client/hydration'
    import { Runtime } from '${PKG_NAME}/client/runtime'
    
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
        const metadata = merge(
          config.metadata ?? {},
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
