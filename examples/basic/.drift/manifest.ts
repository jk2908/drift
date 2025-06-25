import { lazy } from 'react'

import type { MetadataFn, Metadata, Params, Manifest } from '@jk2908/drift/types'

const $L7elv$7$p = import('../app/layout')
const $Poq7bz72r = import('../app/page')

export const manifest = {
	'/page': {
		layouts: [$L7elv$7$p.then(m => m.default)],
		Component: lazy(() => $Poq7bz72r.then(m => ({ default: m.default }))),
		async metadata({ params }: { params?: Params }) {
			const m = await $Poq7bz72r
			// @todo: fix type
			const metadata = 'metadata' in m ? (m.metadata as MetadataFn | Metadata) : null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: false,
		type: 'page',
	},
} satisfies Manifest
