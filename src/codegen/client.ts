import type { Config } from '../types'

export function createClient({ config }: { config: Config }) {
	return `
    import { StrictMode } from 'react'
    import { hydrateRoot, createRoot } from 'react-dom/client'
    import { hc } from 'hono/client'

    import type { App } from '@jk2908/drift/server'
    import { runtime } from '@jk2908/drift/runtime'

    import { HYDRATE_ID } from '../plugins/drift/config'
    import { router, RouterProvider } from '../plugins/drift/router'
    import { merge } from '../plugins/drift/metadata'
    
    export const client = hc<App>(import.meta.env.VITE_APP_URL)

    function getData() {
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
      const data = getData()
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
        const fallback = router.fallback
        const metadata = merge(
          ${JSON.stringify(config.metadata ?? {})},
          await fallback.metadata?.({ error })
        )

        createRoot(document).render(
          <StrictMode>
            <RouterProvider 
              router={router}
              initial={{ match: null, metadata }}>
              {({ el, metadata }) => (
                render({
                  children: el ?? <fallback.Component error={error} />, assets, metadata,
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
