import { test, expect } from '@playwright/test'

test.describe('dynamic routes', () => {
	test('renders page with dynamic param', async ({ page }) => {
		await page.goto('/posts/42')

		await expect(page.locator('h1')).toHaveText('Post 42')
		await expect(page.locator('p')).toContainText('post number 42')
	})

	test('renders different content for different params', async ({ page }) => {
		await page.goto('/posts/123')

		await expect(page.locator('h1')).toHaveText('Post 123')
	})

	test('dynamic route is wrapped in root layout', async ({ page }) => {
		await page.goto('/posts/1')

		await expect(page.locator('header')).toHaveText('E2E Test App')
		await expect(page.locator('footer')).toHaveText('Footer')
	})

	test('dynamic route has correct title metadata', async ({ page }) => {
		await page.goto('/posts/99')

		await expect(page).toHaveTitle('Post - E2E Test')
	})

	test('dynamic route returns 200 status', async ({ page }) => {
		const response = await page.goto('/posts/1')
		expect(response?.status()).toBe(200)
	})

	test('SSR includes dynamic param in page source', async ({ page }) => {
		await page.goto('/posts/777')

		const html = await page.content()
		expect(html).toContain('777')
		expect(html).toContain('Post')
	})
})
