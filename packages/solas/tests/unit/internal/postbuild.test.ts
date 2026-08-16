import { describe, it, expect, vi } from 'vitest'

const { mockReadFile } = vi.hoisted(() => ({
	mockReadFile: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
	default: {
		readFile: mockReadFile,
		readdir: vi.fn(),
		mkdir: vi.fn(),
		rm: vi.fn(),
		unlink: vi.fn(),
	},
}))

vi.mock('../../../src/internal/runtimes/runtime.js', () => ({
	Runtime: {
		write: vi.fn(),
		exists: vi.fn(),
		readText: vi.fn(),
		hash: vi.fn(() => 'hash'),
		mimeType: vi.fn(() => 'text/plain'),
		readBuffer: vi.fn(),
	},
}))

import { postbuild } from '../../../src/internal/postbuild.js'

describe('postbuild', () => {
	it('throws when build manifest cannot be read', async () => {
		mockReadFile.mockRejectedValue(new Error('ENOENT'))
		await expect(postbuild('/tmp/test-project')).rejects.toThrow('ENOENT')
	})
})
