import { lazy } from 'react'

import type { Metadata, Params, Manifest } from '@jk2908/drift'

import { default as $SPxEgsr0m9M } from '../app/+layout'

const $PfrQ3oxd0yo = import('../app/+page')
const $L7ynHM9KPnq = import('../app/about/+layout')
const $P6CIuL2L04i = import('../app/about/another/+page')
const $ERRz6n7Q857au = import('../app/about/another/+error')
const $L4wILzwGNUi = import('../app/about/+layout')
const $PTp3Gzo21uD = import('../app/about/+page')
const $LIOtS4RXT8L = import('../app/about/+layout')
const $Pe3QLLhTP7i = import('../app/test/[...catch]/+page')
const $LcVDZxCsf1U = import('../app/about/me/+layout')
const $PnP9UjUXSnb = import('../app/about/me/+page')
const $PZ7WjifBvU4 = import('../app/p/[id]/+page')

export const manifest = {
	'/': {
		id: '$PfrQ3oxd0yo',
		Shell: $SPxEgsr0m9M,
		layouts: [],
		Cmp: lazy(() => $PfrQ3oxd0yo.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PfrQ3oxd0yo
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
		id: '$PTp3Gzo21uD',
		Shell: $SPxEgsr0m9M,
		layouts: [lazy(() => $L4wILzwGNUi.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $PTp3Gzo21uD.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PTp3Gzo21uD
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
		id: '$P6CIuL2L04i',
		Shell: $SPxEgsr0m9M,
		layouts: [lazy(() => $L7ynHM9KPnq.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $P6CIuL2L04i.then(m => ({ default: m.default }))),
		Err: lazy(() => $ERRz6n7Q857au.then(m => ({ default: m.default }))),
		async metadata({ params }: { params?: Params }) {
			const m = await $P6CIuL2L04i
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
		id: '$PnP9UjUXSnb',
		Shell: $SPxEgsr0m9M,
		layouts: [
			lazy(() => $LcVDZxCsf1U.then(m => ({ default: m.default }))),
			lazy(() => $LIOtS4RXT8L.then(m => ({ default: m.default }))),
		],
		Cmp: lazy(() => $PnP9UjUXSnb.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PnP9UjUXSnb
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
		id: '$PZ7WjifBvU4',
		Shell: $SPxEgsr0m9M,
		layouts: [],
		Cmp: lazy(() => $PZ7WjifBvU4.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $PZ7WjifBvU4
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
		id: '$Pe3QLLhTP7i',
		Shell: $SPxEgsr0m9M,
		layouts: [],
		Cmp: lazy(() => $Pe3QLLhTP7i.then(m => ({ default: m.default }))),
		Err: null,
		async metadata({ params }: { params?: Params }) {
			const m = await $Pe3QLLhTP7i
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
