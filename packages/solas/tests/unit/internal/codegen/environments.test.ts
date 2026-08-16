import { describe, it, expect } from 'vitest'

import {
	writeRSCEntry,
	writeSSREntry,
	writeBrowserEntry,
} from '../../../../src/internal/codegen/environments.js'

describe('writeRSCEntry', () => {
	it('generates RSC handler code', () => {
		const result = writeRSCEntry({ runtime: 'node', trailingSlash: 'never' })
		expect(result).toContain(
			'export default createHandler(config, manifest, importMap, runtimeManifest)',
		)
		expect(result).toContain(
			"import { createHandler, createRuntime, loadManifest, Runtime } from '@jk2908/solas/env/rsc'",
		)
		expect(result).toContain('Runtime.runtime = createRuntime')
		expect(result).toContain("await loadManifest('dist')")
	})

	it('includes hmr accept', () => {
		const result = writeRSCEntry({ runtime: 'node' })
		expect(result).toContain('import.meta.hot')
	})

	it('serialises runtime as string literal', () => {
		const result = writeRSCEntry({ runtime: 'node' })
		expect(result).toContain("'node'")
	})

	it('snapshot: node runtime', () => {
		expect(writeRSCEntry({ runtime: 'node' })).toMatchSnapshot()
	})

	it('snapshot: bun runtime with trailing slash', () => {
		expect(writeRSCEntry({ runtime: 'bun', trailingSlash: 'always' })).toMatchSnapshot()
	})
})

describe('writeSSREntry', () => {
	it('generates SSR handler code', () => {
		const result = writeSSREntry()
		expect(result).toContain(
			"export { prerender, resume, ssr } from '@jk2908/solas/env/ssr'",
		)
	})

	it('snapshot', () => {
		expect(writeSSREntry()).toMatchSnapshot()
	})
})

describe('writeBrowserEntry', () => {
	it('generates browser init code', () => {
		const result = writeBrowserEntry()
		expect(result).toContain("import { browser } from '@jk2908/solas/env/browser'")
		expect(result).toContain('browser()')
	})

	it('snapshot', () => {
		expect(writeBrowserEntry()).toMatchSnapshot()
	})
})
