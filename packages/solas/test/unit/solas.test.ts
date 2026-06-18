import { afterEach, describe, expect, it, vi } from 'vitest'

import { Solas } from '../../src/solas.js'

describe('Solas', () => {
	describe('Config', () => {
		it('has expected constants', () => {
			expect(Solas.Config.NAME).toBe('Solas')
			expect(Solas.Config.SLUG).toBe('solas')
			expect(Solas.Config.PKG_NAME).toBe('@jk2908/solas')
			expect(Solas.Config.OUT_DIR).toBe('dist')
			expect(Solas.Config.APP_DIR).toBe('app')
			expect(Solas.Config.GENERATED_DIR).toBe('.solas')
			expect(Solas.Config.ENTRY_RSC).toBe('entry.rsc.tsx')
			expect(Solas.Config.ENTRY_SSR).toBe('entry.ssr.tsx')
			expect(Solas.Config.ENTRY_BROWSER).toBe('entry.browser.tsx')
			expect(Solas.Config.ASSETS_DIR).toBe('_solas')
			expect(Solas.Config.PUBLIC_DIR).toBe('public')
			expect(Solas.Config.RUNTIME_MANIFEST).toBe('runtime-manifest.json')
			expect(Solas.Config.REQUEST_META_KEY).toBe('__SOLAS__')
		})

		it('has expected log levels', () => {
			expect(Solas.Config.LOG_LEVELS).toEqual(['debug', 'info', 'warn', 'error', 'fatal'])
		})

		it('has expected runtime values', () => {
			expect(Solas.Config.RUNTIMES).toEqual(['auto', 'node', 'bun'])
		})

		it('has expected prerender modes', () => {
			expect(Solas.Config.PRERENDER_MODES).toEqual(['full', 'ppr', false])
		})

		it('has expected trailing slash modes', () => {
			expect(Solas.Config.TRAILING_SLASH_MODES).toEqual(['always', 'never', 'ignore'])
		})

		it('Config.$ is a symbol', () => {
			expect(typeof Solas.Config.$).toBe('symbol')
			expect(Solas.Config.$.toString()).toBe('Symbol(solas)')
		})

		describe('validate', () => {
			it('returns empty object for undefined input', () => {
				expect(Solas.Config.validate(undefined)).toEqual({})
			})

			it('throws for non-object input', () => {
				expect(() => Solas.Config.validate('string')).toThrow()
				expect(() => Solas.Config.validate(42)).toThrow()
			})

			it('throws for unknown keys', () => {
				expect(() => Solas.Config.validate({ unknownKey: true })).toThrow(
					'Unknown config key',
				)
			})

			it('rejects invalid runtime', () => {
				expect(() => Solas.Config.validate({ runtime: 'invalid' })).toThrow(
					"config.runtime must be 'auto', 'node', or 'bun'",
				)
			})

			it('accepts valid runtime values', () => {
				expect(Solas.Config.validate({ runtime: 'auto' })).toHaveProperty(
					'runtime',
					'auto',
				)
				expect(Solas.Config.validate({ runtime: 'node' })).toHaveProperty(
					'runtime',
					'node',
				)
				expect(Solas.Config.validate({ runtime: 'bun' })).toHaveProperty('runtime', 'bun')
			})

			it('rejects invalid URL', () => {
				expect(() => Solas.Config.validate({ url: 'not-a-url' })).toThrow(
					'config.url must be a valid URL',
				)
			})

			it('rejects URL with wrong protocol', () => {
				expect(() => Solas.Config.validate({ url: 'ftp://example.com' })).toThrow(
					'config.url must use http:// or https://',
				)
			})

			it('accepts valid http/https URLs', () => {
				expect(Solas.Config.validate({ url: 'https://example.com' })).toHaveProperty(
					'url',
					'https://example.com',
				)
			})

			it('rejects invalid prerender', () => {
				expect(() => Solas.Config.validate({ prerender: 'invalid' })).toThrow()
			})

			it('accepts valid prerender values', () => {
				expect(Solas.Config.validate({ prerender: 'full' })).toHaveProperty(
					'prerender',
					'full',
				)
				expect(Solas.Config.validate({ prerender: 'ppr' })).toHaveProperty(
					'prerender',
					'ppr',
				)
				expect(Solas.Config.validate({ prerender: false })).toHaveProperty(
					'prerender',
					false,
				)
			})

			it('rejects invalid precompress', () => {
				expect(() => Solas.Config.validate({ precompress: 'yes' })).toThrow()
			})

			it('accepts valid precompress', () => {
				expect(Solas.Config.validate({ precompress: true })).toHaveProperty(
					'precompress',
					true,
				)
			})

			it('rejects invalid trailingSlash', () => {
				expect(() => Solas.Config.validate({ trailingSlash: 'sometimes' })).toThrow()
			})

			it('accepts valid trailingSlash', () => {
				expect(Solas.Config.validate({ trailingSlash: 'always' })).toHaveProperty(
					'trailingSlash',
					'always',
				)
			})

			it('rejects sitemap=true without url', () => {
				expect(() => Solas.Config.validate({ sitemap: true })).toThrow(
					'config.url is required when sitemap is enabled',
				)
			})

			it('accepts sitemap with url', () => {
				expect(
					Solas.Config.validate({ url: 'https://example.com', sitemap: true }),
				).toHaveProperty('sitemap', true)
			})

			it('rejects sitemap as object without routes function', () => {
				expect(() =>
					Solas.Config.validate({ url: 'https://example.com', sitemap: {} }),
				).toThrow('config.sitemap.routes must be a function')
			})

			it('accepts sitemap with routes function', () => {
				const config = Solas.Config.validate({
					url: 'https://example.com',
					sitemap: { routes: async (r: string[]) => r },
				})
				expect(config).toHaveProperty('sitemap')
			})

			it('validates trustedOrigins', () => {
				expect(() => Solas.Config.validate({ trustedOrigins: ['not-a-url'] })).toThrow()
			})

			it('validates trustedOrigins are origins without path', () => {
				expect(() =>
					Solas.Config.validate({ trustedOrigins: ['https://example.com/path'] }),
				).toThrow()
			})

			it('accepts valid trustedOrigins', () => {
				const config = Solas.Config.validate({
					trustedOrigins: ['https://example.com'],
				})
				expect(config).toHaveProperty('trustedOrigins', ['https://example.com'])
			})

			it('validates logger.level', () => {
				expect(() => Solas.Config.validate({ logger: { level: 'verbose' } })).toThrow()
			})

			it('accepts valid logger.level', () => {
				const config = Solas.Config.validate({ logger: { level: 'debug' } })
				expect(config).toHaveProperty('logger', { level: 'debug' })
			})
		})
	})

	describe('getVersion', () => {
		afterEach(() => {
			vi.unstubAllEnvs()
		})

		it('returns the version from env', () => {
			vi.stubEnv('SOLAS_VERSION', '1.0.0')
			expect(Solas.getVersion()).toBe('1.0.0')
		})

		it('throws when version is missing', () => {
			vi.stubEnv('SOLAS_VERSION', '')
			expect(() => Solas.getVersion()).toThrow()
		})
	})

	describe('Runtime', () => {
		describe('getManifestPath', () => {
			it('joins outDir segments correctly', () => {
				const result = Solas.Runtime.getManifestPath('/app/dist')
				expect(result).toContain('solas')
				expect(result).toContain('runtime-manifest.json')
			})

			it('resolves relative to outDir', () => {
				const result = Solas.Runtime.getManifestPath('dist')
				expect(result).toContain('dist')
				expect(result).toContain('.solas')
				expect(result).toContain('runtime-manifest.json')
			})
		})
	})

	describe('Events', () => {
		it('has expected event names', () => {
			expect(Solas.Events.names.NAVIGATION).toBe('solasnavigation')
			expect(Solas.Events.names.NAVIGATION_ERROR).toBe('solasnavigationerror')
		})
	})
})
