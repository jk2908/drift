import type { PluginConfig } from '../types'

import { PKG_NAME } from '../config'

import { AUTO_GEN_MSG } from './utils'

/**
 * Generates the code to create an exported config object
 * @param config<PluginConfig> - the plugin configuration
 * @returns the stringified code
 */
export function writeConfig(config: PluginConfig) {
	return `
    ${AUTO_GEN_MSG}

    import type { PluginConfig } from '${PKG_NAME}'
    
    export const config = 
      ${JSON.stringify(config, null, 2)} as const satisfies PluginConfig
  `.trim()
}
