import { RuntimeBase } from './runtime.js'

export class RuntimeBun extends RuntimeBase {
	async exists(filePath: string) {
		return Bun.file(filePath).exists()
	}

	readText(filePath: string) {
		return Bun.file(filePath).text()
	}

	readBuffer(filePath: string) {
		return Bun.file(filePath).arrayBuffer()
	}

	mimeType(filePath: string) {
		return Bun.file(filePath).type || 'application/octet-stream'
	}

	async write(filePath: string, content: string | NodeJS.ArrayBufferView) {
		// normalise wider arraybuffer views into a shape Bun.write accepts directly
		await Bun.write(
			filePath,
			typeof content === 'string'
				? content
				: content instanceof Uint8Array
					? content
					: new Uint8Array(content.buffer, content.byteOffset, content.byteLength),
		)
	}

	hash(value: string) {
		const hash = Bun.hash(value)

		// Bun.hash returns an integer-like value, so keep it in BigInt space and avoid
		// precision loss. Clamp it to an unsigned 64-bit value before hex
		// formatting. Pad to 16 chars to match the Node runtime
		// output shape
		return BigInt.asUintN(64, typeof hash === 'bigint' ? hash : BigInt(hash))
			.toString(16)
			.padStart(16, '0')
	}
}
