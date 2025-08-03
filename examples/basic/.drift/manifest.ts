import { lazy } from 'react'

import type { Metadata, Params, Manifest } from '@jk2908/drift'

import { default as $SeNA1jSjZ1w } from '../app/+layout'

const $PT8IoUbMgpg = import('../app/+page')
const $Pe9rup584Zq = import('../app/test/[...catch]/+page')
const $LSnrvfTPZG2 = import('../app/about/+layout')
const $P5yIgcA7iUG = import('../app/about/+page')
const $Ltwxs1vIgEZ = import('../app/about/+layout')
const $LLRV2YfdLlC = import('../app/about/+layout')
const $PofnqlveX9q = import('../app/about/another/+page')
const $ERRdrrlhRGtEO = import('../app/about/another/+error')
const $PMQx36_EfYm = import('../app/p/[id]/+page')
const $Lkp2lCa2d_W = import('../app/about/me/+layout')
const $PGwdoQyZ59T = import('../app/about/me/+page')

export const manifest = {
	'/': {
		id: '$PT8IoUbMgpg',
		Shell: $SeNA1jSjZ1w,
		layouts: [],
		Cmp: lazy(() => $PT8IoUbMgpg.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PT8IoUbMgpg
			// @todo: fix type
			const metadata =
				'metadata' in m
					? (m.metadata as
							| (({ params }: { params?: Params }) => Promise<Metadata>)
							| Metadata)
					: null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		__params: [],
		type: '$P',
	},
	'/about': {
		id: '$P5yIgcA7iUG',
		Shell: $SeNA1jSjZ1w,
		layouts: [lazy(() => $LSnrvfTPZG2.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $P5yIgcA7iUG.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $P5yIgcA7iUG
			// @todo: fix type
			const metadata =
				'metadata' in m
					? (m.metadata as
							| (({ params }: { params?: Params }) => Promise<Metadata>)
							| Metadata)
					: null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		__params: [],
		type: '$P',
	},
	'/about/another': {
		id: '$PofnqlveX9q',
		Shell: $SeNA1jSjZ1w,
		layouts: [lazy(() => $LLRV2YfdLlC.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $PofnqlveX9q.then(m => ({ default: m.default }))),
		Err: lazy(() => $ERRdrrlhRGtEO.then(m => ({ default: m.default }))),
		async metadata({ params }: { params?: Params }) {
			const m = await $PofnqlveX9q
			// @todo: fix type
			const metadata =
				'metadata' in m
					? (m.metadata as
							| (({ params }: { params?: Params }) => Promise<Metadata>)
							| Metadata)
					: null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		__params: [],
		type: '$P',
	},
	'/about/me': {
		id: '$PGwdoQyZ59T',
		Shell: $SeNA1jSjZ1w,
		layouts: [
			lazy(() => $Lkp2lCa2d_W.then(m => ({ default: m.default }))),
			lazy(() => $Ltwxs1vIgEZ.then(m => ({ default: m.default }))),
		],
		Cmp: lazy(() => $PGwdoQyZ59T.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PGwdoQyZ59T
			// @todo: fix type
			const metadata =
				'metadata' in m
					? (m.metadata as
							| (({ params }: { params?: Params }) => Promise<Metadata>)
							| Metadata)
					: null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		__params: [],
		type: '$P',
	},
	'/p/:id': {
		id: '$PMQx36_EfYm',
		Shell: $SeNA1jSjZ1w,
		layouts: [],
		Cmp: lazy(() => $PMQx36_EfYm.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PMQx36_EfYm
			// @todo: fix type
			const metadata =
				'metadata' in m
					? (m.metadata as
							| (({ params }: { params?: Params }) => Promise<Metadata>)
							| Metadata)
					: null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: true,
		catchAll: false,
		__params: ['id'],
		type: '$P',
	},
	'/test/*': {
		id: '$Pe9rup584Zq',
		Shell: $SeNA1jSjZ1w,
		layouts: [],
		Cmp: lazy(() => $Pe9rup584Zq.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $Pe9rup584Zq
			// @todo: fix type
			const metadata =
				'metadata' in m
					? (m.metadata as
							| (({ params }: { params?: Params }) => Promise<Metadata>)
							| Metadata)
					: null

			if (!metadata) return {}
			if (typeof metadata !== 'function') return metadata

			return metadata.length > 0 ? metadata({ params }) : metadata({})
		},
		prerender: true,
		dynamic: false,
		catchAll: true,
		__params: ['catch'],
		type: '$P',
	},
} satisfies Manifest
