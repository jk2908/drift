import { test, expect } from '@playwright/test'

test.describe('nested layouts', () => {
	test('renders nested layout within root layout', async ({ page }) => {
		await page.goto('/dashboard')

		await expect(page.locator('header')).toHaveText('E2E Test App')
		await expect(page.locator('nav')).toHaveText('Dashboard Nav')
		await expect(page.locator('h1')).toHaveText('Dashboard Home')
	})

	test('nested layout page has correct title', async ({ page }) => {
		await page.goto('/dashboard')

		await expect(page).toHaveTitle('Dashboard - E2E Test')
	})

	test('root layout wraps nested layout', async ({ page }) => {
		await page.goto('/dashboard')

		const html = await page.content()
		expect(html).toContain('E2E Test App')
		expect(html).toContain('Dashboard Nav')
		expect(html).toContain('Dashboard Home')
		expect(html).toContain('Footer')
	})

	test('nested layout returns 200 status', async ({ page }) => {
		const response = await page.goto('/dashboard')
		expect(response?.status()).toBe(200)
	})
})
