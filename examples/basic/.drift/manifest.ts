import { lazy } from 'react'

    import type { Metadata, Params, Manifest } from '@jk2908/drift'

    import { resolveMetadata } from '@jk2908/drift/shared/metadata'

    import { GET as $AM3dhYrocld } from '../app/posts/+api'
import { POST as $AoYmOOdIubV } from '../app/posts/+api'
    import * as $STPnu2RB1Nk from '../app/+layout'

    const $P3zvPYQzSNu = import('../app/+page')
const $PCH6N2ojCvP = import('../app/foo/+page')
const $PJj7Otks0lp = import('../app/posts/+page')
const $ERRETW_NlKvcO = import('../app/posts/+error')
const $PBwSQnubU_y = import('../app/test/[...catch]/+page')
const $LGQAG0ADk95 = import('../app/about/+layout')
const $LxTgtzv2tsv = import('../app/about/+layout')
const $PFyoEpG1ksI = import('../app/about/another/+page')
const $ERRaEuuN_iRaI = import('../app/about/another/+error')
const $L7mGzjYgDYd = import('../app/about/+layout')
const $P8NPOTqxiNk = import('../app/about/+page')
const $P_pWCpJfy_w = import('../app/p/[id]/+page')
const $LRdPPLBcymq = import('../app/about/me/+layout')
const $P8ajcVsH6rO = import('../app/about/me/+page')

    export const manifest = {
      '/': {
              __id: '$P3zvPYQzSNu',
							__path: '/',
							__params: [],
              Shell: $STPnu2RB1Nk.default,
              layouts: [],
              Cmp: lazy(() => $P3zvPYQzSNu.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									
									error ? Promise.resolve() : $P3zvPYQzSNu
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/about': {
              __id: '$P8NPOTqxiNk',
							__path: '/about',
							__params: [],
              Shell: $STPnu2RB1Nk.default,
              layouts: [lazy(() => $L7mGzjYgDYd.then(m => ({ default: m.default })))],
              Cmp: lazy(() => $P8NPOTqxiNk.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									$L7mGzjYgDYd,
									error ? $ERRaEuuN_iRaI : $P8NPOTqxiNk
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/about/another': {
              __id: '$PFyoEpG1ksI',
							__path: '/about/another',
							__params: [],
              Shell: $STPnu2RB1Nk.default,
              layouts: [lazy(() => $LxTgtzv2tsv.then(m => ({ default: m.default })))],
              Cmp: lazy(() => $PFyoEpG1ksI.then(m => ({ default: m.default }))),
              Err: lazy(() => $ERRaEuuN_iRaI.then(m => ({ default: m.default }))),
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									$LxTgtzv2tsv,
									error ? $ERRaEuuN_iRaI : $PFyoEpG1ksI
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/about/me': {
              __id: '$P8ajcVsH6rO',
							__path: '/about/me',
							__params: [],
              Shell: $STPnu2RB1Nk.default,
              layouts: [lazy(() => $LRdPPLBcymq.then(m => ({ default: m.default }))), lazy(() => $LGQAG0ADk95.then(m => ({ default: m.default })))],
              Cmp: lazy(() => $P8ajcVsH6rO.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									$LGQAG0ADk95, $LRdPPLBcymq,
									error ? $ERRaEuuN_iRaI : $P8ajcVsH6rO
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/foo': {
              __id: '$PCH6N2ojCvP',
							__path: '/foo',
							__params: [],
              Shell: $STPnu2RB1Nk.default,
              layouts: [],
              Cmp: lazy(() => $PCH6N2ojCvP.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									
									error ? Promise.resolve() : $PCH6N2ojCvP
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/p/:id': {
              __id: '$P_pWCpJfy_w',
							__path: '/p/:id',
							__params: ['id'],
              Shell: $STPnu2RB1Nk.default,
              layouts: [],
              Cmp: lazy(() => $P_pWCpJfy_w.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									
									error ? $ERRaEuuN_iRaI : $P_pWCpJfy_w
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: true,
              catchAll: false,
              type: '$P',
            },
'/posts': [{
              __id: '$PJj7Otks0lp',
							__path: '/posts',
							__params: [],
              Shell: $STPnu2RB1Nk.default,
              layouts: [],
              Cmp: lazy(() => $PJj7Otks0lp.then(m => ({ default: m.default }))),
              Err: lazy(() => $ERRETW_NlKvcO.then(m => ({ default: m.default }))),
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									
									error ? $ERRETW_NlKvcO : $PJj7Otks0lp
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
{
              __id: '$AM3dhYrocld',
							__path: '/posts',
							__params: [],
              method: 'GET',
              handler: $AM3dhYrocld,
              type: '$A',
            },
{
              __id: '$AoYmOOdIubV',
							__path: '/posts',
							__params: [],
              method: 'POST',
              handler: $AoYmOOdIubV,
              type: '$A',
            }],
'/test/*': {
              __id: '$PBwSQnubU_y',
							__path: '/test/*',
							__params: ['catch'],
              Shell: $STPnu2RB1Nk.default,
              layouts: [],
              Cmp: lazy(() => $PBwSQnubU_y.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($STPnu2RB1Nk),
									
									error ? $ERRETW_NlKvcO : $PBwSQnubU_y
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: true,
              type: '$P',
            }
    } satisfies Manifest