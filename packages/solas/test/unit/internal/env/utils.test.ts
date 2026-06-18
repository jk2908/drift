import { describe, it, expect } from 'vitest'
import { getKnownDigest, isKnownError } from '../../../../src/internal/env/utils.js'
import { HttpException } from '../../../../src/internal/navigation/http-exception.js'
import { Redirect } from '../../../../src/internal/navigation/redirect.js'

describe('getKnownDigest', () => {
  it('returns digest for HttpException', () => {
    const err = new HttpException(404, 'Not found')
    expect(getKnownDigest(err)).toBe('HTTP_EXCEPTION:404:Not found')
  })

  it('returns digest for Redirect', () => {
    const err = new Redirect('/login', 302)
    expect(getKnownDigest(err)).toBe('REDIRECT:302:/login')
  })

  it('returns null for regular Error', () => {
    expect(getKnownDigest(new Error('boom'))).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(getKnownDigest(null)).toBeNull()
    expect(getKnownDigest(undefined)).toBeNull()
  })

  it('returns null for primitive values', () => {
    expect(getKnownDigest('string')).toBeNull()
    expect(getKnownDigest(42)).toBeNull()
  })

  it('returns null for object without digest property', () => {
    expect(getKnownDigest({ message: 'hello' })).toBeNull()
  })

  it('returns null for object with non-string digest', () => {
    expect(getKnownDigest({ digest: 123 })).toBeNull()
  })

  it('returns digest for duck-typed object with matching prefix', () => {
    expect(getKnownDigest({ digest: 'HTTP_EXCEPTION:403:Forbidden' })).toBe(
      'HTTP_EXCEPTION:403:Forbidden',
    )
  })

  it('returns null for duck-typed object with non-matching prefix', () => {
    expect(getKnownDigest({ digest: 'OTHER_PREFIX:123' })).toBeNull()
  })
})

describe('isKnownError', () => {
  it('returns true for HttpException', () => {
    expect(isKnownError(new HttpException(404, 'Not found'))).toBe(true)
  })

  it('returns true for Redirect', () => {
    expect(isKnownError(new Redirect('/login', 302))).toBe(true)
  })

  it('returns true for AbortError', () => {
    const err = new Error('aborted')
    err.name = 'AbortError'
    expect(isKnownError(err)).toBe(true)
  })

  it('returns true for render abort message', () => {
    expect(isKnownError('The render was aborted by the server without a reason')).toBe(true)
  })

  it('returns true for Error with render abort message', () => {
    const err = new Error('The render was aborted by the server without a reason')
    expect(isKnownError(err)).toBe(true)
  })

  it('returns true for object with render abort message', () => {
    expect(isKnownError({ message: 'The render was aborted by the server without a reason' })).toBe(
      true,
    )
  })

  it('returns false for regular Error', () => {
    expect(isKnownError(new Error('generic'))).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isKnownError(null)).toBe(false)
    expect(isKnownError(undefined)).toBe(false)
  })
})
