import { $ } from 'bun'

import type { BuildContext } from '../types'

/**
 * Format the code in a directory using Biome
 * @param dir - the directory to format
 * @returns void
 */
export async function format(dir: string, ctx: BuildContext) {
	try {
		const pattern = `${dir}/`
		await $`bunx @biomejs/biome format --write ${pattern}`.quiet()
	} catch (err) {
		ctx.logger.error(`[format:${dir}]`, err)
    throw err
	}
}
