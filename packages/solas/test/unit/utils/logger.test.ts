import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Logger } from '../../../src/utils/logger.js'

describe('Logger', () => {
	let logSpy: ReturnType<typeof vi.spyOn>
	let warnSpy: ReturnType<typeof vi.spyOn>
	let errorSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		Logger.defaultLevel = 'debug'
	})

	afterEach(() => {
		logSpy.mockRestore()
		warnSpy.mockRestore()
		errorSpy.mockRestore()
	})

	describe('defaultLevel', () => {
		it('defaults to info', () => {
			Logger.defaultLevel = 'info'
			expect(Logger.defaultLevel).toBe('info')
		})

		it('can be set', () => {
			Logger.defaultLevel = 'debug'
			expect(Logger.defaultLevel).toBe('debug')
		})
	})

	describe('instance level', () => {
		it('falls back to defaultLevel when not set', () => {
			const logger = new Logger()
			expect(logger.level).toBe('debug')
		})

		it('uses explicit level when set', () => {
			const logger = new Logger('error')
			expect(logger.level).toBe('error')
		})

		it('can be changed', () => {
			const logger = new Logger('debug')
			logger.level = 'warn'
			expect(logger.level).toBe('warn')
		})
	})

	describe('log filtering', () => {
		it('suppresses messages below current level', () => {
			const logger = new Logger('error')
			logger.debug('should not appear')
			logger.info('should not appear')
			logger.warn('should not appear')

			expect(logSpy).not.toHaveBeenCalled()
			expect(warnSpy).not.toHaveBeenCalled()
		})

		it('passes messages at or above current level', () => {
			const logger = new Logger('warn')
			logger.warn('visible')
			logger.error('visible')

			expect(warnSpy).toHaveBeenCalledOnce()
			expect(errorSpy).toHaveBeenCalledOnce()
		})
	})

	describe('output routing', () => {
		it('debug goes to console.log', () => {
			const logger = new Logger('debug')
			logger.debug('test')
			expect(logSpy).toHaveBeenCalledOnce()
		})

		it('info goes to console.log', () => {
			const logger = new Logger('info')
			logger.info('test')
			expect(logSpy).toHaveBeenCalledOnce()
		})

		it('warn goes to console.warn', () => {
			const logger = new Logger('warn')
			logger.warn('test')
			expect(warnSpy).toHaveBeenCalledOnce()
		})

		it('error goes to console.error', () => {
			const logger = new Logger('error')
			logger.error('test')
			expect(errorSpy).toHaveBeenCalledOnce()
		})

		it('fatal goes to console.error', () => {
			const logger = new Logger('fatal')
			logger.fatal('test')
			expect(errorSpy).toHaveBeenCalledOnce()
		})
	})

	describe('message formatting', () => {
		it('includes [Solas] prefix', () => {
			const logger = new Logger('info')
			logger.info('hello')
			expect(logSpy.mock.calls[0][0]).toContain('[Solas]')
		})

		it('includes level tag', () => {
			const logger = new Logger('info')
			logger.info('hello')
			expect(logSpy.mock.calls[0][0]).toContain('[INFO]')
		})

		it('includes timestamp', () => {
			const logger = new Logger('info')
			logger.info('hello')
			expect(logSpy.mock.calls[0][0]).toMatch(/\[\d+\]/)
		})

		it('includes message', () => {
			const logger = new Logger('info')
			logger.info('hello world')
			expect(logSpy.mock.calls[0][0]).toContain('hello world')
		})

		it('joins multiple messages with space', () => {
			const logger = new Logger('info')
			logger.info('hello', 'world')
			expect(logSpy.mock.calls[0][0]).toContain('hello world')
		})
	})

	describe('error handling', () => {
		it('attaches error for error-level logs', () => {
			const logger = new Logger('error')
			const err = new Error('boom')
			logger.error('failed', err)
			expect(errorSpy).toHaveBeenCalledOnce()
			expect(errorSpy.mock.calls[0][1]).toContain('boom')
		})

		it('attaches error for fatal-level logs', () => {
			const logger = new Logger('fatal')
			const err = new Error('fatal')
			logger.fatal('crash', err)
			expect(errorSpy).toHaveBeenCalledOnce()
			expect(errorSpy.mock.calls[0][1]).toContain('fatal')
		})
	})

	describe('toError', () => {
		it('returns Error instances as-is', () => {
			const err = new Error('test')
			expect(Logger.toError(err)).toBe(err)
		})

		it('wraps strings in Error', () => {
			const result = Logger.toError('string error')
			expect(result).toBeInstanceOf(Error)
			expect(result.message).toBe('string error')
		})

		it('wraps numbers in Error', () => {
			const result = Logger.toError(42)
			expect(result).toBeInstanceOf(Error)
			expect(result.message).toBe('42')
		})

		it('preserves cause', () => {
			const cause = { reason: 'test' }
			const result = Logger.toError(cause)
			expect(result.cause).toBe(cause)
		})
	})

	describe('print', () => {
		it('prints Error message and stack', () => {
			const err = new Error('test')
			const result = Logger.print(err)
			expect(result).toContain('test')
			expect(result).toContain('Error')
		})

		it('stringifies plain objects', () => {
			const result = Logger.print({ key: 'value' })
			expect(result).toContain('key')
			expect(result).toContain('value')
		})

		it('handles circular references gracefully', () => {
			const obj: Record<string, unknown> = {}
			obj.self = obj
			const result = Logger.print(obj)
			expect(typeof result).toBe('string')
		})

		it('stringifies primitives', () => {
			expect(Logger.print(42)).toBe('42')
			expect(Logger.print('hello')).toBe('hello')
			expect(Logger.print(null)).toBe('null')
		})
	})
})
