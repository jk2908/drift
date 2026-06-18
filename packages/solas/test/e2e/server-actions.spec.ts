import { test, expect } from '@playwright/test'

test.describe('server actions', () => {
	test('renders page with server action form', async ({ page }) => {
		await page.goto('/actions')

		await expect(page.locator('h1')).toHaveText('Server Actions')
		await expect(page.getByTestId('increment')).toBeVisible()
		await expect(page.getByTestId('reset')).toBeVisible()
	})

	test('page has correct title metadata', async ({ page }) => {
		await page.goto('/actions')
		await expect(page).toHaveTitle('Actions - E2E Test')
	})

	test('form submission triggers server action', async ({ page }) => {
		await page.goto('/actions')

		await page.getByTestId('increment').click()

		await expect(page).toHaveURL(/\/actions/)
	})

	test('reset action works', async ({ page }) => {
		await page.goto('/actions')

		await page.getByTestId('increment').click()
		await page.getByTestId('reset').click()

		await expect(page).toHaveURL(/\/actions/)
	})

	test('server action page is wrapped in layout', async ({ page }) => {
		await page.goto('/actions')

		await expect(page.locator('header')).toHaveText('E2E Test App')
		await expect(page.locator('footer')).toHaveText('Footer')
	})
})
