import path from 'node:path'

import { ENTRY_BROWSER, ENTRY_RSC, ENTRY_SSR, GENERATED_DIR, PKG_NAME } from '../config'

import { AUTO_GEN_MSG } from './utils'

/**
 * Scaffolds entry files for RSC, SSR and browser environments
 * @returns a promise that resolves when the files have been created
 */
export async function createEntries() {
	const cwd = process.cwd()

	const generatedDir = path.join(cwd, GENERATED_DIR)

	const scaffold: Promise<number>[] = []

	scaffold.push(
		Bun.write(
			path.join(generatedDir, ENTRY_RSC),
			`
        ${AUTO_GEN_MSG}

        import type { ReactFormState } from 'react-dom/client'

        import { rsc, action } from '${PKG_NAME}/render/env/rsc'

        import { manifest } from './manifest'
        import { importMap } from './import-map'
        import { config } from './config'
        import { createRouter } from './router'

        export async function handler(req: Request) {
          let opts: {
            formState?: ReactFormState
            temporaryReferences?: unknown
            returnValue?: { ok: boolean; data: unknown }
          } = {
            formState: undefined,
            temporaryReferences: undefined,
            returnValue: undefined,
          }

          if (req.method === 'POST') opts = await action(req)

          const rscStream = await rsc(
            req, 
            manifest, 
            importMap, 
            config.metadata, 
            opts?.returnValue, 
            opts?.formState, 
            opts?.temporaryReferences,
          )

         	if (!req.headers.get('accept')?.includes('text/html')) {
            return new Response(rscStream, {
              headers: {
                'Content-Type': 'text/x-component;charset=utf-8',
                vary: 'accept',
              },
            })
          }

          const mod = await import.meta.viteRsc.loadModule<typeof import('./entry.ssr.tsx')>(
            'ssr',
            'index',
          )

          const htmlStream = await mod.ssr(rscStream, opts?.formState)
                    
          return new Response(htmlStream, {
            headers: {
              'Content-Type': 'text/html',
              vary: 'accept',
            },
          })
        }

        import.meta.hot?.accept()

        // this is the rsc entrypoint
        export default createHonoRouter()
      `.trim(),
		),
	)

	scaffold.push(
		Bun.write(
			path.join(generatedDir, ENTRY_SSR),
			`
        ${AUTO_GEN_MSG}
        
        export { ssr } from '${PKG_NAME}/render/env/ssr'
      `.trim(),
		),
	)

	scaffold.push(
		Bun.write(
			path.join(generatedDir, ENTRY_BROWSER),
			`
        ${AUTO_GEN_MSG}

        import { browser } from '${PKG_NAME}/render/env/browser'

        browser()
      `.trim(),
		),
	)

	return scaffold
}
