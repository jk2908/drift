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

        import { rsc } from '${PKG_NAME}/render/env/rsc'

        import { manifest } from './manifest'
        import { map } from './map'
        import { config } from './config'

        import Shell from '${shellImport}'

        export default async function(req: Request) {
          const url = new URL(req.url)

          if (url.pathname.endsWith('.rsc')) {
            return rsc(
              req, 
              ({ children, assets, metadata }: {
                children: React.ReactNode
                assets: React.ReactNode
                metadata: React.ReactNode
              }) => ${Shell},
              manifest, 
              map, 
              config
            )
          }

          const ssr = await import.meta.viteRsc.loadModule<typeof import('./entry.ssr.tsx')>('ssr', 'index')
          return ssr.default.fetch(req)
        }
        
        if (import.meta.hot) import.meta.hot.accept()
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

        import { mount } from './client'

        import Shell from '${shellImport}'

        mount(({ children, assets, metadata }) =>
          ${Shell}
        )
      `.trim(),
		),
	)

	return scaffold
}
