import { describe, expect, it } from 'vitest'

import { BoundaryError } from '../../../../src/internal/boundary-error.js'
import {
	HttpException,
	abort,
	isHttpException,
	toHttpException,
	toHttpExceptionLike,
} from '../../../../src/internal/navigation/http-exception.js'
import {
	Redirect,
	isRedirect,
	redirect,
	toRedirect,
	toRedirectLike,
} from '../../../../src/internal/navigation/redirect.js'

describe('HttpException', () => {
	describe('constructor', () => {
		it('creates with status and message', () => {
			const e = new HttpException(404, 'Not found')
			expect(e.status).toBe(404)
			expect(e.message).toBe('Not found')
			expect(e.name).toBe('NOT_FOUND')
		})

		it('accepts optional payload', () => {
			const e = new HttpException(401, 'Unauthorized', { payload: { reason: 'expired' } })
			expect(e.payload).toEqual({ reason: 'expired' })
		})

		it('sets digest', () => {
			const e = new HttpException(500, 'Server error')
			expect(e.digest).toBe('HTTP_EXCEPTION:500:Server error')
		})

		it('preserves cause', () => {
			const cause = new Error('root')
			const e = new HttpException(500, 'wrap', { cause })
			expect(e.cause).toBe(cause)
		})

		it('uses correct name for each status', () => {
			expect(new HttpException(401, 'a').name).toBe('UNAUTHORIZED')
			expect(new HttpException(403, 'a').name).toBe('FORBIDDEN')
			expect(new HttpException(404, 'a').name).toBe('NOT_FOUND')
			expect(new HttpException(500, 'a').name).toBe('INTERNAL_SERVER_ERROR')
		})
	})

	describe('isHttpException', () => {
		it('returns true for HttpException', () => {
			expect(isHttpException(new HttpException(404, ''))).toBe(true)
		})

		it('returns false for Error', () => {
			expect(isHttpException(new Error('boom'))).toBe(false)
		})

		it('returns false for null/undefined', () => {
			expect(isHttpException(null)).toBe(false)
			expect(isHttpException(undefined)).toBe(false)
		})

		it('returns true for duck-typed objects with digest prefix', () => {
			expect(isHttpException({ digest: 'HTTP_EXCEPTION:404:msg' })).toBe(true)
		})
	})

	describe('toHttpException', () => {
		it('returns HttpException as-is', () => {
			const e = new HttpException(403, 'x')
			expect(toHttpException(e)).toBe(e)
		})

		it('converts Error to 500 HttpException', () => {
			const r = toHttpException(new Error('boom'))
			expect(r.status).toBe(500)
			expect(r.message).toBe('boom')
		})

		it('extracts status from digest', () => {
			const err = new BoundaryError('x')
			err.digest = 'HTTP_EXCEPTION:401:unauth'
			expect(toHttpException(err).status).toBe(401)
		})

		it('extracts status from object property', () => {
			const r = toHttpException({ status: 403, message: 'denied' })
			expect(r.status).toBe(403)
		})

		it('defaults to 500 for unknown shapes', () => {
			expect(toHttpException('random').status).toBe(500)
		})

		it('reconstructs from digest with message', () => {
			const err = new BoundaryError('x')
			err.digest = 'HTTP_EXCEPTION:404:custom message'
			const r = toHttpException(err)
			expect(r.status).toBe(404)
			expect(r.message).toBe('custom message')
		})
	})

	describe('toHttpExceptionLike', () => {
		it('converts HttpException to plain object', () => {
			const e = new HttpException(404, 'Not found', { payload: { id: '123' } })
			const r = toHttpExceptionLike(e)
			expect(r).toMatchObject({
				name: 'NOT_FOUND',
				message: 'Not found',
				status: 404,
				payload: { id: '123' },
			})
		})

		it('converts Error without status', () => {
			const r = toHttpExceptionLike(new Error('generic'))
			expect(r.status).toBeUndefined()
		})
	})

	describe('abort', () => {
		it('throws an HttpException', () => {
			expect(() => abort(401, 'go away')).toThrow(HttpException)
			expect(() => abort(401, 'go away')).toThrow('go away')
		})
	})
})

describe('Redirect', () => {
	describe('constructor', () => {
		it('creates redirect with path', () => {
			const r = new Redirect('/login')
			expect(r.url).toBe('/login')
			expect(r.status).toBe(307)
			expect(r.name).toBe('Redirect')
		})

		it('accepts custom status', () => {
			expect(new Redirect('/login', 301).status).toBe(301)
			expect(new Redirect('/login', 302).status).toBe(302)
			expect(new Redirect('/login', 308).status).toBe(308)
		})

		it('sets digest', () => {
			expect(new Redirect('/login', 302).digest).toBe('REDIRECT:302:/login')
		})

		it('accepts absolute http/https URLs', () => {
			expect(new Redirect('https://example.com').url).toBe('https://example.com')
		})

		it('rejects protocol-relative URLs', () => {
			expect(() => new Redirect('//evil.com')).toThrow()
		})

		it('rejects control characters', () => {
			expect(() => new Redirect('/log\n')).toThrow()
			expect(() => new Redirect('/log\r')).toThrow()
		})

		it('rejects non-http/https absolute URLs', () => {
			expect(() => new Redirect('ftp://files')).toThrow()
		})

		it('rejects invalid URL strings', () => {
			expect(() => new Redirect(':::')).toThrow()
		})
	})

	describe('isRedirect', () => {
		it('returns true for Redirect', () => {
			expect(isRedirect(new Redirect('/home'))).toBe(true)
		})

		it('returns false for Error', () => {
			expect(isRedirect(new Error('boom'))).toBe(false)
		})

		it('returns false for null/undefined', () => {
			expect(isRedirect(null)).toBe(false)
			expect(isRedirect(undefined)).toBe(false)
		})

		it('returns true for duck-typed digest', () => {
			expect(isRedirect({ digest: 'REDIRECT:301:/x' })).toBe(true)
		})
	})

	describe('toRedirect', () => {
		it('returns Redirect as-is', () => {
			const r = new Redirect('/home', 302)
			expect(toRedirect(r)).toBe(r)
		})

		it('reconstructs from digest', () => {
			const err = new BoundaryError('x')
			err.digest = 'REDIRECT:301:/new-home'
			const r = toRedirect(err)
			expect(r.url).toBe('/new-home')
			expect(r.status).toBe(301)
		})

		it('extracts from url/status properties', () => {
			const r = toRedirect({ url: '/fallback', status: 308, message: 'moved' })
			expect(r.url).toBe('/fallback')
			expect(r.status).toBe(308)
		})

		it('throws if no url can be resolved', () => {
			expect(() => toRedirect(new Error('no url'))).toThrow()
		})

		it('defaults status to 307', () => {
			const r = toRedirect({ url: '/x' })
			expect(r.status).toBe(307)
		})
	})

	describe('toRedirectLike', () => {
		it('converts Redirect to plain object', () => {
			const r = new Redirect('/gone', 301)
			expect(toRedirectLike(r)).toMatchObject({
				name: 'Redirect',
				digest: 'REDIRECT:301:/gone',
				url: '/gone',
				status: 301,
			})
		})

		it('handles Error without redirect fields', () => {
			const r = toRedirectLike(new Error('generic'))
			expect(r.status).toBeUndefined()
			expect(r.url).toBeUndefined()
		})
	})

	describe('redirect', () => {
		it('throws a Redirect', () => {
			expect(() => redirect('/login')).toThrow(Redirect)
			expect(() => redirect('/login', 302)).toThrow('/login')
		})
	})
})
