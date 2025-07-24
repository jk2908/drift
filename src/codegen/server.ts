import type { PluginConfig } from '../types'

import { GENERATED_DIR, NAME, PKG_NAME } from '../config'

import type { Handlers, Imports } from '../build/route-processor'

export function createServer({
	imports,
	apiHandlers,
	config,
}: {
	imports: Imports['apis']['static']
	apiHandlers: Handlers
	config: PluginConfig
}) {
	return `
    /// <reference types="bun" />

    import path from 'node:path'

    import { renderToReadableStream } from 'react-dom/server.browser'

    import { Hono } from 'hono'
    import { serveStatic } from 'hono/bun'
    import { ${!config.trailingSlash ? 'trimTrailingSlash' : 'appendTrailingSlash'} as trailingSlash } from 'hono/trailing-slash'
    import { isbot } from 'isbot'

    import { runtime } from '${GENERATED_DIR}/runtime'
    import { manifest } from '${GENERATED_DIR}/manifest'

    import { HYDRATE_ID } from '${PKG_NAME}/config'

    import { Logger } from '${PKG_NAME}/shared/logger'
    import { Router, RouterProvider } from '${PKG_NAME}/shared/router'
    import { Redirect } from '${PKG_NAME}/shared/redirect'
    import { HTTPException } from '${PKG_NAME}/shared/error'
    import { merge } from '${PKG_NAME}/shared/metadata'

    ${[...imports.entries()].map(([key, value]) => `import { ${key} } from '${value}'`).join('\n')}

    const router = new Router(manifest)
    const logger = new Logger('${(config.logger?.level ?? Bun.env.PROD) ? 'error' : 'debug'}')

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
        .use(trailingSlash())
        ${apiHandlers.join('\n')}
        .get('*', async c => {
          let controller: AbortController | null = new AbortController()
          let caughtError = null

          if (c.req.path.startsWith('/.well-known/appspecific/com.chrome.devtools.json')) {
            return c.body(null, 204)
          }

          try {
            const match = router.match(c.req.path)
            if (!match) throw new HTTPException(404, 'Not Found')

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
                  logger.error(Logger.print(err), err)
                  caughtError = err
                }
              },
            )

            if (caughtError) throw caughtError
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
              err && err instanceof Redirect
            ) {
              logger.info(\`redirecting to \${err.url}\`)

              controller?.abort()
              controller = null
              caughtError = null

              return c.redirect(err.url, err.status)
            }

            if (
              err && err instanceof HTTPException
            ) {
              logger.error(Logger.print(err), err)

              controller?.abort()
              controller = null
              caughtError = null

              const metadata = merge(
                ${JSON.stringify(config.metadata ?? {})},
                {}
              )
              const data = JSON.stringify({ metadata, error: err })

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
                        children: null,
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

            logger.error(Logger.print(err), err)

            controller?.abort()
            controller = null
            caughtError = null

            return c.text('${NAME}: internal server error', 500)
          }
        })

        return app
    }

    export type App = ReturnType<typeof handle>
  `.trim()
}
