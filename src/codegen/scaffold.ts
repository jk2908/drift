import path from 'node:path'

import { APP_DIR, ENTRY_CLIENT, ENTRY_SERVER, GENERATED_DIR } from '../config'

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
			path.join(generatedDir, ENTRY_SERVER),
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
			path.join(generatedDir, ENTRY_CLIENT),
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
