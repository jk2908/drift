import path from 'node:path'

import { APP_DIR, ENTRY_BROWSER, ENTRY_RSC, ENTRY_SSR, GENERATED_DIR, PKG_NAME } from '../config'

import { AUTO_GEN_MSG } from './utils'

/**
 * Generates the essential scaffold files required to run the application
 * @returns a promise that resolves when the scaffold files have been created
 */
export async function createScaffold() {
	const cwd = process.cwd()

	const generatedDir = path.join(cwd, GENERATED_DIR)
	const shellImport = `../${APP_DIR}/+layout`

	const scaffold: Promise<number>[] = []

	const Shell = `
    <Shell assets={assets} metadata={metadata}>
      {children}
    </Shell>
  `

  scaffold.push(
    Bun.write(  
      path.join(generatedDir, ENTRY_RSC),
      `
        ${AUTO_GEN_MSG}

        import type { ReactFormState } from 'react-dom/client'

        import { rsc, action } from '${PKG_NAME}/render/env/rsc'

        import { manifest } from './manifest'
        import { map } from './map'
        import { config } from './config'

        import Shell from '${shellImport}'

        export default async function(req: Request) {
          const opts: {
            rsc: {
              formState: ReactFormState | undefined
              temporaryReferences: unknown
              returnValue: unknown
            }
          } = {
            rsc: {
              formState: undefined,
              temporaryReferences: undefined,
              returnValue: undefined,
            }
          }

          if (req.method === 'POST') {
            opts.rsc = await action(req, { config })
          }

          const rscStream = await rsc(req, Shell, {
            manifest,
            map,
            config,
            ...opts,
          })

         	if (!req.headers.get('accept')?.includes('text/html')) {
            return new Response(rscStream, {
              headers: {
                'Content-Type': 'text/x-component;charset=utf-8',
                vary: 'accept',
              },
            })
          }

          const htmlStream = (await import.meta.viteRsc.loadModule<
            typeof import('./entry.ssr.tsx')
          >('ssr', 'index')).ssr(rscStream, { formState })

          return new Response(htmlStream, {
            headers: {
              'Content-Type': 'text/html',
              vary: 'accept',
            },
          })
        }
      `.trim(),
    ),
  )

	scaffold.push(
		Bun.write(
			path.join(generatedDir, ENTRY_SSR),
			`
        ${AUTO_GEN_MSG}

        import { handle } from './server'

        import Shell from '${shellImport}'

        const app = handle(({ children, assets, metadata }) =>
          ${Shell}
        )

        export default app
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
