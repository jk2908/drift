import path from 'node:path'

import { APP_DIR, ENTRY_CLIENT, ENTRY_SERVER, GENERATED_DIR } from '../config'

export async function createScaffold() {
	const cwd = process.cwd()

	const generatedDir = path.join(cwd, GENERATED_DIR)
	const shellImport = `../${APP_DIR}/+layout`

	const scaffold: Promise<number>[] = []

	scaffold.push(
		Bun.write(
			path.join(generatedDir, ENTRY_SERVER),
			`
        import { handle } from '${GENERATED_DIR}/server'

        import Shell from '${shellImport}'

        const app = handle(({ children, assets, metadata }) =>
          <Shell assets={assets} metadata={metadata}>
            {children}
          </Shell>
        )

        export default app
      `.trim(),
		),
	)

	scaffold.push(
		Bun.write(
			path.join(generatedDir, ENTRY_CLIENT),
			`
        import { mount } from '${GENERATED_DIR}/client'

        import Shell from '${shellImport}'

        mount(({ children, assets, metadata }) =>
          <Shell assets={assets} metadata={metadata}>
            {children}
          </Shell>
        )
      `.trim(),
		),
	)

	return scaffold
}
