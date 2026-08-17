import type { ConfiguredPluginConfig } from '../../types.js'
import * as Config from '../../config.js'
import { AUTOGEN_MSG, source, toStringLiteral } from './utils.js'

/**
 * Generates the RSC entry code
 */
export function writeRSCEntry(_config: ConfiguredPluginConfig) {
	return source`
		${AUTOGEN_MSG}

		import { createHandler, loadManifest } from '${Config.PKG_NAME}/env/rsc'

		import { manifest } from './manifest.js'
		import { importMap } from './maps.js'
		import { config } from './config.js'

		const runtimeManifest = await loadManifest(${toStringLiteral(Config.OUT_DIR)})

		export default createHandler(config, manifest, importMap, runtimeManifest)

		if (import.meta.hot) {
			import.meta.hot.accept()
		}
	`
}

/**
 * Generates the SSR entry code
 */
export function writeSSREntry() {
	return source`
		${AUTOGEN_MSG}

		export { prerender, resume, ssr } from '${Config.PKG_NAME}/env/ssr'
	`
}

/**
 * Generates the browser entry code
 */
export function writeBrowserEntry() {
	return source`
		${AUTOGEN_MSG}

		import { browser } from '${Config.PKG_NAME}/env/browser'

		browser()
	`
}
