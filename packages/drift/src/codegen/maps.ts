import { EntryKind, PKG_NAME } from '../config'

import type { Imports, Modules } from '../build/route-processor'

import { AUTOGEN_MSG } from './utils'

const q = (s: string) => `'${s.replace(/'/g, "\\'")}'`
const key = (s: string) => JSON.stringify(s)

export function writeMaps(imports: Imports, modules: Modules) {
	const statics = [
		...imports.endpoints.static.entries().map(([k, v]) => {
			const [, method] = k.split('_')

			return `import { ${method.toUpperCase()} as ${k}} from ${q(v)}`.trim()
		}),
		...imports.components.static
			.entries()
			.map(([k, v]) => `import * as ${k} from ${q(v)}`.trim()),
	]

	const dynamics = [
		...imports.components.dynamic
			.entries()
			.map(([k, v]) => `export const ${k} = () => import(${q(v)})`.trim()),
	]

	const map = Object.entries(modules).map(([id, m]) => {
		const parts: string[] = []

		if (m.shellId) parts.push(`shell: ${m.shellId}`)

		if (m.layoutIds?.length) {
			const layouts = m.layoutIds.map(id => (id === null ? 'null' : id)).join(', ')
			parts.push(`layouts: [${layouts}]`)
		}

		if (m.pageId) parts.push(`page: ${m.pageId}`)
		if (m.endpointId) parts.push(`endpoint: ${m.endpointId}`)

		if (m.errorIds?.length) {
			const errors = m.errorIds.map(id => (id === null ? 'null' : id)).join(', ')
			parts.push(`errors: [${errors}]`)
		}

		if (m.loadingIds?.length) {
			const loaders = m.loadingIds.map(id => (id === null ? 'null' : id)).join(', ')
			parts.push(`loaders: [${loaders}]`)
		}

		return `${key(id)}: { ${parts.join(', ')} }`
	})

	// build pathMap: maps import paths to their importer functions by category
	const layouts = [
		...[...imports.components.static.entries()]
			.filter(([k]) => k.startsWith(EntryKind.SHELL))
			.map(([k, v]) => `${key(v)}: ${k}`),
		...[...imports.components.dynamic.entries()]
			.filter(([k]) => k.startsWith(EntryKind.LAYOUT) && !k.startsWith(EntryKind.LOADING))
			.map(([k, v]) => `${key(v)}: ${k}`),
	]

	const pages = [...imports.components.dynamic.entries()]
		.filter(([k]) => k.startsWith(EntryKind.PAGE))
		.map(([k, v]) => `${key(v)}: ${k}`)

	const errors = [...imports.components.dynamic.entries()]
		.filter(([k]) => k.startsWith(EntryKind.ERROR))
		.map(([k, v]) => `${key(v)}: ${k}`)

	const loaders = [...imports.components.dynamic.entries()]
		.filter(([k]) => k.startsWith(EntryKind.LOADING))
		.map(([k, v]) => `${key(v)}: ${k}`)

	// group endpoints by method
	const endpointsByMethod = new Map<string, string[]>()

	for (const [k, v] of imports.endpoints.static.entries()) {
		const [, method] = k.split('_')

		if (!endpointsByMethod.has(method)) {
			endpointsByMethod.set(method, [])
		}

		endpointsByMethod.get(method)?.push(`${key(v)}: ${k}`)
	}

	const endpoints = [...endpointsByMethod.entries()].map(
		([method, entries]) =>
			`${method}: {\n\t\t\t\t${entries.join(',\n\t\t\t\t')}\n\t\t\t}`,
	)

	return `
	  ${AUTOGEN_MSG}

		import type { ImportMap, PathMap } from '${PKG_NAME}'

	  ${statics.join('\n')}
		
	  ${dynamics.join('\n')}

		export const pathMap = {
			layouts: {
				${layouts.join(',\n')}
			},
			pages: {
				${pages.join(',\n')}
			},
			errors: {
				${errors.join(',\n')}
			},
			loaders: {
				${loaders.join(',\n')}
			},
			endpoints: {
				${endpoints.join(',\n')}
			},
		} as const satisfies PathMap

		export const importMap = {
			${map.join(',\n')}
		} as const satisfies ImportMap
	`
}
