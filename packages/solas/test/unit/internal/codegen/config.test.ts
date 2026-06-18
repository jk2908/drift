import { describe, it, expect } from 'vitest'
import { writeConfig } from '../../../../src/internal/codegen/config.js'

describe('writeConfig', () => {
	it('generates config export', () => {
		const result = writeConfig({ runtime: 'node' })
		expect(result).toContain('export { config }')
		expect(result).toContain('const config =')
	})

	it('omits runtime from the exported config', () => {
		const result = writeConfig({ runtime: 'node', trailingSlash: 'always' })
		expect(result).not.toContain('runtime:')
		expect(result).toContain('trailingSlash')
	})

	it('includes logger import when logger level is set', () => {
		const result = writeConfig({ runtime: 'node', logger: { level: 'debug' } })
		expect(result).toContain("import { Logger } from '@jk2908/solas/utils/logger'")
		expect(result).toContain('Logger.defaultLevel')
	})

	it('omits logger import when no logger level', () => {
		const result = writeConfig({ runtime: 'node' })
		expect(result).not.toContain('Logger')
	})

	it('adds satisfies RuntimeConfig', () => {
		const result = writeConfig({ runtime: 'node' })
		expect(result).toContain('satisfies RuntimeConfig')
	})

	it('snapshot: minimal config', () => {
		expect(writeConfig({ runtime: 'node' })).toMatchSnapshot()
	})

	it('snapshot: full config', () => {
		expect(
			writeConfig({
				runtime: 'bun',
				url: 'https://example.com',
				trailingSlash: 'always',
				precompress: true,
				prerender: 'full',
				metadata: { title: 'My Site' },
				logger: { level: 'debug' },
				trustedOrigins: ['https://cdn.example.com'],
			}),
		).toMatchSnapshot()
	})

	it('snapshot: config with sitemap', () => {
		expect(
			writeConfig({
				runtime: 'node',
				url: 'https://example.com',
				sitemap: true,
			}),
		).toMatchSnapshot()
	})
})
