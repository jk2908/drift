import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: '.',
	testMatch: '**/*.spec.ts',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	globalSetup: './global-setup.ts',
	globalTeardown: './global-teardown.ts',
	use: {
		baseURL: 'http://localhost:8787',
	},
	projects: [
		{
			name: 'dev',
		},
		{
			name: 'production',
			use: {
				baseURL: 'http://localhost:8788',
			},
		},
	],
})
