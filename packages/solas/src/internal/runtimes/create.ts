import type { Runtime } from '../../types.js'
import { RuntimeBun } from './bun.js'
import { RuntimeNode } from './node.js'

export function createRuntime(runtime: Runtime) {
	if (
		runtime === 'bun' ||
		(runtime === 'auto' && typeof globalThis.Bun !== 'undefined')
	) {
		return new RuntimeBun()
	}

	return new RuntimeNode()
}
