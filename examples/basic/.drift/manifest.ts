import { lazy } from 'react'

import type { Metadata, Params, Manifest } from '@jk2908/drift'

import { resolveMetadata } from '@jk2908/drift/shared/metadata'

import { GET as $AK7lKN8reGt } from '../app/posts/+api'
import { POST as $AWyqilYZGpp } from '../app/posts/+api'
import * as $SSNcp3tCB2B from '../app/+layout'

const $P3mcuKkUeGB = import('../app/+page')
const $PtysNIDZa_y = import('../app/foo/+page')
const $PvISJNqa80G = import('../app/posts/+page')
const $PLNzLiMz29j = import('../app/test/[...catch]/+page')
const $LYbyK5bdjO1 = import('../app/about/+layout')
const $PRGXPZ0XB3N = import('../app/about/+page')
const $LuqgzqOqh6A = import('../app/about/+layout')
const $LlZvscfwV6I = import('../app/about/+layout')
const $PNahRsKtZNt = import('../app/about/another/+page')
const $ERRr_E8L1BS0F = import('../app/about/another/+error')
const $LISOGeZXnLe = import('../app/about/me/+layout')
const $PmUaLaZaKvL = import('../app/about/me/+page')
const $Pousr1nLMIV = import('../app/p/[id]/+page')

export const manifest = {
	'/': {
		__id: '$P3mcuKkUeGB',
		__path: '/',
		__params: [],
		Shell: $SSNcp3tCB2B.default,
		layouts: [],
		Cmp: lazy(() => $P3mcuKkUeGB.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),

				error ? Promise.resolve() : $P3mcuKkUeGB,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/about': {
		__id: '$PRGXPZ0XB3N',
		__path: '/about',
		__params: [],
		Shell: $SSNcp3tCB2B.default,
		layouts: [lazy(() => $LYbyK5bdjO1.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $PRGXPZ0XB3N.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),
				$LYbyK5bdjO1,
				error ? Promise.resolve() : $PRGXPZ0XB3N,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/about/another': {
		__id: '$PNahRsKtZNt',
		__path: '/about/another',
		__params: [],
		Shell: $SSNcp3tCB2B.default,
		layouts: [lazy(() => $LlZvscfwV6I.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $PNahRsKtZNt.then(m => ({ default: m.default }))),
		Err: lazy(() => $ERRr_E8L1BS0F.then(m => ({ default: m.default }))),
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),
				$LlZvscfwV6I,
				error ? $ERRr_E8L1BS0F : $PNahRsKtZNt,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/about/me': {
		__id: '$PmUaLaZaKvL',
		__path: '/about/me',
		__params: [],
		Shell: $SSNcp3tCB2B.default,
		layouts: [
			lazy(() => $LISOGeZXnLe.then(m => ({ default: m.default }))),
			lazy(() => $LuqgzqOqh6A.then(m => ({ default: m.default }))),
		],
		Cmp: lazy(() => $PmUaLaZaKvL.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),
				$LuqgzqOqh6A,
				$LISOGeZXnLe,
				error ? $ERRr_E8L1BS0F : $PmUaLaZaKvL,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/foo': {
		__id: '$PtysNIDZa_y',
		__path: '/foo',
		__params: [],
		Shell: $SSNcp3tCB2B.default,
		layouts: [],
		Cmp: lazy(() => $PtysNIDZa_y.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),

				error ? Promise.resolve() : $PtysNIDZa_y,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/p/:id': {
		__id: '$Pousr1nLMIV',
		__path: '/p/:id',
		__params: ['id'],
		Shell: $SSNcp3tCB2B.default,
		layouts: [],
		Cmp: lazy(() => $Pousr1nLMIV.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),

				error ? $ERRr_E8L1BS0F : $Pousr1nLMIV,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: true,
		catchAll: false,
		type: '$P',
	},
	'/posts': [
		{
			__id: '$PvISJNqa80G',
			__path: '/posts',
			__params: [],
			Shell: $SSNcp3tCB2B.default,
			layouts: [],
			Cmp: lazy(() => $PvISJNqa80G.then(m => ({ default: m.default }))),
			Err: null,
			metadata({ params, error }: { params?: Params; error?: Error }) {
				const modules = [
					Promise.resolve($SSNcp3tCB2B),

					error ? Promise.resolve() : $PvISJNqa80G,
				].filter(Boolean)

				return resolveMetadata(modules, { params, error })
			},
			prerender: true,
			dynamic: false,
			catchAll: false,
			type: '$P',
		},
		{
			__id: '$AK7lKN8reGt',
			__path: '/posts',
			__params: [],
			method: 'GET',
			handler: $AK7lKN8reGt,
			type: '$A',
		},
		{
			__id: '$AWyqilYZGpp',
			__path: '/posts',
			__params: [],
			method: 'POST',
			handler: $AWyqilYZGpp,
			type: '$A',
		},
	],
	'/test/*': {
		__id: '$PLNzLiMz29j',
		__path: '/test/*',
		__params: ['catch'],
		Shell: $SSNcp3tCB2B.default,
		layouts: [],
		Cmp: lazy(() => $PLNzLiMz29j.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SSNcp3tCB2B),

				error ? Promise.resolve() : $PLNzLiMz29j,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: true,
		type: '$P',
	},
} satisfies Manifest
