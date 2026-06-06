import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'

import { lookup } from 'mime-types'

import { RuntimeBase } from '../internal/runtimes/runtime.js'
import { Solas } from '../solas.js'

export class RuntimeNode extends RuntimeBase {
	readonly name = 'node' as const
	readonly module = `${Solas.Config.PKG_NAME}/adapters/node`

	async exists(filePath: string) {
		try {
			await fs.access(filePath)
			return true
		} catch {
			return false
		}
	}

	readText(filePath: string) {
		return fs.readFile(filePath, 'utf-8')
	}

	async readBuffer(filePath: string) {
		const buffer = await fs.readFile(filePath)
		return buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		) as ArrayBuffer
	}

	mimeType(filePath: string) {
		return lookup(filePath) || 'application/octet-stream'
	}

	async write(filePath: string, content: string | NodeJS.ArrayBufferView) {
		await fs.writeFile(filePath, content)
	}

	hash(value: string) {
		return createHash('sha256').update(value).digest('hex').slice(0, 16)
	}
}
