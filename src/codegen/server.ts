import type { Config } from '../types'

export function createServer({
	imports,
	handlers,
	config,
}: {
	imports: Map<string, string>
	handlers: string[]
	config: Config
}) {
	return `
    import path from 'node:path'

    // @ts-expect-error
    import { renderToReadableStream } from 'react-dom/server.browser'

    import { Hono } from 'hono'
    import { serveStatic } from 'hono/bun'
    import { isbot } from 'isbot'

    import { runtime } from 'drift/runtime'

    import { router, RouterProvider } from '@jk2908/drift/router'
    import { $Redirect, REDIRECT_SYMBOL } from '@jk2908/drift/redirect'
    import { $error, $Error, ERROR_SYMBOL } from '@jk2908/drift/error'
    import { HYDRATE_ID } from '@jk2908/drift/config'
    import { merge } from '@jk2908/drift/metadata'

    ${[...imports.entries()].map(([key, value]) => `import { ${key} } from '${value}'`).join('\n')}

    export function handle(
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
      const app = 
        new Hono()
        .use(
          '/assets/*', 
          serveStatic({ 
            root: '${config.outDir}',
            onFound(_path, c) {
              c.header('Cache-Control', 'public, immutable, max-age=31536000')
            },
            precompressed: ${config.precompress},
          }))
        ${handlers.join('\n')}
        .get('*', async c => {
          let controller: AbortController | null = new AbortController()
          let error = null

          if (c.req.path.startsWith('/.well-known/appspecific/com.chrome.devtools.json')) {
            return c.body(null, 204)
          }

          try {
            const match = router.match(c.req.path)

            if (!match) $error(404, 'Not Found')

            if (match?.prerender && !import.meta.env.DEV && !Bun.env.PRERENDER) {
              const outPath =
                c.req.path === '/'
                  ? path.join(import.meta.dir, 'index.html')
                  : path.join(import.meta.dir, c.req.path, 'index.html')

              return c.html(await Bun.file(outPath).text())
            }

            const metadata = merge(
              ${JSON.stringify(config.metadata ?? {})},
              await match.metadata?.({ params: match.params })
            )
            const data = JSON.stringify({ config: ${JSON.stringify(config)}, metadata })

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

            const stream = await renderToReadableStream(
              <RouterProvider 
                router={router}
                initial={{ match, metadata }}>
                {({ el, metadata }) => (
                  render({ 
                    children: el, 
                    assets, 
                    metadata,
                  })
                )}
              </RouterProvider>,
              { 
                signal: controller?.signal,
                onError(err: unknown) {
                  console.error('drift:server:stream', err)
                  error = err
                }
              },
            )

            if (error) throw error
            if (isbot(c.req.header('User-Agent'))) await stream.allReady

            return c.body(stream, {
              status: 200,
              headers: {
                'Content-Type': 'text/html',
                'Transfer-Encoding': 'chunked',
              },
            })
          } catch (err) {
            if (
              err &&
              typeof err === 'object' &&
              REDIRECT_SYMBOL in err &&
              err instanceof $Redirect
            ) {
              console.log('drift:server:redirect', err.url, err.status)

              controller?.abort()
              controller = null
              error = null

              return c.redirect(err.url, err.status)
            }

            if (
              err &&
              typeof err === 'object' &&
              ERROR_SYMBOL in err &&
              err instanceof $Error
            ) {
              console.log('drift:error', err)

              controller?.abort()
              controller = null
              error = null

              const message =
                typeof err.error === 'string'
                  ? err.error
                  : typeof err.error === 'object' && 'message' in err.error
                    ? err.error.message
                    : JSON.stringify(err.error)

              const fallback = router.fallback
              const metadata = merge(
                ${JSON.stringify(config.metadata ?? {})},
                await fallback.metadata?.({ error: { ...err, message } })
              )
              const data = JSON.stringify({ metadata, error: { ...err, message } })

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

              return c.body(
                await renderToReadableStream(
                  <RouterProvider 
                    router={router}
                    initial={{ match: null, metadata }}>
                    {({ metadata }) => (
                      render({ 
                        children: 
                          <fallback.Component error={{ message, status: err.status }} />,
                        assets,
                        metadata,
                      })
                    )}
                  </RouterProvider>,
                ),
                {
                  status: err.status,
                  headers: {
                    'Content-Type': 'text/html',
                    'Transfer-Encoding': 'chunked',
                  },
                },
              )
            }

            console.error('drift:server:error', err)

            controller?.abort()
            controller = null
            error = null

            return c.text('drift: internal server error', 500)
          }
        })

        return app
    }

    export type App = ReturnType<typeof handle>
  `.trim()
}
