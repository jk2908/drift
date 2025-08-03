export async function browser() {
  /*
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
                Shell({
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
              Shell({ children: el, assets, metadata })
            }
          </RouterProvider>
        </StrictMode>,
      )
    }*/
}