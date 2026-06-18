import { test, expect } from '@playwright/test'

test.describe('error boundaries', () => {
	test('renders custom 404 page for unknown routes', async ({ page }) => {
		await page.goto('/nonexistent-page')

		await expect(page.locator('h1')).toHaveText('404 - Page Not Found')
		await expect(page.locator('p')).toContainText('does not exist')
	})

	test('404 page returns 404 status code', async ({ page }) => {
		const response = await page.goto('/nonexistent-page')
		expect(response?.status()).toBe(404)
	})

	test('404 page is wrapped in root layout', async ({ page }) => {
		await page.goto('/nonexistent-page')

		await expect(page.locator('header')).toHaveText('E2E Test App')
		await expect(page.locator('footer')).toHaveText('Footer')
	})

	test('renders custom 500 page when page throws', async ({ page }) => {
		await page.goto('/error')

		await expect(page.locator('h1')).toHaveText('500 - Server Error')
	})

	test('500 page returns 500 status code', async ({ page }) => {
		const response = await page.goto('/error')
		expect(response?.status()).toBe(500)
	})

	test('500 page is wrapped in root layout', async ({ page }) => {
		await page.goto('/error')

		await expect(page.locator('header')).toHaveText('E2E Test App')
		await expect(page.locator('footer')).toHaveText('Footer')
	})
})
