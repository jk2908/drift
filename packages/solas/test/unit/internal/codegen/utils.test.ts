import { describe, it, expect } from 'vitest'

// Test the codegen utils as pure functions
// We test via the exported API since these are internal helpers

import { toIdentifier, toRelativeModuleSpecifier, toIdentifierList, toStringLiteral, source, toSourceLiteral, indent } from '../../../../src/internal/codegen/utils.js'

describe('toIdentifier', () => {
  it('passes valid identifiers', () => {
    expect(toIdentifier('foo', 'test')).toBe('foo')
    expect(toIdentifier('_private', 'test')).toBe('_private')
    expect(toIdentifier('$', 'test')).toBe('$')
  })

  it('throws for invalid identifiers', () => {
    expect(() => toIdentifier('123abc', 'test')).toThrow('Invalid test')
    expect(() => toIdentifier('has space', 'test')).toThrow('Invalid test')
    expect(() => toIdentifier('has-dash', 'test')).toThrow('Invalid test')
  })
})

describe('toRelativeModuleSpecifier', () => {
  it('passes valid relative specifiers', () => {
    const r = toRelativeModuleSpecifier('./foo', 'test')
    expect(r).toBe("'./foo'")
  })

  it('passes parent-relative specifiers', () => {
    const r = toRelativeModuleSpecifier('../bar/baz', 'test')
    expect(r).toBe("'../bar/baz'")
  })

  it('throws for empty specifier', () => {
    expect(() => toRelativeModuleSpecifier('', 'test')).toThrow('Invalid test')
  })

  it('throws for absolute specifier', () => {
    expect(() => toRelativeModuleSpecifier('/abs/path', 'test')).toThrow('must be relative')
  })

  it('throws for bare module specifier', () => {
    expect(() => toRelativeModuleSpecifier('lodash', 'test')).toThrow('must be relative')
  })

  it('throws for backslash', () => {
    expect(() => toRelativeModuleSpecifier('.\\foo', 'test')).toThrow('forward slashes')
  })

  it('throws for control characters', () => {
    expect(() => toRelativeModuleSpecifier('./foo\nbar', 'test')).toThrow('control characters')
  })

  it('quotes the result', () => {
    expect(toRelativeModuleSpecifier('./some/path', 'test')).toBe("'./some/path'")
  })
})

describe('toIdentifierList', () => {
  it('joins identifiers with comma separator', () => {
    expect(toIdentifierList(['a', 'b', 'c'], 'test')).toBe('a, b, c')
  })

  it('preserves null holes', () => {
    expect(toIdentifierList(['a', null, 'c'], 'test')).toBe('a, null, c')
  })

  it('returns empty string for empty list', () => {
    expect(toIdentifierList([], 'test')).toBe('')
  })
})

describe('toStringLiteral', () => {
  it('wraps in single quotes by default', () => {
    expect(toStringLiteral('hello')).toBe("'hello'")
  })

  it('wraps in double quotes when specified', () => {
    expect(toStringLiteral('hello', '"')).toBe('"hello"')
  })

  it('escapes backslashes', () => {
    expect(toStringLiteral('a\\b')).toBe("'a\\\\b'")
  })

  it('escapes quote characters', () => {
    expect(toStringLiteral("it's", "'")).toBe("'it\\'s'")
    expect(toStringLiteral('say "hi"', '"')).toBe('"say \\"hi\\""')
  })

  it('escapes newlines', () => {
    expect(toStringLiteral('a\nb')).toBe("'a\\nb'")
  })

  it('escapes carriage returns', () => {
    expect(toStringLiteral('a\rb')).toBe("'a\\rb'")
  })

  it('escapes tabs', () => {
    expect(toStringLiteral('a\tb')).toBe("'a\\tb'")
  })
})

describe('source', () => {
  it('dedents template literal', () => {
    const result = source`
      hello
        world`
    expect(result).toBe('hello\n  world')
  })

  it('interpolates values with indentation', () => {
    const inner = 'deep'
    const result = source`
      outer
        ${inner}`
    expect(result).toBe('outer\n  deep')
  })

  it('handles false and null as empty', () => {
    const result = source`
      ${false}${null}ok`
    expect(result).toBe('ok')
  })

  it('strips leading and trailing newlines', () => {
    const result = source`
      content`
    expect(result).toBe('content')
  })
})

describe('toSourceLiteral', () => {
  it('converts null', () => {
    expect(toSourceLiteral(null)).toBe('null')
  })

  it('converts strings', () => {
    expect(toSourceLiteral('hello')).toBe("'hello'")
  })

  it('converts booleans', () => {
    expect(toSourceLiteral(true)).toBe('true')
    expect(toSourceLiteral(false)).toBe('false')
  })

  it('converts numbers', () => {
    expect(toSourceLiteral(42)).toBe('42')
  })

  it('converts empty arrays inline', () => {
    expect(toSourceLiteral([])).toBe('[]')
  })

  it('converts arrays inline when short', () => {
    expect(toSourceLiteral([1, 2, 3])).toBe('[1, 2, 3]')
  })

  it('converts empty objects', () => {
    expect(toSourceLiteral({})).toBe('{}')
  })

  it('converts simple objects', () => {
    const result = toSourceLiteral({ a: 1, b: 'hello' })
    expect(result).toContain('a: 1')
    expect(result).toContain("b: 'hello'")
  })

  it('converts nested objects', () => {
    const result = toSourceLiteral({ outer: { inner: 42 } })
    expect(result).toContain('outer')
    expect(result).toContain('inner: 42')
  })

  it('converts functions', () => {
    const fn = () => 42
    expect(toSourceLiteral(fn)).toBe(fn.toString())
  })

  it('throws for unsupported types', () => {
    expect(() => toSourceLiteral(Symbol('x'))).toThrow('Unsupported generated value type')
  })
})

describe('indent', () => {
  it('indents each line with one tab by default', () => {
    expect(indent('a\nb')).toBe('\ta\n\tb')
  })

  it('does not indent empty lines', () => {
    expect(indent('a\n\nb')).toBe('\ta\n\n\tb')
  })

  it('uses specified indent level', () => {
    expect(indent('a\nb', 3)).toBe('\t\t\ta\n\t\t\tb')
  })

  it('handles single line', () => {
    expect(indent('hello', 1)).toBe('\thello')
  })
})
