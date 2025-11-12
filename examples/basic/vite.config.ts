import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type ConfigEnv, defineConfig, type Plugin } from 'vite'

import drift from '@jk2908/drift'
import tsconfigPaths from 'vite-tsconfig-paths'

const resolver = (p: string) => resolve(dirname(fileURLToPath(import.meta.url)), p)

export default defineConfig((ctx: ConfigEnv) => {
	return {
		plugins: [
			drift({
				app: {
					url: 'http://localhost:8787',
				},
				ctx,
				prerender: 'declarative',
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
		].flat() as Plugin[],
		server: {
			middlewareMode: true,
		},
		resolve: {
			alias: {
				'#': resolver('./'),
			},
		},
	}
})
