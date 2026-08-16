import { describe, it, expect, vi } from 'vitest'

const { mockStat, mockReaddir } = vi.hoisted(() => ({
	mockStat: vi.fn(),
	mockReaddir: vi.fn(),
}))

vi.mock('node:fs', () => ({
	promises: {
		stat: mockStat,
		readdir: mockReaddir,
	},
}))

import { collect } from '../../../src/internal/public-files.js'

function mockAsDirectory() {
	mockStat.mockResolvedValue({ isDirectory: () => true })
}

describe('collect', () => {
	it('returns empty array for null/undefined root', async () => {
		expect(await collect(null)).toEqual([])
		expect(await collect(undefined)).toEqual([])
		expect(await collect(false)).toEqual([])
	})

	it('returns empty array when root is not a directory', async () => {
		mockStat.mockResolvedValue({ isDirectory: () => false })
		expect(await collect('/some/file')).toEqual([])
	})

	it('returns empty array when root does not exist', async () => {
		mockStat.mockRejectedValue(new Error('ENOENT'))
		expect(await collect('/nonexistent')).toEqual([])
	})

	it('collects file paths from public directory', async () => {
		mockAsDirectory()
		mockReaddir.mockResolvedValue([
			{ name: 'robots.txt', isFile: () => true, isDirectory: () => false },
			{ name: 'favicon.ico', isFile: () => true, isDirectory: () => false },
		])
		expect(await collect('/app/public')).toEqual(['/favicon.ico', '/robots.txt'])
	})

	it('recursively collects files from subdirectories', async () => {
		mockAsDirectory()
		mockReaddir
			.mockResolvedValueOnce([
				{ name: 'images', isFile: () => false, isDirectory: () => true },
			])
			.mockResolvedValueOnce([
				{ name: 'logo.png', isFile: () => true, isDirectory: () => false },
			])
		expect(await collect('/app/public')).toEqual(['/images/logo.png'])
	})

	it('skips _solas directory at root level', async () => {
		mockAsDirectory()
		mockReaddir.mockResolvedValue([
			{ name: '_solas', isFile: () => false, isDirectory: () => true },
			{ name: 'robots.txt', isFile: () => true, isDirectory: () => false },
		])
		expect(await collect('/app/public')).toEqual(['/robots.txt'])
	})

	it('URI-encodes special characters in filenames', async () => {
		mockAsDirectory()
		mockReaddir.mockResolvedValue([
			{ name: 'logo 1.png', isFile: () => true, isDirectory: () => false },
		])
		expect(await collect('/app/public')).toEqual(['/logo%201.png'])
	})

	it('sorts files alphabetically', async () => {
		mockAsDirectory()
		mockReaddir.mockResolvedValue([
			{ name: 'zebra.txt', isFile: () => true, isDirectory: () => false },
			{ name: 'alpha.txt', isFile: () => true, isDirectory: () => false },
		])
		expect(await collect('/app/public')).toEqual(['/alpha.txt', '/zebra.txt'])
	})

	it('skips non-file entries', async () => {
		mockAsDirectory()
		mockReaddir.mockResolvedValue([
			{ name: 'symlink', isFile: () => false, isDirectory: () => false },
			{ name: 'actual.txt', isFile: () => true, isDirectory: () => false },
		])
		expect(await collect('/app/public')).toEqual(['/actual.txt'])
	})
})
