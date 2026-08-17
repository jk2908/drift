import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'

import { getMimeTypeFromPath } from './mime.js'

/**
 * A single filesystem/hash/mime implementation shared by every runtime.
 *
 * Bun runs the Node standard library natively, so there is no need for
 * per-runtime adapters: `node:fs` and `node:crypto` behave identically under
 * Bun and Node, and mime lookups go through the same table for both.
 */
export class Runtime {
	static async exists(filePath: string) {
		try {
			await fs.access(filePath)
			return true
		} catch {
			return false
		}
	}

	static readText(filePath: string) {
		return fs.readFile(filePath, 'utf-8')
	}

	static async readBuffer(filePath: string) {
		const buffer = await fs.readFile(filePath)
		return buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		) as ArrayBuffer
	}

	static mimeType(filePath: string) {
		return getMimeTypeFromPath(filePath)
	}

	static write(filePath: string, content: string | NodeJS.ArrayBufferView) {
		return fs.writeFile(filePath, content)
	}

	static hash(value: string) {
		return createHash('sha256').update(value).digest('hex').slice(0, 16)
	}
}
