import { test, expect } from '@playwright/test'

test.describe('redirects', () => {
	test('server-side redirect navigates to target', async ({ page }) => {
		await page.goto('/redirect')

		await expect(page).toHaveURL(/\/about/)
		await expect(page.locator('h1')).toHaveText('About')
	})

	test('redirected page has correct title', async ({ page }) => {
		await page.goto('/redirect')

		await expect(page).toHaveTitle('About - E2E Test')
	})

	test('redirect preserves layout', async ({ page }) => {
		await page.goto('/redirect')

		await expect(page.locator('header')).toHaveText('E2E Test App')
		await expect(page.locator('footer')).toHaveText('Footer')
	})

	test('redirect completes within reasonable time', async ({ page }) => {
		const start = Date.now()
		await page.goto('/redirect')
		await expect(page.locator('h1')).toHaveText('About')
		const elapsed = Date.now() - start
		expect(elapsed).toBeLessThan(10000)
	})
})
