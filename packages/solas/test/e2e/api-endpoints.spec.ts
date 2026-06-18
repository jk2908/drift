import { test, expect } from '@playwright/test'

test.describe('API endpoints', () => {
	test('GET returns JSON response', async ({ request }) => {
		const response = await request.get('/api/data')

		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toContain('application/json')

		const body = await response.json()
		expect(body.message).toBe('Hello from API')
		expect(body.items).toEqual([1, 2, 3])
	})

	test('POST accepts request body', async ({ request }) => {
		const response = await request.post('/api/data', {
			data: 'test payload',
		})

		expect(response.status()).toBe(201)

		const body = await response.json()
		expect(body.received).toBe('test payload')
	})

	test('unsupported method returns 404', async ({ request }) => {
		const response = await request.delete('/api/data')
		expect(response.status()).toBe(404)
	})
})
