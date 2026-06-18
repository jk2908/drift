import { test, expect } from '@playwright/test'

test.describe('middleware', () => {
	test('middleware adds custom header to responses', async ({ request }) => {
		const response = await request.get('/')
		expect(response.headers()['x-middleware']).toBe('executed')
	})

	test('middleware runs for all routes', async ({ request }) => {
		const home = await request.get('/')
		expect(home.headers()['x-middleware']).toBe('executed')

		const about = await request.get('/about')
		expect(about.headers()['x-middleware']).toBe('executed')
	})

	test('middleware runs for dynamic routes', async ({ request }) => {
		const response = await request.get('/posts/1')
		expect(response.headers()['x-middleware']).toBe('executed')
	})

	test('middleware runs for API endpoints', async ({ request }) => {
		const response = await request.get('/api/data')
		expect(response.headers()['x-middleware']).toBe('executed')
	})

	test('middleware does not run for unmatched routes', async ({ request }) => {
		const response = await request.get('/nonexistent')
		expect(response.headers()['x-middleware']).toBeUndefined()
	})
})
