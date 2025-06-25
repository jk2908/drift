import fs from 'node:fs/promises'
import path from 'node:path'

import { APP_DIR } from '../constants'

/**
 * Compose the tree of the server
 * @param dir - The directory to compose the tree from
 * @param extensions - The extensions to compose the tree from
 * @param results - The results to compose the tree from
 * @param prev - The previous results to compose the tree from
 */
export async function compose(
	dir: string,
	extensions: {
		pages: string[]
		apis: string[]
	},
	results: { pages: Array<{ page: string; layouts: string[] }>; apis: string[] } = {
		pages: [],
		apis: [],
	},
	prev: string[] = [],
) {
	const files = await fs.readdir(dir)
	const cwd = process.cwd()

	let curr: string | null = null

	for (const file of files) {
		const route = path.join(dir, file)
		const stat = await fs.stat(route)

		if (stat.isDirectory()) {
			const next = curr ? [...prev, curr] : prev
			await compose(route, extensions, results, next)
		} else {
			const ext = path.extname(file)
			const base = path.basename(file)
			const relative = path.relative(cwd, route).replace(/\\/g, '/')

			if (base === 'layout.tsx' || base === 'layout.jsx') {
				curr = relative
			}

			if (relative.startsWith(`${APP_DIR}/api/`)) {
				if (extensions.apis.includes(ext)) {
					results.apis.push(relative)
				}
			} else {
				if (
					extensions.pages.includes(ext) &&
					(base === 'page.tsx' || base === 'page.jsx')
				) {
					const layouts = curr ? [...prev, curr] : prev
					results.pages.push({ page: relative, layouts })
				}
			}
		}
	}

	return results
}
