import { describe, it, expect } from 'vitest'

import { HttpException } from '../../../../src/internal/navigation/http-exception.js'
import { takeFirst, toHostOrigin, enforce } from '../../../../src/internal/server/csrf.js'

describe('takeFirst', () => {
	it('returns null for null/undefined/empty', () => {
		expect(takeFirst(null)).toBeNull()
		expect(takeFirst(undefined)).toBeNull()
		expect(takeFirst('')).toBeNull()
	})

	it('returns the first value from a comma-separated list', () => {
		expect(takeFirst('https://example.com')).toBe('https://example.com')
		expect(takeFirst('https://first.com, https://second.com')).toBe('https://first.com')
	})

	it('trims whitespace from the first value', () => {
		expect(takeFirst('  https://example.com  , https://other.com')).toBe(
			'https://example.com',
		)
	})

	it('returns null for whitespace-only input', () => {
		expect(takeFirst('   ')).toBeNull()
	})
})

describe('toHostOrigin', () => {
	it('returns origin for valid host and protocol', () => {
		expect(toHostOrigin('example.com', 'https')).toBe('https://example.com')
	})

	it('returns null for missing host', () => {
		expect(toHostOrigin(null, 'https')).toBeNull()
		expect(toHostOrigin(undefined, 'https')).toBeNull()
	})

	it('returns null for missing protocol', () => {
		expect(toHostOrigin('example.com', null)).toBeNull()
		expect(toHostOrigin('example.com', undefined)).toBeNull()
	})

	it('returns null for invalid host', () => {
		expect(toHostOrigin(':::invalid', 'https')).toBeNull()
	})

	it('handles host with port', () => {
		const origin = toHostOrigin('localhost:3000', 'https')
		expect(origin).toBe('https://localhost:3000')
	})
})

describe('enforce', () => {
	it('passes through safe methods without checking', () => {
		const req = new Request('http://localhost/')
		expect(() => enforce(req)).not.toThrow()
	})

	it('blocks cross-origin unsafe requests without trusted origins', () => {
		const req = new Request('http://localhost/data', {
			method: 'POST',
			headers: { origin: 'https://evil.com' },
		})
		expect(() => enforce(req)).toThrow(HttpException)
		expect(() => enforce(req)).toThrow('Cross-site unsafe requests')
	})

	it('allows same-origin unsafe requests', () => {
		const req = new Request('http://localhost/data', {
			method: 'POST',
			headers: { origin: 'http://localhost' },
		})
		expect(() => enforce(req)).not.toThrow()
	})

	it('allows requests with trusted origins configured', () => {
		const req = new Request('http://localhost/data', {
			method: 'POST',
			headers: { origin: 'https://trusted.com' },
		})
		expect(() => enforce(req, { trustedOrigins: ['https://trusted.com'] })).not.toThrow()
	})

	it('allows requests with sec-fetch-site: same-origin', () => {
		const req = new Request('http://localhost/data', {
			method: 'POST',
			headers: { 'sec-fetch-site': 'same-origin' },
		})
		expect(() => enforce(req)).not.toThrow()
	})

	it('allows requests with sec-fetch-site: none', () => {
		const req = new Request('http://localhost/data', {
			method: 'POST',
			headers: { 'sec-fetch-site': 'none' },
		})
		expect(() => enforce(req)).not.toThrow()
	})

	it('allows requests with no origin and no sec-fetch-site (non-browser client)', () => {
		const req = new Request('http://localhost/data', { method: 'POST' })
		expect(() => enforce(req)).not.toThrow()
	})

	it('blocks PUT with cross-origin origin', () => {
		const req = new Request('http://localhost/data', {
			method: 'PUT',
			headers: { origin: 'https://evil.com' },
		})
		expect(() => enforce(req)).toThrow(HttpException)
	})

	it('blocks DELETE with cross-origin origin', () => {
		const req = new Request('http://localhost/data', {
			method: 'DELETE',
			headers: { origin: 'https://evil.com' },
		})
		expect(() => enforce(req)).toThrow(HttpException)
	})

	it('blocks PATCH with cross-origin origin', () => {
		const req = new Request('http://localhost/data', {
			method: 'PATCH',
			headers: { origin: 'https://evil.com' },
		})
		expect(() => enforce(req)).toThrow(HttpException)
	})
})
