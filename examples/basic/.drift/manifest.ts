import { lazy } from 'react'

import type { Metadata, Params, Manifest } from '@jk2908/drift'

import { resolveMetadata } from '@jk2908/drift/shared/metadata'

import { GET as $AHK8Cp3nYPg } from '../app/posts/+api'
import { POST as $A5H9VRHqwYP } from '../app/posts/+api'
import * as $SwwZJ0E_5pk from '../app/+layout'

const $Pi9hOnK2drx = import('../app/+page')
const $PT2yNCPyk_h = import('../app/foo/+page')
const $Pb4gmUKp2eC = import('../app/test/[...catch]/+page')
const $P1IEaU8CCYm = import('../app/posts/+page')
const $ERRMhzXJctLdM = import('../app/posts/+error')
const $LkQTl20fWdQ = import('../app/about/+layout')
const $Pyp9AbaaLDc = import('../app/about/another/+page')
const $ERRThVyxKT4Kt = import('../app/about/another/+error')
const $L9oL5wBw3rd = import('../app/about/+layout')
const $PbbIRqejh8p = import('../app/about/+page')
const $Lyce2G51PdA = import('../app/about/+layout')
const $L59HYzi6cfQ = import('../app/about/me/+layout')
const $PTuPuUJOtBB = import('../app/about/me/+page')
const $PG8tUDbOauY = import('../app/p/[id]/+page')

export const manifest = {
	'/': {
		__id: '$Pi9hOnK2drx',
		__path: '/',
		__params: [],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [],
		Cmp: lazy(() => $Pi9hOnK2drx.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),

				error ? Promise.resolve() : $Pi9hOnK2drx,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/about': {
		__id: '$PbbIRqejh8p',
		__path: '/about',
		__params: [],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [lazy(() => $L9oL5wBw3rd.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $PbbIRqejh8p.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),
				$L9oL5wBw3rd,
				error ? $ERRThVyxKT4Kt : $PbbIRqejh8p,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/about/another': {
		__id: '$Pyp9AbaaLDc',
		__path: '/about/another',
		__params: [],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [lazy(() => $LkQTl20fWdQ.then(m => ({ default: m.default })))],
		Cmp: lazy(() => $Pyp9AbaaLDc.then(m => ({ default: m.default }))),
		Err: lazy(() => $ERRThVyxKT4Kt.then(m => ({ default: m.default }))),
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),
				$LkQTl20fWdQ,
				error ? $ERRThVyxKT4Kt : $Pyp9AbaaLDc,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/about/me': {
		__id: '$PTuPuUJOtBB',
		__path: '/about/me',
		__params: [],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [
			lazy(() => $L59HYzi6cfQ.then(m => ({ default: m.default }))),
			lazy(() => $Lyce2G51PdA.then(m => ({ default: m.default }))),
		],
		Cmp: lazy(() => $PTuPuUJOtBB.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),
				$Lyce2G51PdA,
				$L59HYzi6cfQ,
				error ? $ERRThVyxKT4Kt : $PTuPuUJOtBB,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/foo': {
		__id: '$PT2yNCPyk_h',
		__path: '/foo',
		__params: [],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [],
		Cmp: lazy(() => $PT2yNCPyk_h.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),

				error ? Promise.resolve() : $PT2yNCPyk_h,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: false,
		type: '$P',
	},
	'/p/:id': {
		__id: '$PG8tUDbOauY',
		__path: '/p/:id',
		__params: ['id'],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [],
		Cmp: lazy(() => $PG8tUDbOauY.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),

				error ? $ERRThVyxKT4Kt : $PG8tUDbOauY,
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
			__id: '$P1IEaU8CCYm',
			__path: '/posts',
			__params: [],
			Shell: $SwwZJ0E_5pk.default,
			layouts: [],
			Cmp: lazy(() => $P1IEaU8CCYm.then(m => ({ default: m.default }))),
			Err: lazy(() => $ERRMhzXJctLdM.then(m => ({ default: m.default }))),
			metadata({ params, error }: { params?: Params; error?: Error }) {
				const modules = [
					Promise.resolve($SwwZJ0E_5pk),

					error ? $ERRMhzXJctLdM : $P1IEaU8CCYm,
				].filter(Boolean)

				return resolveMetadata(modules, { params, error })
			},
			prerender: true,
			dynamic: false,
			catchAll: false,
			type: '$P',
		},
		{
			__id: '$AHK8Cp3nYPg',
			__path: '/posts',
			__params: [],
			method: 'GET',
			handler: $AHK8Cp3nYPg,
			type: '$A',
		},
		{
			__id: '$A5H9VRHqwYP',
			__path: '/posts',
			__params: [],
			method: 'POST',
			handler: $A5H9VRHqwYP,
			type: '$A',
		},
	],
	'/test/*': {
		__id: '$Pb4gmUKp2eC',
		__path: '/test/*',
		__params: ['catch'],
		Shell: $SwwZJ0E_5pk.default,
		layouts: [],
		Cmp: lazy(() => $Pb4gmUKp2eC.then(m => ({ default: m.default }))),
		Err: null,
		metadata({ params, error }: { params?: Params; error?: Error }) {
			const modules = [
				Promise.resolve($SwwZJ0E_5pk),

				error ? Promise.resolve() : $Pb4gmUKp2eC,
			].filter(Boolean)

			return resolveMetadata(modules, { params, error })
		},
		prerender: true,
		dynamic: false,
		catchAll: true,
		type: '$P',
	},
} satisfies Manifest
