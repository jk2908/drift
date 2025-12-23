import type { AdapterFactory, RuntimeAdapter, ServeOptions } from './types'

class BunAdapter implements RuntimeAdapter {
	#transpiler = new Bun.Transpiler({ loader: 'tsx' })

	async read(path: string) {
		return await Bun.file(path).text()
	}

	async write(path: string, content: string) {
		await Bun.write(path, content)
	}

	async exists(path: string): Promise<boolean> {
		return await Bun.file(path).exists()
	}

	async serve(options: ServeOptions) {
		const server = Bun.serve({
			port: options.port,
			fetch: options.fetch,
		})

		return {
			stop: () => server.stop(),
		}
	}

	async scan(code: string): Promise<{ exports: string[]; imports: string[] }> {
		try {
			const result = this.#transpiler.scan(code)

			return {
				exports: result.exports,
				imports: result.imports.map(imp => imp.path),
			}
		} catch {
			return { exports: [], imports: [] }
		}
	}

	get env() {
		return Bun.env
	}

	exit(code: number): never {
		process.exit(code)
	}
}

export type BunAdapterOptions = {}

export const bunAdapter: AdapterFactory = (_options?: BunAdapterOptions) => {
	return new BunAdapter()
}
