import path from 'node:path'

import type { BuildContext } from '../types'

import { INJECT_RUNTIME } from '../config'

/**
 * Inject the runtime into the server entry point
 * @param bundle - the bundle to inject the runtime into
 * @returns the code with the runtime injected
 */
export async function injectRuntime(
	bundle: {
		server?: { entryPath: string | null }
		client?: { entryPath: string | null }
	},
	ctx: BuildContext,
) {
	try {
		// @note: to be used inside closeBundle
		if (!bundle.server?.entryPath || !bundle.client?.entryPath) {
			throw new Error('no server or client entry path found, cannot inject runtime')
		}

		const serverEntry = Bun.file(path.resolve(process.cwd(), bundle.server.entryPath))
		const code = await serverEntry.text()
		const runtime = bundle.client.entryPath.replace(/\\/g, '/').split('/').pop()

		if (!runtime) throw new Error('no runtime found')

		return code.replaceAll(INJECT_RUNTIME, runtime)
	} catch (err) {
		ctx.logger.error('runtime:injectRuntime', err)
		throw err
	}
}
