import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Prerender } from '../../../src/internal/prerender.js'

vi.mock('../../../src/internal/runtimes/runtime.js', () => ({
	Runtime: {
		exists: vi.fn(),
		readText: vi.fn(),
	},
}))

const { Runtime } = await import('../../../src/internal/runtimes/runtime.js')

describe('Prerender', () => {
	describe('Artifact', () => {
		describe('getRootPath', () => {
			it('returns path under generated dir', () => {
				const result = Prerender.Artifact.getRootPath('/app/dist')
				expect(result).toContain('dist')
				expect(result).toContain('ppr')
			})
		})

		describe('getPath', () => {
			it('uses "index" for root pathname', () => {
				const result = Prerender.Artifact.getPath('/app/dist', '/')
				expect(result).toContain('index')
			})

			it('uses pathname for non-root', () => {
				const result = Prerender.Artifact.getPath('/app/dist', '/about')
				expect(result).toContain('about')
			})

			it('prevents path traversal', () => {
				expect(() => Prerender.Artifact.getPath('/app/dist', '/../etc/passwd')).toThrow(
					'invalid artifact path',
				)
			})
		})

		describe('getFilePath', () => {
			it('rejects invalid file names', () => {
				expect(() =>
					Prerender.Artifact.getFilePath('/app/dist', '/', '../escape'),
				).toThrow('invalid artifact file name')
			})

			it('joins route path and file name', () => {
				const result = Prerender.Artifact.getFilePath('/app/dist', '/about', 'test.html')
				expect(result).toContain('about')
				expect(result).toContain('test.html')
			})
		})

		describe('isCompatible', () => {
			it('returns true when schema, route, and mode match', () => {
				vi.stubEnv('SOLAS_VERSION', '1.0.0')

				const meta: Prerender.Artifact.Metadata = {
					schema: '1.0.0',
					route: '/about',
					createdAt: 1000,
					mode: 'full',
				}

				expect(Prerender.Artifact.isCompatible(meta, '/about', 'full')).toBe(true)

				vi.unstubAllEnvs()
			})

			it('returns false when schema mismatches', () => {
				vi.stubEnv('SOLAS_VERSION', '1.0.0')

				const meta: Prerender.Artifact.Metadata = {
					schema: '0.9.0',
					route: '/about',
					createdAt: 1000,
					mode: 'full',
				}

				expect(Prerender.Artifact.isCompatible(meta, '/about', 'full')).toBe(false)

				vi.unstubAllEnvs()
			})

			it('returns false when route mismatches', () => {
				vi.stubEnv('SOLAS_VERSION', '1.0.0')

				const meta: Prerender.Artifact.Metadata = {
					schema: '1.0.0',
					route: '/about',
					createdAt: 1000,
					mode: 'full',
				}

				expect(Prerender.Artifact.isCompatible(meta, '/other', 'full')).toBe(false)

				vi.unstubAllEnvs()
			})

			it('returns false when mode mismatches', () => {
				vi.stubEnv('SOLAS_VERSION', '1.0.0')

				const meta: Prerender.Artifact.Metadata = {
					schema: '1.0.0',
					route: '/about',
					createdAt: 1000,
					mode: 'full',
				}

				expect(Prerender.Artifact.isCompatible(meta, '/about', 'ppr')).toBe(false)

				vi.unstubAllEnvs()
			})
		})

		describe('loadPostponedState', () => {
			beforeEach(() => {
				vi.clearAllMocks()
			})

			it('returns null when file does not exist', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(false)
				const result = await Prerender.Artifact.loadPostponedState('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns parsed JSON when file exists', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockResolvedValue(JSON.stringify({ suspended: true }))
				const result = await Prerender.Artifact.loadPostponedState('/dist', '/about')
				expect(result).toEqual({ suspended: true })
			})

			it('returns null when JSON parse fails', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockResolvedValue('invalid json')
				const result = await Prerender.Artifact.loadPostponedState('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns null when file path is invalid', async () => {
				const result = await Prerender.Artifact.loadPostponedState('/dist', '/../escape')
				expect(result).toBeNull()
			})
		})

		describe('loadPrelude', () => {
			beforeEach(() => {
				vi.clearAllMocks()
			})

			it('returns null when file does not exist', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(false)
				const result = await Prerender.Artifact.loadPrelude('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns text content when file exists', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockResolvedValue('<html>prelude</html>')
				const result = await Prerender.Artifact.loadPrelude('/dist', '/about')
				expect(result).toBe('<html>prelude</html>')
			})

			it('returns null when readText fails', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockRejectedValue(new Error('read error'))
				const result = await Prerender.Artifact.loadPrelude('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns null when file path is invalid', async () => {
				const result = await Prerender.Artifact.loadPrelude('/dist', '/../escape')
				expect(result).toBeNull()
			})
		})

		describe('loadMetadata', () => {
			beforeEach(() => {
				vi.clearAllMocks()
			})

			it('returns null when file does not exist', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(false)
				const result = await Prerender.Artifact.loadMetadata('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns parsed metadata when valid', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockResolvedValue(
					JSON.stringify({
						schema: '1.0.0',
						route: '/about',
						createdAt: 1000,
						mode: 'full',
					}),
				)
				const result = await Prerender.Artifact.loadMetadata('/dist', '/about')
				expect(result).toEqual({
					schema: '1.0.0',
					route: '/about',
					createdAt: 1000,
					mode: 'full',
				})
			})

			it('returns null when metadata values are wrong types', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockResolvedValue(
					JSON.stringify({ schema: 123, route: '/about', createdAt: 1000, mode: 'full' }),
				)
				const result = await Prerender.Artifact.loadMetadata('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns null when mode is invalid', async () => {
				vi.mocked(Runtime.exists).mockResolvedValue(true)
				vi.mocked(Runtime.readText).mockResolvedValue(
					JSON.stringify({
						schema: '1.0.0',
						route: '/about',
						createdAt: 1000,
						mode: 'partial',
					}),
				)
				const result = await Prerender.Artifact.loadMetadata('/dist', '/about')
				expect(result).toBeNull()
			})

			it('returns null when file path is invalid', async () => {
				const result = await Prerender.Artifact.loadMetadata('/dist', '/../escape')
				expect(result).toBeNull()
			})
		})

		describe('composePreludeAndResume', () => {
			it('produces a stream that combines prelude and resume data', async () => {
				const resumeStream = new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(new TextEncoder().encode('resume data'))
						controller.close()
					},
				})

				const stream = Prerender.Artifact.composePreludeAndResume(
					'<html><body>prelude</body></html>',
					resumeStream,
				)

				const reader = stream.getReader()
				const chunks: Uint8Array[] = []

				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					if (value) chunks.push(value)
				}

				const result = chunks.map(c => new TextDecoder().decode(c)).join('')
				expect(result).toContain('prelude')
				expect(result).toContain('resume data')
			})

			it('strips leading close tags from resume stream', async () => {
				const resumeStream = new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(new TextEncoder().encode('  </body></html>'))
						controller.enqueue(new TextEncoder().encode('actual data'))
						controller.close()
					},
				})

				const stream = Prerender.Artifact.composePreludeAndResume(
					'<html><body>prelude</body></html>',
					resumeStream,
				)

				const reader = stream.getReader()
				const chunks: Uint8Array[] = []

				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					if (value) chunks.push(value)
				}

				const result = chunks.map(c => new TextDecoder().decode(c)).join('')
				expect(result).not.toContain('</body></html>')
				expect(result).toContain('actual data')
			})
		})
	})

	describe('Runtime', () => {
		describe('isPostponed', () => {
			it('returns true for Postponed error', () => {
				const err = new Prerender.Runtime.Postponed()
				expect(Prerender.Runtime.isPostponed(err)).toBe(true)
			})

			it('returns false for regular Error', () => {
				expect(Prerender.Runtime.isPostponed(new Error('boom'))).toBe(false)
			})

			it('returns true for AbortError with Postponed cause', () => {
				const err = new Error('aborted')
				err.name = 'AbortError'
				err.cause = new Prerender.Runtime.Postponed()
				expect(Prerender.Runtime.isPostponed(err)).toBe(true)
			})

			it('returns false for null/undefined', () => {
				expect(Prerender.Runtime.isPostponed(null)).toBe(false)
				expect(Prerender.Runtime.isPostponed(undefined)).toBe(false)
			})
		})

		describe('Postponed', () => {
			it('creates an error with name Postponed', () => {
				const p = new Prerender.Runtime.Postponed()
				expect(p.name).toBe('Postponed')
				expect(p.message).toBe('postponed')
			})

			it('accepts custom message', () => {
				const p = new Prerender.Runtime.Postponed('custom msg')
				expect(p.message).toBe('custom msg')
			})
		})
	})

	describe('Build', () => {
		describe('getConcurrency', () => {
			beforeEach(() => {
				vi.unstubAllEnvs()
			})

			it('returns default concurrency when env var is not set', () => {
				expect(Prerender.Build.getConcurrency()).toBe(4)
			})

			it('uses env var when set to a valid integer', () => {
				vi.stubEnv('SOLAS_PRERENDER_CONCURRENCY', '8')
				expect(Prerender.Build.getConcurrency()).toBe(8)
			})

			it('returns default for invalid values', () => {
				vi.stubEnv('SOLAS_PRERENDER_CONCURRENCY', 'invalid')
				expect(Prerender.Build.getConcurrency()).toBe(4)
			})
		})

		describe('getDynamicRouteList', () => {
			it('returns empty array for empty static params', () => {
				const result = Prerender.Build.getDynamicRouteList('/posts/:id', ['id'], [])
				expect(result).toEqual([])
			})

			it('generates routes from static params', () => {
				const result = Prerender.Build.getDynamicRouteList(
					'/posts/:id',
					['id'],
					[{ id: '1' }, { id: '2' }],
				)
				expect(result).toEqual(['/posts/1', '/posts/2'])
			})

			it('filters out routes with unresolved dynamic segments', () => {
				const result = Prerender.Build.getDynamicRouteList(
					'/posts/:id',
					['id'],
					[{ id: 'valid' }],
				)
				expect(result).toEqual(['/posts/valid'])
			})
		})

		describe('get', () => {
			it('returns artifact when response is ok', async () => {
				const artifact = {
					mode: 'full',
					html: '<html/>',
					route: '/',
					schema: '1.0.0',
					createdAt: 1000,
				}
				const app = {
					fetch: vi
						.fn()
						.mockResolvedValue(new Response(JSON.stringify(artifact), { status: 200 })),
				}

				const result = await Prerender.Build.get(app, '/', {})
				expect('artifact' in result).toBe(true)
				if ('artifact' in result) {
					expect(result.artifact.html).toBe('<html/>')
				}
			})

			it('returns status when response is not ok', async () => {
				const app = {
					fetch: vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
				}

				const result = await Prerender.Build.get(app, '/', {})
				expect('status' in result).toBe(true)
				if ('status' in result) {
					expect(result.status).toBe(500)
				}
			})
		})
	})
})
