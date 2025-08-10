import { GENERATED_DIR, PKG_NAME } from '../config'

import type { Handlers, Imports } from '../build/route-processor'

export function createServer(imports: Imports, handlers: Handlers) {
	return `
    /// <reference types="bun" />

    import { Hono } from 'hono'
    import { serveStatic } from 'hono/bun'
    import { trimTrailingSlash, appendTrailingSlash } from 'hono/trailing-slash'

    import { manifest } from '${GENERATED_DIR}/manifest'
    import { config } from '${GENERATED_DIR}/config'

    import { ssr } from '${PKG_NAME}/render/ssr'

    ${[...imports.apis.static.entries()]
			.map(([key, value]) => `import { ${key} } from '${value}'`)
			.join('\n')}

    export function handle(
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
      return new Hono()
        .use(
          '/assets/*', 
          serveStatic({ 
            root: config.outDir,
            onFound(_path, c) {
              c.header('Cache-Control', 'public, immutable, max-age=31536000')
            },
            precompressed: config.precompress,
          }))
        .use(!config.trailingSlash ? trimTrailingSlash() : appendTrailingSlash())
        ${[...handlers.entries()].map(([, { handler }]) => handler).join('\n')}
    }

    export type App = ReturnType<typeof handle>
  `.trim()
}
