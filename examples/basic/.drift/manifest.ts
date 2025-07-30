import { lazy } from 'react'

import type { Metadata, Params, Manifest } from '@jk2908/drift'

import { default as $SwrEV_5eJ0n } from '../app/+layout'

const $PM6ZwMaAlD3 = import('../app/+page')
const $PBCE5a_B6c2 = import('../app/test/[...catch]/+page')
const $Lsmgvch9MRw = import('../app/about/+layout')
const $LnMQ1sQyKHl = import('../app/about/+layout')
const $Pu24vMGxWo8 = import('../app/about/+page')
const $LlmlG_JzGDZ = import('../app/about/+layout')
const $PYG2nZSkA18 = import('../app/about/another/+page')
const $ERR5eZpI9l9pv = import('../app/about/another/+error')
const $PR4QQZDIzfN = import('../app/p/[id]/+page')
const $LL9ZpQcp0po = import('../app/about/me/+layout')
const $PJ9kXYTTKxX = import('../app/about/me/+page')

export const manifest = {
	'/': {
		id: '$PM6ZwMaAlD3',
		Shell: $SwrEV_5eJ0n,
		layouts: [],
		Cmp: lazy(() => $PM6ZwMaAlD3.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PM6ZwMaAlD3
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
		type: '$P',
	},
	'/about': {
		id: '$Pu24vMGxWo8',
		Shell: $SwrEV_5eJ0n,
		layouts: [lazy(() => $LnMQ1sQyKHl.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $Pu24vMGxWo8.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $Pu24vMGxWo8
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
		type: '$P',
	},
	'/about/another': {
		id: '$PYG2nZSkA18',
		Shell: $SwrEV_5eJ0n,
		layouts: [lazy(() => $LlmlG_JzGDZ.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $PYG2nZSkA18.then(m => ({ default: m.default }))),
		Err: lazy(() => $ERR5eZpI9l9pv.then(m => ({ default: m.default }))),
		async metadata({ params }: { params?: Params }) {
			const m = await $PYG2nZSkA18
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
		type: '$P',
	},
	'/about/me': {
		id: '$PJ9kXYTTKxX',
		Shell: $SwrEV_5eJ0n,
		layouts: [
			lazy(() => $LL9ZpQcp0po.then(m => ({ default: m.default }))),
			lazy(() => $Lsmgvch9MRw.then(m => ({ default: m.default }))),
		],
		Cmp: lazy(() => $PJ9kXYTTKxX.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PJ9kXYTTKxX
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
		type: '$P',
	},
	'/p/:id': {
		id: '$PR4QQZDIzfN',
		Shell: $SwrEV_5eJ0n,
		layouts: [],
		Cmp: lazy(() => $PR4QQZDIzfN.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PR4QQZDIzfN
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
		type: '$P',
	},
	'/test/:catch*': {
		id: '$PBCE5a_B6c2',
		Shell: $SwrEV_5eJ0n,
		layouts: [],
		Cmp: lazy(() => $PBCE5a_B6c2.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PBCE5a_B6c2
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
		prerender: false,
		dynamic: true,
		catchAll: true,
		type: '$P',
	},
} satisfies Manifest
