export namespace Runtime {
	export type Impl = {
		exists: (filePath: string) => Promise<boolean>
		readText: (filePath: string) => Promise<string>
		readBuffer: (filePath: string) => Promise<ArrayBuffer>
		mimeType: (filePath: string) => string
		write: (filePath: string, content: string | NodeJS.ArrayBufferView) => Promise<void>
		hash: (value: string) => string
	}
}

export abstract class RuntimeBase implements Runtime.Impl {
	abstract exists(filePath: string): Promise<boolean>
	abstract readText(filePath: string): Promise<string>
	abstract readBuffer(filePath: string): Promise<ArrayBuffer>
	abstract mimeType(filePath: string): string
	abstract write(
		filePath: string,
		content: string | NodeJS.ArrayBufferView,
	): Promise<void>
	abstract hash(value: string): string
}

export class Runtime {
	static #runtime?: Runtime.Impl

	static set runtime(runtime: Runtime.Impl) {
		this.#runtime = runtime
	}

	static get runtime() {
		if (!this.#runtime) {
			throw new Error(
				'No runtime configured. Please set the runtime implementation before using runtime methods.',
			)
		}

		return this.#runtime
	}

	static exists(filePath: string) {
		return this.runtime.exists(filePath)
	}

	static readText(filePath: string) {
		return this.runtime.readText(filePath)
	}

	static readBuffer(filePath: string) {
		return this.runtime.readBuffer(filePath)
	}

	static mimeType(filePath: string) {
		return this.runtime.mimeType(filePath)
	}

	static write(filePath: string, content: string | NodeJS.ArrayBufferView) {
		return this.runtime.write(filePath, content)
	}

	static hash(value: string) {
		return this.runtime.hash(value)
	}
}
