import { PKG_NAME } from '../config'

export function createManifest({
	imports,
	entries,
}: {
	imports: {
		apis: { static: Map<string, string> }
		pages: { static: Map<string, string>; dynamic: Map<string, string> }
	}
	entries: string[]
}) {
	return `
    import { lazy } from 'react'

    import type { Metadata, Params, Manifest } from '${PKG_NAME}'

    ${[...imports.apis.static.entries()].map(([key, value]) => `import { ${key} } from '${value}'`).join('\n')}
    ${[...imports.pages.static.entries()].map(([key, value]) => `import { ${key} } from '${value}'`).join('\n')}

    ${[...imports.pages.dynamic.entries()].map(([key, value]) => `const ${key} = ${value}`).join('\n')}

    export const manifest = {
      ${entries.join(',\n')}
    } satisfies Manifest
  `.trim()
}
