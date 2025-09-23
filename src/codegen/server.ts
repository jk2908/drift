import type { Endpoint, Manifest, Page } from '../types'

import { EntryKind, PKG_NAME } from '../config'

import type { Imports } from '../build/route-processor'

import { AUTO_GEN_MSG } from './utils'

/**
 * Generates the exported server-side code for creating the Hono app
 * with all the routes and handlers defined in the manifest
 * @param manifest - the application manifest
 * @param imports - the imported modules
 * @returns the stringified code
 */
export function writeServer(manifest: Manifest, imports: Imports) {
	const handlers = createHandlerGroups(manifest)

	return `
    ${AUTO_GEN_MSG}

    /// <reference types="bun" />

    import { Hono } from 'hono'
    import { serveStatic } from 'hono/bun'
    import { trimTrailingSlash, appendTrailingSlash } from 'hono/trailing-slash'

    import { ssr } from '${PKG_NAME}/render/env/ssr'

    import { manifest } from './manifest'
    import { map } from './map'
    import { config } from './config'

    ${[...imports.endpoints.static.entries()]
			.map(([key, value]) => {
				const [, method] = key.split('_')

				return `import { ${method.toUpperCase()} as ${key}} from '${value}'`
			})
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
        ${[...handlers.entries()]
					.map(([route, group]) => {
						if (!Array.isArray(group)) {
							return group.__kind === EntryKind.PAGE
								? `.${group.method}('${group.__path}', async c => ssr(c, Shell, manifest, map, config))`
								: `.${group.method}('${group.__path}', ${group.__id})`
						}

						if (group.length > 2) throw new Error('Unexpected group length')

						const id = group.find(e => e.__kind === EntryKind.ENDPOINT)?.__id

						return `.get('/${route.split('/').pop()}', async c => {
            const accept = c.req.header('Accept') ?? ''

            if (accept.includes('text/html')) {
              return ssr(c, Shell, manifest, map, config)
            }

            if (!${id}) {
              throw new Error('Unified handler missing implementation')
            }

            // handler might be called with no args so 
            // ignore to prevent red squigglies
            // @ts-ignore
            return ${id}(c)
          })`
					})
					.join('\n')}
        .notFound(c => ssr(c, Shell, manifest, map, config))
    }

    export type App = ReturnType<typeof handle>
  `.trim()
}

function createHandlerGroups(manifest: Manifest) {
	return Object.values(manifest)
		.flat()
		.reduce<Map<string, Page | Endpoint | (Page | Endpoint)[]>>((acc, entry) => {
			const key = `${entry.method}/${entry.__path}`
			const existing = acc.get(key)

			if (!existing) {
				acc.set(key, entry)
			} else if (Array.isArray(existing)) {
				existing.push(entry)
			} else {
				acc.set(key, [existing, entry])
			}

			return acc
		}, new Map())
}
