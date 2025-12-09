import type { Imports, Modules } from '../build/route-processor'

import { AUTO_GEN_MSG } from './utils'

const q = (s: string) => `'${s.replace(/'/g, "\\'")}'`
const key = (s: string) => JSON.stringify(s)

export function writeImportMap(imports: Imports, modules: Modules) {
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
		if (m.layoutIds?.length) parts.push(`layouts: [${m.layoutIds.join(', ')}]`)
		if (m.pageId) parts.push(`page: ${m.pageId}`)
		if (m.endpointId) parts.push(`endpoint: ${m.endpointId}`)
		if (m.errorId) parts.push(`error: ${m.errorId}`)

		if (m.loadingIds?.length) {
			const loaders = m.loadingIds.map(id => (id === null ? 'null' : id)).join(', ')
			parts.push(`loaders: [${loaders}]`)
		}

		return `${key(id)}: { ${parts.join(', ')} }`
	})

	return `
	  ${AUTO_GEN_MSG}

	  ${statics.join('\n')}
		
	  ${dynamics.join('\n')}

		export const endpoints = {
			${[...imports.endpoints.static.keys()].map(k => `${key(k)}: ${k}`).join(',\n')}
		} as const

		export const components = {
			static: {
				${[...imports.components.static.keys()].map(k => `${key(k)}: ${k}`).join(',\n')}
			},
			dynamic: {
				${[...imports.components.dynamic.keys()].map(k => `${key(k)}: ${k}`).join(',\n')}
			}
		} as const

		export const importMap = {
			${map.join(',\n')}
		} as const
	`
}
