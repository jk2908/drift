import { describe, expect, it } from 'vitest'

import { HttpException } from '../../../src/internal/navigation/http-exception.js'
import { Resolver } from '../../../src/internal/resolver.js'
import {
	createEndpoint,
	createMatch,
	createRouterMatch,
	createSegment,
	createSegmentWith404,
} from '../../utils.js'

function createResolver(manifest = {}) {
	return new Resolver(manifest, {})
}

describe('Resolver', () => {
	describe('narrow', () => {
		it('returns the page entry from an array', () => {
			const page = createSegment('/about')
			const endpoint = createEndpoint('/about')
			expect(Resolver.narrow([page, endpoint])).toEqual(page)
		})

		it('returns null when no page entry in array', () => {
			expect(Resolver.narrow([createEndpoint('/api')])).toBeNull()
		})

		it('returns the entry directly if it is a page', () => {
			const page = createSegment('/about')
			expect(Resolver.narrow(page)).toEqual(page)
		})

		it('returns null if entry is an endpoint (not a page)', () => {
			expect(Resolver.narrow(createEndpoint('/api'))).toBeNull()
		})

		it('returns null for undefined', () => {
			expect(Resolver.narrow(undefined)).toBeNull()
		})

		it('returns null for empty array', () => {
			expect(Resolver.narrow([])).toBeNull()
		})
	})

	describe('getMatchStatusCode', () => {
		it('returns 404 for null match', () => {
			expect(Resolver.getMatchStatusCode(null)).toBe(404)
		})

		it('returns 200 for match without error', () => {
			expect(Resolver.getMatchStatusCode(createMatch())).toBe(200)
		})

		it('returns 404 for HttpException with status 404', () => {
			expect(
				Resolver.getMatchStatusCode(
					createMatch({ error: new HttpException(404, 'Not found') }),
				),
			).toBe(404)
		})

		it('returns 500 for HttpException with status 500', () => {
			expect(
				Resolver.getMatchStatusCode(
					createMatch({ error: new HttpException(500, 'Server error') }),
				),
			).toBe(500)
		})

		it('returns 500 for non-HttpException error', () => {
			expect(
				Resolver.getMatchStatusCode(createMatch({ error: new Error('generic') })),
			).toBe(500)
		})
	})

	describe('reconcile', () => {
		it('returns match entry when manifest has matching route', () => {
			const resolver = createResolver({ '/about': createSegment('/about') })
			const result = resolver.reconcile(
				'/about',
				createRouterMatch({ params: { id: '123' } }),
			)
			expect(result).not.toBeNull()
			expect(result!.__path).toBe('/about')
			expect(result!.params).toEqual({ id: '123' })
		})

		it('returns entry with error when error is passed', () => {
			const resolver = createResolver({ '/about': createSegment('/about') })
			const err = new Error('boom')
			const result = resolver.reconcile('/about', createRouterMatch(), err)
			expect(result).not.toBeNull()
			expect(result!.error).toBe(err)
		})

		it('falls back to closest 404 entry when no match', () => {
			const resolver = createResolver({ '/': createSegmentWith404('/') })
			const result = resolver.reconcile('/nonexistent', null)
			expect(result).not.toBeNull()
			expect(result!.__path).toBe('/')
			expect(result!.error).toBeInstanceOf(HttpException)
			expect('status' in result!.error! && result!.error.status).toBe(404)
		})

		it('returns null when no match and no 404', () => {
			const resolver = createResolver({ '/about': createSegment('/about') })
			expect(resolver.reconcile('/nonexistent', null)).toBeNull()
		})

		it('returns null when match route is not a page', () => {
			const resolver = createResolver({
				'/api/data': createEndpoint('/api/data'),
			})
			expect(resolver.reconcile('/api/data', createRouterMatch())).toBeNull()
		})
	})

	describe('closest', () => {
		it('finds entry at exact path', () => {
			const resolver = createResolver({
				'/': createSegment('/'),
				'/about': createSegment('/about'),
			})
			const result = resolver.closest('/about', 'paths.404s')
			expect(result).not.toBeNull()
			expect(result!.__path).toBe('/about')
		})

		it('walks up path segments when no direct match', () => {
			const resolver = createResolver({ '/': createSegmentWith404('/') })
			const result = resolver.closest('/a/b/c', 'paths.404s')
			expect(result).not.toBeNull()
			expect(result!.__path).toBe('/')
		})

		it('returns null when no ancestor has the property', () => {
			expect(createResolver().closest('/a/b', 'paths.404s')).toBeNull()
		})

		it('returns the closest entry even when nested property partially matches', () => {
			const resolver = createResolver({
				'/': createSegmentWith404('/'),
				'/blog': createSegment('/blog'),
			})
			const result = resolver.closest('/blog/post', 'paths.404s')
			expect(result).not.toBeNull()
			expect(result!.__path).toBe('/blog')
		})
	})

	describe('enhance', () => {
		it('returns null for null match', () => {
			expect(createResolver().enhance(null)).toBeNull()
		})

		it('returns null when importMap has no entry', () => {
			const entry = {
				...createSegment('/x'),
				__id: 'nonexistent',
				params: {},
				error: undefined,
			}
			expect(createResolver().enhance(entry)).toBeNull()
		})

		it('returns enhanced match for partial importMap entry', () => {
			const resolver = new Resolver(
				{},
				{
					$Phash: {
						shell: { default: 'Shell' },
						page: async () => ({ default: 'Page' }),
					},
				},
			)
			const entry = {
				...createSegment('/x'),
				__id: '$Phash',
				params: { id: '1' },
				error: undefined,
			}
			const result = resolver.enhance(entry)
			expect(result).not.toBeNull()
			expect(result!.params).toEqual({ id: '1' })
		})
	})
})
