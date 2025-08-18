import { lazy } from 'react'

    import type { Metadata, Params, Manifest } from '@jk2908/drift'

    import { resolveMetadata } from '@jk2908/drift/shared/metadata'

    import { GET as $ATjP1z3ZLzm } from '../app/posts/+api'
import { POST as $AP9o6MBBAXG } from '../app/posts/+api'
    import * as $SzFJs6XlAWb from '../app/+layout'

    const $PdrfatBs32g = import('../app/foo/+page')
const $Pzd_9uUuvO6 = import('../app/posts/+page')
const $ERRHZKgyL40ge = import('../app/posts/+error')
const $P7feIj2QdeD = import('../app/test/[...catch]/+page')
const $PU8RdRlrrtV = import('../app/+page')
const $LuJ5g6JJKtQ = import('../app/about/+layout')
const $Lx5FTp0btrx = import('../app/about/+layout')
const $P09rw8uSKBD = import('../app/about/+page')
const $LoGqQaImCe2 = import('../app/about/+layout')
const $P26EvynBlCn = import('../app/about/another/+page')
const $ERR5Bg23oCV0F = import('../app/about/another/+error')
const $LS9H3QtJ_oh = import('../app/about/me/+layout')
const $PcaQEg3Z5mf = import('../app/about/me/+page')
const $Poq1CBk9YWD = import('../app/p/[id]/+page')

    export const manifest = {
      '/': {
              __id: '$PU8RdRlrrtV',
							__path: '/',
							__params: [],
              Shell: $SzFJs6XlAWb.default,
              layouts: [],
              Cmp: lazy(() => $PU8RdRlrrtV.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									
									error ? $ERRHZKgyL40ge : $PU8RdRlrrtV
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/about': {
              __id: '$P09rw8uSKBD',
							__path: '/about',
							__params: [],
              Shell: $SzFJs6XlAWb.default,
              layouts: [lazy(() => $Lx5FTp0btrx.then(m => ({ default: m.default })))],
              Cmp: lazy(() => $P09rw8uSKBD.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									$Lx5FTp0btrx,
									error ? $ERRHZKgyL40ge : $P09rw8uSKBD
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/about/another': {
              __id: '$P26EvynBlCn',
							__path: '/about/another',
							__params: [],
              Shell: $SzFJs6XlAWb.default,
              layouts: [lazy(() => $LoGqQaImCe2.then(m => ({ default: m.default })))],
              Cmp: lazy(() => $P26EvynBlCn.then(m => ({ default: m.default }))),
              Err: lazy(() => $ERR5Bg23oCV0F.then(m => ({ default: m.default }))),
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									$LoGqQaImCe2,
									error ? $ERR5Bg23oCV0F : $P26EvynBlCn
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/about/me': {
              __id: '$PcaQEg3Z5mf',
							__path: '/about/me',
							__params: [],
              Shell: $SzFJs6XlAWb.default,
              layouts: [lazy(() => $LS9H3QtJ_oh.then(m => ({ default: m.default }))), lazy(() => $LuJ5g6JJKtQ.then(m => ({ default: m.default })))],
              Cmp: lazy(() => $PcaQEg3Z5mf.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									$LuJ5g6JJKtQ, $LS9H3QtJ_oh,
									error ? $ERR5Bg23oCV0F : $PcaQEg3Z5mf
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/foo': {
              __id: '$PdrfatBs32g',
							__path: '/foo',
							__params: [],
              Shell: $SzFJs6XlAWb.default,
              layouts: [],
              Cmp: lazy(() => $PdrfatBs32g.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									
									error ? Promise.resolve() : $PdrfatBs32g
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
'/p/:id': {
              __id: '$Poq1CBk9YWD',
							__path: '/p/:id',
							__params: ['id'],
              Shell: $SzFJs6XlAWb.default,
              layouts: [],
              Cmp: lazy(() => $Poq1CBk9YWD.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									
									error ? $ERR5Bg23oCV0F : $Poq1CBk9YWD
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: true,
              catchAll: false,
              type: '$P',
            },
'/posts': [{
              __id: '$Pzd_9uUuvO6',
							__path: '/posts',
							__params: [],
              Shell: $SzFJs6XlAWb.default,
              layouts: [],
              Cmp: lazy(() => $Pzd_9uUuvO6.then(m => ({ default: m.default }))),
              Err: lazy(() => $ERRHZKgyL40ge.then(m => ({ default: m.default }))),
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									
									error ? $ERRHZKgyL40ge : $Pzd_9uUuvO6
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: false,
              type: '$P',
            },
{
              __id: '$ATjP1z3ZLzm',
							__path: '/posts',
							__params: [],
              method: 'GET',
              handler: $ATjP1z3ZLzm,
              type: '$A',
            },
{
              __id: '$AP9o6MBBAXG',
							__path: '/posts',
							__params: [],
              method: 'POST',
              handler: $AP9o6MBBAXG,
              type: '$A',
            }],
'/test/*': {
              __id: '$P7feIj2QdeD',
							__path: '/test/*',
							__params: ['catch'],
              Shell: $SzFJs6XlAWb.default,
              layouts: [],
              Cmp: lazy(() => $P7feIj2QdeD.then(m => ({ default: m.default }))),
              Err: null,
							metadata({ params, error }: { params?: Params; error?: Error }) {
								const modules = [
									Promise.resolve($SzFJs6XlAWb),
									
									error ? $ERRHZKgyL40ge : $P7feIj2QdeD
								].filter(Boolean)

								return resolveMetadata(modules, { params, error })
							},
              prerender: true,
              dynamic: false,
              catchAll: true,
              type: '$P',
            }
    } satisfies Manifest