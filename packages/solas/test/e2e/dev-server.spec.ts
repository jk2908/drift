import { test, expect } from '@playwright/test'

test.describe('dev server', () => {
	test.describe('SSR rendering', () => {
		test('serves the home page with SSR content', async ({ page }) => {
			await page.goto('/')

			await expect(page.locator('header')).toHaveText('E2E Test App')
			await expect(page.locator('h1')).toHaveText('Home')
			await expect(page.locator('footer')).toHaveText('Footer')
		})

		test('renders page with correct title metadata', async ({ page }) => {
			await page.goto('/')
			await expect(page).toHaveTitle('Home - E2E Test')
		})

		test('includes required meta tags', async ({ page }) => {
			await page.goto('/')

			const charset = page.locator('meta[charset]')
			await expect(charset).toHaveAttribute('charset', 'utf-8')

			const viewport = page.locator('meta[name="viewport"]')
			await expect(viewport).toHaveAttribute(
				'content',
				'width=device-width, initial-scale=1',
			)
		})

		test('page source contains SSR-rendered content', async ({ page }) => {
			await page.goto('/')

			const html = await page.content()

			expect(html).toContain('E2E Test App')
			expect(html).toContain('Home')
			expect(html).toContain('Footer')
		})

		test('includes hydration script', async ({ page }) => {
			await page.goto('/')

			const html = await page.content()
			expect(html).toContain('__FLIGHT_DATA')
		})
	})

	test.describe('navigation', () => {
		test('navigates to about page via Link', async ({ page }) => {
			await page.goto('/')

			await page.getByRole('link', { name: 'Go to About' }).click()

			await expect(page.locator('h1')).toHaveText('About')
			await expect(page).toHaveTitle('About - E2E Test')
		})

		test('preserves layout during client-side navigation', async ({ page }) => {
			await page.goto('/')
			await expect(page.locator('header')).toHaveText('E2E Test App')
			await expect(page.locator('footer')).toHaveText('Footer')

			await page.getByRole('link', { name: 'Go to About' }).click()

			await expect(page.locator('header')).toHaveText('E2E Test App')
			await expect(page.locator('footer')).toHaveText('Footer')
		})

		test('Link renders correct href attribute', async ({ page }) => {
			await page.goto('/')

			const link = page.getByRole('link', { name: 'Go to About' })
			await expect(link).toHaveAttribute('href', '/about')
		})
	})

	test.describe('routing', () => {
		test('serves the about page directly', async ({ page }) => {
			await page.goto('/about')

			await expect(page.locator('h1')).toHaveText('About')
			await expect(page.locator('header')).toHaveText('E2E Test App')
		})

		test('returns 404 for unknown routes', async ({ page }) => {
			const response = await page.goto('/does-not-exist')
			expect(response?.status()).toBe(404)
		})

		test('about page has correct title metadata', async ({ page }) => {
			await page.goto('/about')
			await expect(page).toHaveTitle('About - E2E Test')
		})
	})

	test.describe('RSC protocol', () => {
		test('RSC requests return correct content type', async ({ request }) => {
			const response = await request.get('/', {
				headers: { Accept: 'text/x-component' },
			})

			expect(response.status()).toBe(200)
			expect(response.headers()['content-type']).toContain('text/x-component')
		})

		test('HTML requests return correct content type', async ({ request }) => {
			const response = await request.get('/', {
				headers: { Accept: 'text/html' },
			})

			expect(response.status()).toBe(200)
			expect(response.headers()['content-type']).toContain('text/html')
		})
	})
})
