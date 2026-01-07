import { constants } from 'node:fs'
import { access, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'

import type { AdapterFactory, RuntimeAdapter, ServeOptions, Server } from './types'

class NodeAdapter implements RuntimeAdapter {
	constructor(private options: NodeAdapterOptions = {}) {}

	async read(path: string) {
		return await readFile(path, 'utf-8')
	}

	async write(path: string, content: string) {
		await writeFile(path, content, 'utf-8')
	}

	async exists(path: string) {
		try {
			await access(path, constants.F_OK)
			return true
		} catch {
			return false
		}
	}

	async serve(options: ServeOptions): Promise<Server> {
		const server = createServer(async (req, res) => {
			const url = new URL(req.url ?? '', `http://${req.headers.host}`)

			let body: BodyInit | null = null

			if (req.method !== 'GET' && req.method !== 'HEAD') {
				const chunks: Buffer[] = []
				for await (const chunk of req) {
					chunks.push(chunk)
				}
				body = Buffer.concat(chunks)
			}

			const request = new Request(url, {
				method: req.method,
				headers: req.headers as any,
				body,
			})

			try {
				const response = await options.fetch(request)
				res.statusCode = response.status

				response.headers.forEach((value, key) => {
					res.setHeader(key, value)
				})

				if (response.body) {
					const reader = response.body.getReader()
					const pump = async () => {
						const { done, value } = await reader.read()

						if (done) {
							res.end()
							return
						}
						res.write(value)

						await pump()
					}
					await pump()
				} else {
					res.end()
				}
			} catch {
				res.statusCode = 500
				res.end('Internal Server Error')
			}
		})

		return new Promise(resolve => {
			server.listen(options.port, () => {
				resolve({
					stop: () => server.close(),
				})
			})
		})
	}

	async scan(code: string) {
		const exports: string[] = []
		const imports: string[] = []

		try {
			const exportPatterns = [
				/export\s+(?:const|let|var|function|class|async\s+function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
				/export\s+\{\s*([^}]+)\s*\}/g,
				/export\s+default\s/g,
			]

			const importPatterns = [
				/import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g,
				/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
			]

			const namedMatches = code.matchAll(exportPatterns[0])

			for (const match of namedMatches) {
				exports.push(match[1])
			}

			const exportListMatches = code.matchAll(exportPatterns[1])

			for (const match of exportListMatches) {
				const exportList = match[1]
					.split(',')
					.map(exp => {
						const parts = exp.trim().split(/\s+as\s+/)
						return parts[0].trim()
					})
					.filter(exp => exp.length > 0)
				exports.push(...exportList)
			}

			if (exportPatterns[2].test(code)) {
				exports.push('default')
			}

			for (const pattern of importPatterns) {
				const matches = code.matchAll(pattern)
				for (const match of matches) {
					imports.push(match[1])
				}
			}

			return {
				exports: [...new Set(exports)],
				imports: [...new Set(imports)],
			}
		} catch {
			return { exports: [], imports: [] }
		}
	}

	get env() {
		return process.env
	}

	exit(code: number): never {
		process.exit(code)
	}
}

export type NodeAdapterOptions = {}

export const nodeAdapter: AdapterFactory = (options?: NodeAdapterOptions) => {
	return new NodeAdapter(options)
}
