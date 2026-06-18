import { defineConfig } from 'vite'
import solas from '@jk2908/solas'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [
		solas({
			runtime: 'node',
			url: 'http://localhost:8787',
			metadata: {
				title: '%s - E2E Test',
			},
		}),
		react(),
	],
})
