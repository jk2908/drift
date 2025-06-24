import fs from 'node:fs/promises'
import path from 'node:path'

import { type PluginOption, loadEnv } from 'vite'

import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/bun'
import bunBuild from '@hono/vite-build/bun'
import react from '@vitejs/plugin-react'
import { customAlphabet } from 'nanoid'

import type { Config } from './types'

import {
	APP_DIR,
	ENTRY_CLIENT,
	ENTRY_SERVER,
	GENERATED_DIR,
	HTTP_METHODS,
	ROUTES_DIR,
	ASSETS_DIR,
} from './constants'

import {
	isPrerenderable,
	getPrerenderParamsList,
	prerender,
	createPrerenderRoutesFromParamsList,
} from './server/prerender'
import { compress } from './server/compress'
import { compose } from './server/tree'
import { injectRuntime } from './server/runtime'

import { createAppEntries } from './codegen/scaffold'
import { createManifest } from './codegen/manifest'
import { createServer } from './codegen/server'
import { createClient } from './codegen/client'
import { createRuntime } from './codegen/runtime'

import { getImportPath, isDynamicRoute, routify } from './utils/routes'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789$_', 8)

const PAGE_ID_PREFIX = '$P'
const LAYOUT_ID_PREFIX = '$L'
const API_ID_PREFIX = '$A'

type Build = {
	outDir: string
	bundle: {
		server: {
			entryPath: string | null
			outDir: string | null
		}
		client: {
			entryPath: string | null
			outDir: string | null
		}
	}
}

const DEFAULT_CONFIG = {
	precompress: true,
	prerender: 'declarative',
	outDir: 'dist',
} as const satisfies Partial<Config>

export default function drift(c: Config) {
	const config = { ...DEFAULT_CONFIG, ...c }

	if (!config.ctx) throw new Error('drift: vite ctx is required')

	const { mode } = config.ctx
	const env = loadEnv(mode, process.cwd(), '')

	let routes: { pages: { page: string; layouts: string[] }[]; apis: string[] } | null =
		null
	let entries: string[] = []
	let handlers: string[] = []
	let prerenders: Set<string> = new Set()

	const transpiler = new Bun.Transpiler({ loader: 'tsx' })

	const imports = {
		dynamic: new Map<string, string>(),
		static: new Map<string, string>(),
	}

	const layoutCache = new Map<string, { id: string; prerender: boolean }>()

	const build: Build = {
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
	}

	return [
		{
			name: 'drift:prebuild',
			enforce: 'pre',
			async buildStart() {
				imports.dynamic.clear()
				imports.static.clear()

				routes = null
				entries = []
				handlers = []
				prerenders = new Set()

				const cwd = process.cwd()
				const routesDir = path.join(cwd, ROUTES_DIR)
				const generatedDir = path.join(cwd, GENERATED_DIR)

				await fs.mkdir(routesDir, { recursive: true })
				await fs.mkdir(generatedDir, { recursive: true })

				routes = await compose(routesDir, {
					pages: ['.tsx', '.jsx'],
					apis: ['.ts', '.js'],
				})

				for (const { page, layouts } of routes.pages) {
					const pageImportPath = getImportPath(page)
					const pageRoute = routify(page)
					const pageId = `${PAGE_ID_PREFIX}${nanoid()}`
					const isDynamic = isDynamicRoute(pageRoute)

					const layoutIds = []
					let hasInheritedPrerender = false

					for (const layoutPath of layouts) {
						let layout = layoutCache.get(layoutPath)

						if (!layout) {
							const layoutId = `${LAYOUT_ID_PREFIX}${nanoid()}`
							layout = { id: layoutId, prerender: await isPrerenderable(layoutPath, transpiler) }

							layoutCache.set(layoutPath, layout)
							imports.dynamic.set(layoutId, `import('${getImportPath(layoutPath)}')`)
						}

            layoutIds.push(layout.id)
						hasInheritedPrerender ||= layout.prerender
					}

					const shouldPrerender =
						hasInheritedPrerender ||
						(config.prerender === 'full' && !isDynamic) ||
						(await isPrerenderable(page, transpiler))

					if (shouldPrerender) {
						if (!isDynamic) {
							prerenders.add(pageRoute)
						} else {
							const list = await getPrerenderParamsList(path.resolve(cwd, page))

							if (!list?.length) {
								console.warn(
									`drift:prerender: no prerenderable params found for ${page}, skipping prerendering`,
								)
							}

							const routes = createPrerenderRoutesFromParamsList(pageRoute, list)

							if (!routes?.length) {
								console.warn(
									`drift:prerender: no prerenderable routes found for ${page}, skipping prerendering`,
								)
                
								continue
							}

							for (const route of routes) prerenders.add(route)
						}
					}

					imports.dynamic.set(pageId, `import('${pageImportPath}')`)

					entries.push(`'${pageRoute}': {
						layouts: [${layoutIds.map(id => `${id}.default`).join(', ')}],
						Component: lazy(() => ${pageId}.then(m => ({ default: m.default }))),
						async metadata({ params }: { params?: Params }) {
							const m = await ${pageId}
							// @todo: fix type
							const metadata = 'metadata' in m ? m.metadata as MetadataFn | Metadata : null

							if (!metadata) return {}
							if (typeof metadata !== 'function') return metadata
							
							return metadata.length > 0 ? metadata({ params }) : metadata({})
						},
						prerender: ${shouldPrerender},
						dynamic: ${isDynamic},
						type: 'page',
					}`)
				}

				for (const file of routes.apis) {
					const importPath = getImportPath(file)
					const route = routify(file)
					const mod = await import(path.resolve(cwd, file))

					const group: string[] = []

					for (const key in mod) {
						if (!HTTP_METHODS.includes(key as (typeof HTTP_METHODS)[number])) continue

						const method = key.toLowerCase()
						const handler = `${API_ID_PREFIX}${nanoid()}`

						imports.static.set(`${key} as ${handler}`, importPath)

						group.push(`{
							method: '${method.toUpperCase()}',
							handler: ${handler},
							type: 'api'
						}`)

						handlers.push(`.${method}('${route}', ${handler})`)
					}

					if (!group?.length) continue

					if (group.length > 1) {
						entries.push(`'${route}': [${group.join(',\n')}]`)
					} else {
						entries.push(`'${route}': ${group[0]}`)
					}
				}

				await Promise.all([
					Bun.write(
						path.join(generatedDir, 'manifest.ts'),
						createManifest({
							imports,
							entries,
						}),
					),

					Bun.write(
						path.join(generatedDir, 'server.tsx'),
						createServer({
							imports: imports.static,
							handlers,
							config,
						}),
					),

					Bun.write(path.join(generatedDir, 'client.tsx'), createClient({ config })),
					Bun.write(path.join(generatedDir, 'runtime.tsx'), createRuntime()),

					...(await createAppEntries()),
				])
			},
		},
		{
			name: 'drift',
			config(viteConfig) {
				if (mode === 'client') {
					return {
						...viteConfig,
						build: {
							...viteConfig.build,
							outDir: config.outDir,
							manifest: true,
							rollupOptions: {
								...(viteConfig.build?.rollupOptions || {}),
								input: {
									client: `/${APP_DIR}/${ENTRY_CLIENT}`,
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
							'#/app': path.resolve(process.cwd(), APP_DIR),
						},
					},
				}
			},
			async writeBundle(options, output) {
				if (mode === 'client' || env.NODE_ENV === 'development') return

				try {
					const manifest = Bun.file(
						path.resolve(
							process.cwd(),
							options.dir ?? config.outDir,
							'.vite/manifest.json',
						),
					)

					if (!(await manifest.exists())) {
						throw new Error(
							'drift:server:writeBundle: no manifest found, cannot get client hash',
						)
					}

					const json = await manifest.json()
					const clientEntryPath = json[`${APP_DIR}/${ENTRY_CLIENT}`].file

					build.bundle.client.entryPath = path.join(
						options.dir ?? config.outDir,
						clientEntryPath,
					)
					build.bundle.client.outDir = `${options.dir ?? config.outDir}/${ASSETS_DIR}`

					const serverEntryChunk = Object.entries(output).find(
						([_, chunk]) => chunk.type === 'chunk' && chunk.isEntry,
					)

					if (!serverEntryChunk)
						throw new Error('drift:server:writeBundle: no entry chunk found')

					const [serverEntryPath] = serverEntryChunk

					build.bundle.server.entryPath = path.join(
						options.dir ?? config.outDir,
						serverEntryPath,
					)
					build.bundle.server.outDir = options.dir ?? config.outDir
				} catch (err) {
					console.error('drift:server:writeBundle: error writing bundle', err)
				}
			},
			buildEnd() {
				if (mode === 'client') return

				routes = null
			},
			async closeBundle() {
				if (mode === 'client' || env.NODE_ENV === 'development') return

				try {
					try {
						if (!build.bundle.server.entryPath) {
							throw new Error('drift:server:closeBundle:runtime: no entry path found')
						}

						await Bun.write(
							build.bundle.server.entryPath,
							await injectRuntime(build.bundle),
						)
					} catch (err) {
						console.error(
							'drift:server:closeBundle:runtime: error injecting runtime',
							err,
						)
					}

					if (prerenders.size > 0) {
						Bun.env.PRERENDER = 'true'
						let server: ReturnType<typeof Bun.serve> | null = null

						try {
							if (!build.bundle.server.outDir || !build.bundle.server.entryPath) {
								throw new Error(
									'drift:server:closeBundle:prerender: no server outDir or entryPath found',
								)
							}

							const app = (
								await import(`file://${Bun.file(build.bundle.server.entryPath).name}`)
							).default

							console.log('drift:server:closeBundle:prerender: starting server')

							server = Bun.serve({
								port: 8787,
								fetch: app.fetch,
							})

							for (const route of prerenders) {
								const { value, done } = await prerender(route, app).next()

								if (done || !value) {
									console.warn(
										`drift:server:closeBundle:prerender: skipped prerendering ${route}: no output`,
									)
									continue
								}

								const { status, body } = value

								if (status !== 200) {
									console.warn(
										`drift:server:closeBundle:prerender: skipped prerendering for ${route}: ${status}`,
									)

									continue
								}

								const outPath =
									route === '/'
										? path.join(build.bundle.server.outDir, 'index.html')
										: path.join(build.bundle.server.outDir, route, 'index.html')

								await fs.mkdir(path.dirname(outPath), { recursive: true })
								await Bun.write(outPath, body)

								console.log(
									`drift:server:closeBundle:prerender: prerendered ${route} to ${outPath}`,
								)
							}
						} catch (err) {
							console.error('drift:server:closeBundle:prerender', err)
						} finally {
							console.log('drift:server:closeBundle:prerender: stopping server')

							Bun.env.PRERENDER = 'false'
							server?.stop()
							server = null
						}
					}

					if (config.precompress) {
						try {
							const dir = path.resolve(process.cwd(), config.outDir)

							for await (const { input, compressed } of compress(dir, {
								filter: f => /\.(js|css|html|svg|json|txt)$/.test(f),
							})) {
								await Bun.write(`${input}.br`, compressed)

								console.log(
									`drift:server:closeBundle:precompress: compressed ${input} to ${input}.br`,
								)
							}
						} catch (err) {
							console.error('drift:server:closeBundle:precompress', err)
						}
					}
				} catch (err) {
					console.error('drift:server:closeBundle', err)
					return
				} finally {
					build.bundle.server = {
						entryPath: null,
						outDir: null,
					}

					// @TODO: check why the build hangs without forcing exit
					process.exit(0)
				}
			},
		},
		react(),
		devServer({
			adapter,
			entry: `./${APP_DIR}/${ENTRY_SERVER}`,
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
	] satisfies PluginOption[]
}
