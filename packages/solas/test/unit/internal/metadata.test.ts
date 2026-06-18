import { describe, expect, it, vi } from 'vitest'

import { Metadata } from '../../../src/internal/metadata.js'

describe('Metadata', () => {
	describe('Collection', () => {
		describe('run', () => {
			it('returns cloned base when no tasks', async () => {
				const col = new Metadata.Collection({ title: 'Base' })
				expect((await col.run()).title).toBe('Base')
			})

			it('merges a single task', async () => {
				const col = new Metadata.Collection({ title: 'Base' })
				col.add({ priority: 10, task: Promise.resolve({ title: 'Page' }) })
				expect((await col.run()).title).toBe('Page')
			})

			it('merges tasks by priority', async () => {
				const col = new Metadata.Collection()
				col.add(
					{ priority: 30, task: Promise.resolve({ title: 'Page' }) },
					{ priority: 10, task: Promise.resolve({ title: 'Shell' }) },
				)
				expect((await col.run()).title).toBe('Page')
			})

			it('applies title template', async () => {
				const col = new Metadata.Collection()
				col.add(
					{ priority: 10, task: Promise.resolve({ title: '%s' }) },
					{ priority: 20, task: Promise.resolve({ title: 'Page Title' }) },
				)
				expect((await col.run()).title).toBe('Page Title')
			})

			it('merges meta tags with later overwriting earlier', async () => {
				const col = new Metadata.Collection()
				col.add(
					{
						priority: 10,
						task: Promise.resolve({ meta: [{ name: 'description', content: 'old' }] }),
					},
					{
						priority: 20,
						task: Promise.resolve({ meta: [{ name: 'description', content: 'new' }] }),
					},
				)
				const result = await col.run()
				expect(result.meta).toHaveLength(1)
				expect(result.meta![0]).toEqual({ name: 'description', content: 'new' })
			})

			it('merges link tags', async () => {
				const col = new Metadata.Collection()
				col.add(
					{
						priority: 10,
						task: Promise.resolve({ link: [{ rel: 'stylesheet', href: '/a.css' }] }),
					},
					{
						priority: 20,
						task: Promise.resolve({ link: [{ rel: 'stylesheet', href: '/b.css' }] }),
					},
				)
				expect((await col.run()).link).toHaveLength(2)
			})

			it('handles rejected tasks gracefully', async () => {
				const col = new Metadata.Collection({ title: 'Fallback' })
				col.add({ priority: 10, task: Promise.reject(new Error('fail')) })
				expect((await col.run()).title).toBe('Fallback')
			})
		})

		describe('base', () => {
			it('returns a clone of the base metadata', () => {
				const base = { title: 'Site' }
				const col = new Metadata.Collection(base)
				const cloned = col.base
				expect(cloned).toEqual(base)
				expect(cloned).not.toBe(base)
			})
		})
	})

	describe('resolve', () => {
		it('returns empty object for null/undefined', async () => {
			expect(await Metadata.resolve(null, {})).toEqual({})
			expect(await Metadata.resolve(undefined, {})).toEqual({})
		})

		it('returns metadata object as-is', async () => {
			const meta = { title: 'Test' }
			expect(await Metadata.resolve(meta, {})).toBe(meta)
		})

		it('calls metadata function with input', async () => {
			const fn = vi.fn().mockReturnValue({ title: 'Dynamic' })
			const result = await Metadata.resolve(fn, { params: { id: '1' } })
			expect(fn).toHaveBeenCalledWith({ params: { id: '1' } })
			expect(result).toEqual({ title: 'Dynamic' })
		})

		it('catches errors from async metadata functions', async () => {
			const onError = vi.fn()
			const fn = () => Promise.reject(new Error('boom'))
			const result = await Metadata.resolve(fn, {}, onError)
			expect(result).toEqual({})
			expect(onError).toHaveBeenCalled()
		})
	})

	describe('tasks', () => {
		it('returns empty array for no sources', () => {
			const result = Metadata.tasks([], {})
			expect(result).toHaveLength(0)
		})

		it('skips error-only sources when no error', () => {
			const sources: Metadata.Source[] = [
				{ priority: 10, when: 'error', load: () => Promise.resolve({}) },
			]
			const result = Metadata.tasks(sources, {})
			expect(result).toHaveLength(0)
		})

		it('includes error-only sources when error present', () => {
			const sources: Metadata.Source[] = [
				{
					priority: 10,
					when: 'error',
					load: () => Promise.resolve({ title: 'Error Page' }),
				},
			]
			const result = Metadata.tasks(sources, { error: new Error('fail') })
			expect(result).toHaveLength(1)
		})

		it('filters by status code', () => {
			const httpException = new (class extends Error {
				status = 404
				digest = 'HTTP_EXCEPTION:404:Not found'
			})('Not found')

			const sources: Metadata.Source[] = [
				{ priority: 10, status: 404, load: () => Promise.resolve({ title: '404' }) },
				{ priority: 20, status: 500, load: () => Promise.resolve({ title: '500' }) },
			]
			const tasks = Metadata.tasks(sources, { error: httpException })
			expect(tasks).toHaveLength(1)
		})
	})
})
