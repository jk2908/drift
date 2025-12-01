import { NAME as PKG } from '../config'

/**
 * Drift custom event class
 */
export class DriftEvent extends CustomEvent<any> {
	constructor(name: string, detail?: unknown) {
		super(`${PKG}${name}`, { detail })
	}
}
