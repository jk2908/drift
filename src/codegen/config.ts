import type { PluginConfig } from '../types'

import { PKG_NAME } from '../config'

export function createConfig(config: PluginConfig) {
	return `
    import type { PluginConfig } from '${PKG_NAME}'
    
    export const config = 
      ${JSON.stringify(config, null, 2)} as const satisfies PluginConfig`
}
