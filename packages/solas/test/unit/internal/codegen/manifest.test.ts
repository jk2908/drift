import { describe, expect, it } from 'vitest'

import type { Segment } from '../../../../src/types.js'
import { writeManifest } from '../../../../src/internal/codegen/manifest.js'
import { createSegment } from '../../../utils.js'

describe('writeManifest', () => {
	it('generates manifest export', () => {
		const manifest = { '/': createSegment('/') }
		const result = writeManifest(manifest)
		expect(result).toContain('export const manifest =')
		expect(result).toContain('satisfies Manifest')
	})

	it('serialises manifest as source literal', () => {
		const manifest = { '/about': createSegment('/about') }
		const result = writeManifest(manifest)
		expect(result).toContain('/about')
		expect(result).toContain('__kind')
	})

	it('includes type import', () => {
		const result = writeManifest({})
		expect(result).toContain("import type { Manifest } from '@jk2908/solas'")
	})

	it('snapshot: empty manifest', () => {
		expect(writeManifest({})).toMatchSnapshot()
	})

	it('snapshot: single route', () => {
		expect(writeManifest({ '/': createSegment('/') })).toMatchSnapshot()
	})

	it('snapshot: multiple routes with dynamic params', () => {
		const manifest = {
			'/': createSegment('/'),
			'/about': createSegment('/about'),
			'/posts/:id': createSegment('/posts/:id', { __params: ['id'], dynamic: true }),
		}
		expect(writeManifest(manifest)).toMatchSnapshot()
	})

	it('snapshot: route with all path types', () => {
		const entry: Segment = {
			...createSegment('/'),
			paths: {
				layouts: ['../app/+layout'],
				'401s': [null],
				'403s': [null],
				'404s': ['../app/+404'],
				'500s': ['../app/+500'],
				loaders: ['../app/+loading'],
				middlewares: [null],
				page: '../app/+page',
			},
		}
		expect(writeManifest({ '/': entry })).toMatchSnapshot()
	})
})
