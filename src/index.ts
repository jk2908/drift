import fs from 'node:fs/promises'
import path from 'node:path'

import { loadEnv, type PluginOption } from 'vite'

import bunBuild from '@hono/vite-build/bun'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/bun'
import react from '@vitejs/plugin-react'

import type { BuildContext, PluginConfig } from './types'

import { writeConfig } from './codegen/config'
import {
	APP_DIR,
	ASSETS_DIR,
	DRIFT_PAYLOAD_ID,
	ENTRY_CLIENT,
	ENTRY_SERVER,
	GENERATED_DIR,
} from './config'

import { Logger } from './shared/logger'

import { writeServer } from './codegen/server'
import { compress } from './server/compress'
import { prerender } from './server/prerender'
import { injectRuntime } from './server/runtime'
import { format } from './server/utils'

import { writeClient } from './codegen/client'

import { RouteProcessor } from './build/route-processor'

import { writeManifest } from './codegen/manifest'
import { writeMap } from './codegen/map'
import { createScaffold } from './codegen/scaffold'

import { debounce } from './utils'

const DEFAULT_CONFIG = {
	precompress: true,
	prerender: 'declarative',
	outDir: 'dist',
	trailingSlash: false,
	logger: {
		level: Bun.env.PROD ? 'error' : 'debug',
	},
} as const satisfies Partial<PluginConfig>

function drift(c: PluginConfig): PluginOption[] {
	const config = { ...DEFAULT_CONFIG, ...c }

	if (!config.ctx) throw new Error('Vite context is required to be passed to the plugin')

	const transpiler = new Bun.Transpiler({ loader: 'tsx' })
	const logger = new Logger(config.logger.level)

	const env = loadEnv(config.ctx.mode, process.cwd(), '')

	const buildCtx: BuildContext = {
		outDir: config.outDir,
		bundle: {
			server: {
				entryPath: null,
				outDir: null,
			},
			client: {
				entryPath: null,
				outDir: null,
			},
		},
		transpiler,
		logger,
		prerenders: new Set<string>(),
	}

	async function build() {
		const cwd = process.cwd()
		const routesDir = path.join(cwd, APP_DIR)
		const generatedDir = path.join(cwd, GENERATED_DIR)

		await Promise.all([
			fs.mkdir(routesDir, { recursive: true }),
			fs.mkdir(generatedDir, { recursive: true }),
		])

		const processor = new RouteProcessor(buildCtx, config)

		const { manifest, prerenders, imports, modules } = await processor.run()

		buildCtx.prerenders = prerenders

		await Promise.all([
			Bun.write(path.join(generatedDir, 'config.ts'), writeConfig(config)),
			Bun.write(path.join(generatedDir, 'manifest.ts'), writeManifest(manifest)),
			Bun.write(path.join(generatedDir, 'map.ts'), writeMap(imports, modules)),
			Bun.write(path.join(generatedDir, 'server.tsx'), writeServer(manifest, imports)),
			Bun.write(path.join(generatedDir, 'client.tsx'), writeClient()),
			...(await createScaffold()),
		])

		await format(GENERATED_DIR, buildCtx)
	}

	const rebuild = debounce(build, 1000)

	return [
		{
			name: 'prebuild',
			enforce: 'pre',
			async buildStart() {
				await build()
			},
		},
		{
			name: 'drift',
			config(viteConfig) {
				if (config.ctx.mode === 'client') {
					return {
						...viteConfig,
						build: {
							...viteConfig.build,
							outDir: config.outDir,
							manifest: true,
							rollupOptions: {
								...(viteConfig.build?.rollupOptions || {}),
								input: {
									client: `/${GENERATED_DIR}/${ENTRY_CLIENT}`,
								},
								output: {
									...(viteConfig.build?.rollupOptions?.output || {}),
									entryFileNames: `${ASSETS_DIR}/[name]-[hash].js`,
								},
							},
						},
					}
				}

				return {
					...viteConfig,
					build: {
						...viteConfig.build,
						outDir: config.outDir,
					},
					server: {
						...viteConfig.server,
						port: 8787,
					},
					ssr: {
						...viteConfig.ssr,
						external: ['react', 'react-dom'],
					},
					define: {
						...viteConfig.define,
						'import.meta.env.APP_URL': JSON.stringify(process.env.APP_URL),
					},
					resolve: {
						alias: {
							...(viteConfig.resolve?.alias ?? {}),
							'.drift': path.resolve(process.cwd(), GENERATED_DIR),
						},
					},
				}
			},
			configureServer(server) {
				logger.info(`Watching for changes in ./${APP_DIR}...`)

				server.watcher
					.on('add', path => {
						if (path.includes(APP_DIR)) rebuild()
					})
					.on('change', path => {
						if (path.includes(APP_DIR)) rebuild()
					})
					.on('unlink', path => {
						if (path.includes(APP_DIR)) rebuild()
					})
			},
			async writeBundle(options, output) {
				if (config.ctx.mode === 'client' || env.NODE_ENV === 'development') return

				try {
					const viteManifest = Bun.file(
						path.resolve(
							process.cwd(),
							options.dir ?? config.outDir,
							'.vite/manifest.json',
						),
					)

					if (!(await viteManifest.exists())) {
						throw new Error('No manifest found, cannot get client hash')
					}

					const json = await viteManifest.json()
					const clientEntryPath = json[`${GENERATED_DIR}/${ENTRY_CLIENT}`].file

					buildCtx.bundle.client.entryPath = path.join(
						options.dir ?? config.outDir,
						clientEntryPath,
					)
					buildCtx.bundle.client.outDir = `${options.dir ?? config.outDir}/${ASSETS_DIR}`

					const serverEntryChunk = Object.entries(output).find(
						([_, chunk]) => chunk.type === 'chunk' && chunk.isEntry,
					)

					if (!serverEntryChunk) throw new Error('No server entry chunk found')

					const [serverEntryPath] = serverEntryChunk

					buildCtx.bundle.server.entryPath = path.join(
						options.dir ?? config.outDir,
						serverEntryPath,
					)
					buildCtx.bundle.server.outDir = options.dir ?? config.outDir
				} catch (err) {
					logger.error('server:writeBundle', err)
				}
			},
			async closeBundle() {
				if (config.ctx.mode === 'client' || env.NODE_ENV === 'development') return

				try {
					try {
						if (!buildCtx.bundle.server.entryPath) {
							throw new Error('No server entry path found')
						}

						await Bun.write(
							buildCtx.bundle.server.entryPath,
							await injectRuntime(buildCtx.bundle, buildCtx),
						)
					} catch (err) {
						logger.error('server:closeBundle:injectRuntime', err)
					}

					if (buildCtx.prerenders.size > 0) {
						Bun.env.PRERENDER = 'true'
						let server: ReturnType<typeof Bun.serve> | null = null

						try {
							if (!buildCtx.bundle.server.outDir || !buildCtx.bundle.server.entryPath) {
								throw new Error('No server outDir or entryPath found')
							}

							const app = (
								await import(`file://${Bun.file(buildCtx.bundle.server.entryPath).name}`)
							).default

							const PORT = Bun.env.PRERENDER_PORT || 8787
							logger.info(`server:closeBundle: starting server on ${PORT}`)

							server = Bun.serve({
								port: PORT,
								fetch: app.fetch,
							})

							for (const route of buildCtx.prerenders) {
								const { value, done } = await prerender(route, app, buildCtx).next()

								if (done || !value) {
									logger.warn(
										`server:closeBundle: skipped prerendering ${route}: no output`,
									)
									continue
								}

								const { status, body } = value

								if (status !== 200) {
									logger.warn(
										`server:closeBundle: skipped prerendering ${route}: ${status}`,
									)
									continue
								}

								const outPath =
									route === '/'
										? path.join(buildCtx.bundle.server.outDir, 'index.html')
										: path.join(buildCtx.bundle.server.outDir, route, 'index.html')

								await fs.mkdir(path.dirname(outPath), { recursive: true })
								await Bun.write(outPath, body)

								logger.info(`prerendered ${route} to ${outPath}`)
							}
						} catch (err) {
							logger.error('server:closeBundle:prerender', err)
						} finally {
							logger.info('stopping server')

							Bun.env.PRERENDER = 'false'
							server?.stop()
							server = null
						}
					}

					if (config.precompress) {
						try {
							const dir = path.resolve(process.cwd(), config.outDir)

							for await (const { input, compressed } of compress(dir, buildCtx, {
								filter: f => /\.(js|css|html|svg|json|txt)$/.test(f),
							})) {
								await Bun.write(`${input}.br`, compressed)
								logger.info(`compressed ${input} to ${input}.br`)
							}
						} catch (err) {
							logger.error('server:closeBundle:precompress', err)
						}
					}
				} catch (err) {
					logger.error('server:closeBundle', err)
					return
				} finally {
					buildCtx.bundle.server = {
						entryPath: null,
						outDir: null,
					}

					// @todo: check why the build hangs without forcing exit
					process.exit(0)
				}
			},
		},
		react(),
		devServer({
			adapter,
			entry: `./${GENERATED_DIR}/${ENTRY_SERVER}`,
			exclude: [
				/.*\.(j|t)sx?($|\?)/,
				/.*\.(s?css|less)($|\?)/,
				/.*\.(svg|png)($|\?)/,
				/^\/@.+$/,
				/^\/favicon\.ico$/,
				/^\/(public|assets|static)\/.+/,
				/^\/node_modules\/.*/,
			],
			injectClientScript: false,
		}),
		bunBuild({ entry: `./${APP_DIR}/${ENTRY_SERVER}` }),
	]
}

export default drift

export * from './types'

export type * from './drift.d.ts'
