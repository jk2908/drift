import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type ConfigEnv, defineConfig } from 'vite'

import drift from '@jk2908/drift'
import tsconfigPaths from 'vite-tsconfig-paths'

const resolver = (p: string) => resolve(dirname(fileURLToPath(import.meta.url)), p)

console.log(drift)

export default defineConfig((ctx: ConfigEnv) => {
	return {
		plugins: [
			drift({
				ctx,
				prerender: 'full',
				metadata: {
					title: '%s - jk2908',
					meta: [
						{
							name: 'random',
							content: 'This is a random meta tag for testing purposes',
						},
					],
				},
			}),
			tsconfigPaths(),
		],
		resolve: {
			alias: {
				'#': resolver('./'),
			},
		},
	}
})
