import path from 'node:path'
import { APP_DIR, ENTRY_SERVER, ENTRY_CLIENT, GENERATED_DIR } from '../constants'

export async function createAppEntries() {
	const cwd = process.cwd()

	const generatedDir = path.join(cwd, GENERATED_DIR)
	const serverEntry = path.join(generatedDir, ENTRY_SERVER)
	const clientEntry = path.join(generatedDir, ENTRY_CLIENT)
	const rootLayoutImport = `../${APP_DIR}/layout`

	const promises: Promise<number>[] = []

	promises.push(
		Bun.write(
			serverEntry,
			`
        import { handle } from 'drift/server';
        import RootLayout from '${rootLayoutImport}';

        const app = handle(({ children, assets, metadata }) =>
          <RootLayout assets={assets} metadata={metadata}>
            {children}
          </RootLayout>
        );

        export default app;
      `.trim(),
		),
	)

	promises.push(
		Bun.write(
			clientEntry,
			`
        import { mount } from 'drift/client';
        import RootLayout from '${rootLayoutImport}';

        mount(({ children, assets, metadata }) =>
          <RootLayout assets={assets} metadata={metadata}>
            {children}
          </RootLayout>
        );
      `.trim(),
		),
	)

	return promises
}
