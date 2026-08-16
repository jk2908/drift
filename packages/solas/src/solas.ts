import * as Config from './config.js'

export interface Routes {}

export function getVersion() {
	const value = (import.meta.env as Record<string, unknown>).SOLAS_VERSION

	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`[${Config.NAME}] Missing ${Config.NAME} package version`)
	}

	return value
}
