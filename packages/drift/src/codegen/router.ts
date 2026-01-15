import type { Endpoint, Manifest, Segment } from '../types'

import { EntryKind, type Imports } from '../build/route-processor'

import { AUTOGEN_MSG } from './utils'

/**
 * Generates the exported server-side code for creating the Hono app
 * with all the routes and handlers defined in the manifest
 * @param manifest - the application manifest
 * @param imports - the imported modules
 * @returns the stringified code
 */
export function writeRouter(manifest: Manifest, imports: Imports) {
	const handlers = createHandlerGroups(manifest)

	return `
    ${AUTOGEN_MSG}

    /// <reference types="bun" />

    import {
      Hono,
      hc,
      serveStatic,
      trimTrailingSlash,
      appendTrailingSlash,
    } from '@jk2908/drift/_internal/hono'

    import { handler as rsc } from './entry.rsc'
    import { config } from './config'

    ${[...imports.endpoints.static.entries()]
			.map(([key, value]) => {
				const [, method] = key.split('_')

				return `import { ${method.toUpperCase()} as ${key}} from '${value}'`
			})
			.join('\n')}

    /**
     * Creates a Hono app instance with all routes and handlers wired up
     * @returns the Hono app
     */
    export function createRouter() {
      return new Hono()
        .use(!config.trailingSlash ? trimTrailingSlash() : appendTrailingSlash())
        .use(
          '/assets/*', 
          serveStatic({ 
            root: config.outDir,
            onFound(_path, c) {
              c.header('Cache-Control', 'public, immutable, max-age=31536000')
            },
            precompressed: config.precompress,
          }))
        ${[...handlers.entries()]
					.map(([, group]) => {
						if (!Array.isArray(group)) {
							return group.__kind === EntryKind.PAGE
								? `.${group.method}('${group.__path}', async c => rsc(c.req.raw))`
								: `.${group.method}('${group.__path}', ${group.__id})`
						}

						if (group.length > 2) throw new Error('Unexpected group length')

						const id = group.find(e => e.__kind === EntryKind.ENDPOINT)?.__id
						const path = group[0].__path

						return `.get('${path}', async c => {
              const accept = c.req.header('accept') ?? ''

              if (accept.includes('text/html') || accept.includes('text/x-component')) {
                return rsc(c.req.raw)
              }

              if (!${id}) {
                throw new Error('Unified handler missing implementation')
              }

              // handler might be called with no args so 
              // ignore to prevent red squigglies
              // @ts-expect-error
              return ${id}(c)
            })`
					})
					.join('\n')}
        .notFound(c => rsc(c.req.raw))
    }

    export type App = ReturnType<typeof createRouter>    
    export const client = hc<App>(config.app?.url ?? import.meta.env.VITE_APP_URL)
  `.trim()
}

function createHandlerGroups(manifest: Manifest) {
	return Object.values(manifest)
		.flat()
		.reduce<Map<string, Segment | Endpoint | (Segment | Endpoint)[]>>((acc, entry) => {
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
