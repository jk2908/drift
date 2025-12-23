import fs from 'node:fs/promises'
import path from 'node:path'

import type { PluginOption } from 'vite'

import react from '@vitejs/plugin-react'
import rsc from '@vitejs/plugin-rsc'

import type { BuildContext, PluginConfig } from './types'

import { writeConfig } from './codegen/config'
import { createEntries } from './codegen/entries'
import { writeImportMap } from './codegen/import-map'
import { writeManifest } from './codegen/manifest'
import { writeRouter } from './codegen/router'

import {
	APP_DIR,
	ASSETS_DIR,
	ENTRY_BROWSER,
	ENTRY_RSC,
	ENTRY_SSR,
	GENERATED_DIR,
} from './config'

import { Logger } from './shared/logger'

import { compress } from './server/compress'
import { prerender } from './server/prerender'
import { format } from './server/utils'

import { RouteProcessor } from './build/route-processor'

import { debounce } from './utils'

const DEFAULT_CONFIG = {
	precompress: true,
	prerender: 'declarative',
	outDir: 'dist',
	trailingSlash: false,
} as const satisfies Partial<PluginConfig>

function drift(c: PluginConfig): PluginOption[] {
	const config = { ...DEFAULT_CONFIG, ...c }

	config.app = {
		...(config.app ?? {}),
		// @todo: runtime validation
		// @ts-expect-error
		url:
			config.app?.url ??
			process.env.VITE_APP_URL?.toString() ??
			process.env.APP_URL?.toString(),
	}

	config.logger = {
		...(config.logger ?? {}),
		level:
			(config.logger?.level ??
			(import.meta.env.PROD || process.env.NODE_ENV === 'production'))
				? 'error'
				: 'debug',
	}

	const transpiler = new Bun.Transpiler({ loader: 'tsx' })
	const logger = new Logger(config.logger.level)

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
		prerenderableRoutes: new Set<string>(),
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
		const { manifest, prerenderableRoutes, imports, modules } = await processor.run()

		// set prerenderable routes in context for use in closeBundle
		buildCtx.prerenderableRoutes = prerenderableRoutes

		await Promise.all([
			Bun.write(path.join(generatedDir, 'config.ts'), writeConfig(config)),
			Bun.write(path.join(generatedDir, 'manifest.ts'), writeManifest(manifest)),
			Bun.write(
				path.join(generatedDir, 'import-map.ts'),
				writeImportMap(imports, modules),
			),
			Bun.write(path.join(generatedDir, 'router.tsx'), writeRouter(manifest, imports)),
			...(await createEntries()),
		])

		// format generated files, avoid stopping build on errors
		await format(GENERATED_DIR, buildCtx).catch(() => {})
	}

	// debounced build to avoid multiple builds on file changes
	const rebuild = debounce(build, 1000)

	const plugin: PluginOption = {
		name: 'drift',
		enforce: 'pre',
		async config(viteConfig) {
			await build()

			viteConfig.build ??= {}
			viteConfig.build.outDir = config.outDir

			viteConfig.server ??= {}
			viteConfig.server.port = 8787

			viteConfig.define ??= {}
			viteConfig.define['import.meta.env.APP_URL'] = JSON.stringify(process.env.APP_URL)
			viteConfig.define['import.meta.env.VITE_APP_URL'] = JSON.stringify(
				process.env.VITE_APP_URL,
			)

			viteConfig.resolve ??= {}
			viteConfig.resolve.alias = {
				...(viteConfig.resolve.alias ?? {}),
				'.drift': path.resolve(process.cwd(), GENERATED_DIR),
			}

			viteConfig.optimizeDeps ??= {}
			viteConfig.optimizeDeps.exclude = [
				...(Array.isArray(viteConfig.optimizeDeps.exclude)
					? viteConfig.optimizeDeps.exclude
					: []),
				'react-dom/client',
			]
		},
		configureServer(server) {
			logger.info('[configureServer]', `Watching for changes in ./${APP_DIR}...`)

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
			if (process.env.NODE_ENV === 'development') return

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
				const clientEntryPath = json[`${GENERATED_DIR}/${ENTRY_BROWSER}`].file

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
				logger.error('[writeBundle]', err)
			}
		},
		async closeBundle() {
			if (process.env.NODE_ENV === 'development') return

			try {
				if (buildCtx.prerenderableRoutes.size > 0) {
					if (!config.app?.url) {
						logger.error(
							'[closeBundle]',
							'Skipping prerender: no app URL configured. Set the VITE_APP_URL env var or set the app.url in the plugin config',
						)
					} else {
						Bun.env.PRERENDER = 'true'

						try {
							if (!buildCtx.bundle.server.outDir || !buildCtx.bundle.server.entryPath) {
								throw new Error('No server outDir or entryPath found')
							}

							const app = (
								await import(`file://${Bun.file(buildCtx.bundle.server.entryPath).name}`)
							).default

							for (const route of buildCtx.prerenderableRoutes) {
								const { value, done } = await prerender(
									(req: Request) => app.fetch(req),
									route,
									config.app.url,
									buildCtx,
								).next()

								if (done || !value) {
									logger.warn('[closeBundle]', `skipped prerendering ${route}: no output`)
									continue
								}

								const { status, body } = value

								if (status !== 200) {
									logger.warn('[closeBundle]', `skipped prerendering ${route}: ${status}`)
									continue
								}

								const outPath =
									route === '/'
										? path.join(buildCtx.bundle.server.outDir, 'index.html')
										: path.join(buildCtx.bundle.server.outDir, route, 'index.html')

								await fs.mkdir(path.dirname(outPath), { recursive: true })
								await Bun.write(outPath, body)

								logger.info('[closeBundle]', `prerendered ${route} to ${outPath}`)
							}
						} catch (err) {
							logger.error('[closeBundle:prerender]', err)
						} finally {
							logger.info('[closeBundle]', 'stopping server')
							Bun.env.PRERENDER = 'false'
						}
					}
				}

				if (config.precompress) {
					try {
						const dir = path.resolve(process.cwd(), config.outDir)

						for await (const { input, compressed } of compress(dir, buildCtx, {
							filter: f => /\.(js|css|html|svg|json|txt)$/.test(f),
						})) {
							await Bun.write(`${input}.br`, compressed)
							logger.info(
								'[closeBundle:precompress]',
								`compressed ${input} to ${input}.br`,
							)
						}
					} catch (err) {
						logger.error('[closeBundle:precompress]', err)
					}
				}
			} catch (err) {
				logger.error('[closeBundle]', err)
				return
			} finally {
				buildCtx.bundle.server = {
					entryPath: null,
					outDir: null,
				}

				// fini
				logger.info('[closeBundle]', 'build complete')
			}
		},
	}

	return [
		plugin,
		rsc({
			entries: {
				rsc: `./${GENERATED_DIR}/${ENTRY_RSC}`,
				ssr: `./${GENERATED_DIR}/${ENTRY_SSR}`,
				client: `./${GENERATED_DIR}/${ENTRY_BROWSER}`,
			},
		}),
		react(),
	]
}

export default drift

export * from './types'

export type * from './drift.d.ts'
