import { PKG_NAME } from '../constants'

export function createManifest({
  imports,
  entries,
}: {
  imports: { static: Map<string, string>, dynamic: Map<string, string> },
  entries: string[],
}) {
  return `
    import { lazy } from 'react'

    ${[...imports.static.entries()].map(([key, value]) => `import { ${key} } from '${value}'`).join('\n')}

    import type { MetadataFn, Metadata, Params, Manifest } from '${PKG_NAME}/types'

    ${[...imports.dynamic.entries()].map(([key, value]) => `const ${key} = ${value}`).join('\n')}

    export const manifest = {
      ${entries.join(',\n')}
    } satisfies Manifest
  `.trim()
}