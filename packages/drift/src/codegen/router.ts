import type { Endpoint, Manifest, Segment } from '../types'

import { EntryKind, type Imports } from '../build/route-processor'

import { AUTOGEN_MSG } from './utils'

/**
 * Generates the exported server-side code for creating the Bun router
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

    import type { Server } from 'bun'

    import { handler as rsc } from './entry.rsc'
    import { config } from './config'

    ${[...imports.endpoints.static.entries()]
			.map(([key, value]) => {
				const [, method] = key.split('_')

				return `import { ${method.toUpperCase()} as ${key}} from '${value}'`
			})
			.join('\n')}

    function normalizePath(pathname: string) {
      if (!config.trailingSlash) {
        return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
      }

      if (pathname === '/') return pathname

      return pathname.endsWith('/') ? pathname : pathname + '/'
    }

    export function createRouter() {
      const routes = {
        '/assets/*': async (req: Request) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            return new Response('Not Found', { status: 404 })
          }

          const pathname = new URL(req.url).pathname
          const assetPath = pathname.startsWith('/assets/') ? pathname.slice(8) : pathname
          const outDir = config.outDir.endsWith('/') ? config.outDir.slice(0, -1) : config.outDir
          const filePath = outDir + '/' + assetPath
          const brotliFile =
            config.precompress && (req.headers.get('accept-encoding') ?? '').includes('br')
              ? Bun.file(filePath + '.br')
              : null
          const file = brotliFile && (await brotliFile.exists()) ? brotliFile : Bun.file(filePath)

          if (!(await file.exists())) {
            return new Response('Not Found', { status: 404 })
          }

          const res = new Response(file)
          res.headers.set('Cache-Control', 'public, immutable, max-age=31536000')

          if (brotliFile && file === brotliFile) {
            res.headers.set('Content-Encoding', 'br')
          }

          return res
        },
        ${[...handlers.entries()]
					.map(([, group]) => {
						if (!Array.isArray(group)) {
							if (group.__kind === EntryKind.ENDPOINT && group.method !== 'get') {
								return ''
							}

							return group.__kind === EntryKind.PAGE
								? `'${group.__path}': (req: Request) => rsc(req)`
								: `'${group.__path}': (req: Request) => ${group.__id}(req)`
						}

						if (group.length > 2) throw new Error('Unexpected group length')

						const id = group.find(e => e.__kind === EntryKind.ENDPOINT)?.__id
						const path = group[0].__path

						return `'${path}': async (req: Request) => {
              const accept = req.headers.get('accept') ?? ''

              if (accept.includes('text/html') || accept.includes('text/x-component')) {
                return rsc(req)
              }

              if (!${id}) {
                throw new Error('Unified handler missing implementation')
              }

              return ${id}(req)
            }`
					})
					.filter(Boolean)
					.join(',\n        ')}
      } satisfies Record<string, (req: Request) => Response | Promise<Response>>

      const router = {
        routes,
        fetch(req: Request) {
          const url = new URL(req.url)
          const normalized = normalizePath(url.pathname)

          if (normalized !== url.pathname) {
            url.pathname = normalized
            req = new Request(url.toString(), req)
          }

          const handler = routes[normalized]
          if (handler && req.method === 'GET') {
            return handler(req)
          }

          ${[...handlers.entries()]
						.map(([, group]) => {
							if (Array.isArray(group)) {
								return ''
							}

							if (group.__kind === EntryKind.ENDPOINT && group.method !== 'get') {
								return `if (normalized === '${group.__path}' && req.method === '${group.method.toUpperCase()}') return ${group.__id}(req)`
							}

							return ''
						})
						.filter(Boolean)
						.join('\n          ')}

          return rsc(req)
        },
      }

      return router
    }



    export type App = Server
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
