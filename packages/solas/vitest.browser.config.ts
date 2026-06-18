import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
	plugins: [react()],
	optimizeDeps: {
		exclude: ['@vitejs/plugin-rsc'],
	},
	test: {
		browser: {
			enabled: true,
			provider: playwright({ headless: true }),
			instances: [{ browser: 'chromium' }],
		},
		include: ['test/unit/**/*.test.tsx'],
		setupFiles: ['./vitest.browser.setup.ts'],
	},
})
