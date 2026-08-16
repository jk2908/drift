import * as Config from './config.js'
import * as Prerender from './internal/prerender.js'
import { Runtime } from './internal/runtimes/runtime.js'

export type Manifest = {
	artifacts: Prerender.ArtifactManifest
	publicFiles: ReadonlySet<string>
}

const manifestCache = new Map<string, Manifest | null>()

export function getManifestPath(outDir: string) {
	return [outDir, Config.GENERATED_DIR, Config.RUNTIME_MANIFEST]
		.map((part, index) => {
			const normalised = part.replace(/\\/g, '/').replace(/\/+/g, '/')

			if (index === 0) return normalised.replace(/\/+$/, '')
			return normalised.replace(/^\/+/, '').replace(/\/+$/, '')
		})
		.join('/')
}

export async function loadManifest(outDir: string) {
	if (manifestCache.has(outDir)) {
		return manifestCache.get(outDir) ?? null
	}

	const manifestPath = getManifestPath(outDir)

	if (!(await Runtime.exists(manifestPath))) {
		manifestCache.set(outDir, null)
		return null
	}

	try {
		const value = JSON.parse(await Runtime.readText(manifestPath))

		if (!isRecord(value)) {
			manifestCache.set(outDir, null)
			return null
		}

		const artifacts = value.artifacts ?? value.routes
		const publicFiles = value.publicFiles

		if (!isRecord(artifacts)) {
			manifestCache.set(outDir, null)
			return null
		}

		if (publicFiles !== undefined && !Array.isArray(publicFiles)) {
			manifestCache.set(outDir, null)
			return null
		}

		for (const entry of Object.values(artifacts)) {
			if (!isRecord(entry)) {
				manifestCache.set(outDir, null)
				return null
			}

			const { mode, files } = entry

			if (mode !== 'full' && mode !== 'ppr') {
				manifestCache.set(outDir, null)
				return null
			}

			if (files !== undefined) {
				if (!Array.isArray(files)) {
					manifestCache.set(outDir, null)
					return null
				}

				for (const file of files) {
					if (
						file !== 'html' &&
						file !== 'prelude' &&
						file !== 'postponed' &&
						file !== 'metadata'
					) {
						manifestCache.set(outDir, null)
						return null
					}
				}
			}
		}

		for (const entry of publicFiles ?? []) {
			if (typeof entry !== 'string' || !entry.startsWith('/')) {
				manifestCache.set(outDir, null)
				return null
			}
		}

		const runtimeManifest: Manifest = {
			artifacts: artifacts as Manifest['artifacts'],
			publicFiles: new Set((publicFiles as string[] | undefined) ?? []),
		}

		manifestCache.set(outDir, runtimeManifest)
		return runtimeManifest
	} catch {
		manifestCache.set(outDir, null)
		return null
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
