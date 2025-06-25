import path from 'node:path'
import { INJECT_RUNTIME } from '../constants'

/**
 * Inject the runtime into the server entry point
 * @param bundle - The bundle to inject the runtime into
 * @returns The code with the runtime injected
 */
export async function injectRuntime(bundle: {
	server?: { entryPath: string | null }
	client?: { entryPath: string | null }
}) {
	// @note: to be used inside closeBundle
	if (!bundle.server?.entryPath || !bundle.client?.entryPath) {
		throw new Error(
			'framework:server:injectRuntime: no server or client entry path found, cannot inject runtime',
		)
	}

	const serverEntry = Bun.file(path.resolve(process.cwd(), bundle.server.entryPath))
	const code = await serverEntry.text()
	const runtime = bundle.client.entryPath.replace(/\\/g, '/').split('/').pop()

	if (!runtime) throw new Error('framework:server:injectRuntime: no runtime found')

	return code.replaceAll(INJECT_RUNTIME, runtime)
}
