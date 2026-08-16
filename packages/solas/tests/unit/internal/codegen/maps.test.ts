import { describe, it, expect } from 'vitest'

import { writeMaps } from '../../../../src/internal/codegen/maps.js'

describe('writeMaps', () => {
	it('generates importMap export', () => {
		const result = writeMaps(
			{
				endpoints: { static: new Map() },
				components: { static: new Map(), dynamic: new Map() },
				middlewares: { static: new Map() },
			},
			{},
		)
		expect(result).toContain('export const importMap =')
		expect(result).toContain('satisfies ImportMap')
	})

	it('includes static endpoint imports', () => {
		const result = writeMaps(
			{
				endpoints: { static: new Map([['$Ehash_get', './api/users/+endpoint.ts']]) },
				components: { static: new Map(), dynamic: new Map() },
				middlewares: { static: new Map() },
			},
			{},
		)
		expect(result).toContain('import {')
		expect(result).toContain('from')
	})

	it('includes static component imports', () => {
		const result = writeMaps(
			{
				endpoints: { static: new Map() },
				components: {
					static: new Map([['$Shash', './shell/+layout.tsx']]),
					dynamic: new Map(),
				},
				middlewares: { static: new Map() },
			},
			{},
		)
		expect(result).toContain('import * as')
	})

	it('includes dynamic component imports', () => {
		const result = writeMaps(
			{
				endpoints: { static: new Map() },
				components: {
					static: new Map(),
					dynamic: new Map([['$Phash', './pages/+page.tsx']]),
				},
				middlewares: { static: new Map() },
			},
			{},
		)
		expect(result).toContain('() => import')
	})

	it('includes static middleware imports', () => {
		const result = writeMaps(
			{
				endpoints: { static: new Map() },
				components: { static: new Map(), dynamic: new Map() },
				middlewares: { static: new Map([['$MWhash', './middleware.ts']]) },
			},
			{},
		)
		expect(result).toContain('middleware as')
	})

	it('maps module entries with shell, layouts, page, endpoint', () => {
		const modules = {
			$Phash: {
				shellId: '$Shash',
				layoutIds: ['$Lhash', null],
				pageId: '$Phash',
				endpointId: '$Ehash_get',
				'401Ids': ['$401hash'],
				'403Ids': ['$403hash'],
				'404Ids': ['$404hash'],
				'500Ids': ['$500hash'],
				loadingIds: ['$LOADhash'],
				middlewareIds: ['$MWhash'],
			},
		}
		const result = writeMaps(
			{
				endpoints: { static: new Map() },
				components: { static: new Map(), dynamic: new Map() },
				middlewares: { static: new Map() },
			},
			modules,
		)
		expect(result).toContain('shell:')
		expect(result).toContain('layouts:')
		expect(result).toContain('page:')
		expect(result).toContain('endpoint:')
		expect(result).toContain("'401s':")
		expect(result).toContain("'403s':")
		expect(result).toContain("'404s':")
		expect(result).toContain("'500s':")
		expect(result).toContain('loaders:')
		expect(result).toContain('middlewares:')
	})

	it('handles empty module', () => {
		const modules = { $Phash: {} }
		const result = writeMaps(
			{
				endpoints: { static: new Map() },
				components: { static: new Map(), dynamic: new Map() },
				middlewares: { static: new Map() },
			},
			modules,
		)
		expect(result).toContain('{}')
	})
})
