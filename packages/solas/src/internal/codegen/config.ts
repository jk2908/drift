import type { PluginConfig } from '../../types.js'
import { Solas } from '../../solas.js'
import { AUTOGEN_MSG, source, toSourceLiteral } from './utils.js'

/**
 * Generates the code to create an exported config object
 */
export function writeConfig(config: PluginConfig) {
	const { runtime: _runtime, ...runtimeConfig } = config
	const loggerLevel = config.logger?.level
	const importLines = [
		`import type { RuntimeConfig } from '${Solas.Config.PKG_NAME}'`,
		loggerLevel ? `import { Logger } from '${Solas.Config.PKG_NAME}/utils/logger'` : '',
	]
		.filter(Boolean)
		.join('\n')
	const configStatement = `const config = ${toSourceLiteral(runtimeConfig)} as const satisfies RuntimeConfig`
	const loggerStatement = loggerLevel
		? `Logger.defaultLevel = ${toSourceLiteral(loggerLevel)}`
		: ''

	return source`
		${AUTOGEN_MSG}

		${importLines}

		${configStatement}
		${loggerStatement}

		export { config }
	`
}
