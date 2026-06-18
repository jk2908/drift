import { describe, it, expect } from 'vitest'
import { Build } from '../../../src/internal/build.js'

describe('Build', () => {
  describe('EntryKind', () => {
    it('has expected constants', () => {
      expect(Build.EntryKind.SHELL).toBe('$S')
      expect(Build.EntryKind.LAYOUT).toBe('$L')
      expect(Build.EntryKind.PAGE).toBe('$P')
      expect(Build.EntryKind['401']).toBe('$401')
      expect(Build.EntryKind['403']).toBe('$403')
      expect(Build.EntryKind['404']).toBe('$404')
      expect(Build.EntryKind['500']).toBe('$500')
      expect(Build.EntryKind.LOADING).toBe('$LOAD')
      expect(Build.EntryKind.MIDDLEWARE).toBe('$MW')
      expect(Build.EntryKind.ENDPOINT).toBe('$E')
    })
  })

  describe('Finder', () => {
    describe('getParams', () => {
      it('returns empty array for static paths', () => {
        expect(Build.Finder.getParams('/about')).toEqual([])
      })

      it('extracts a single :param from file path', () => {
        expect(Build.Finder.getParams('app/posts/[id]/+page.tsx')).toEqual(['id'])
      })

      it('extracts multiple params', () => {
        expect(Build.Finder.getParams('app/[lang]/posts/[id]/+page.tsx')).toEqual(['lang', 'id'])
      })

      it('extracts rest params [...slug]', () => {
        expect(Build.Finder.getParams('app/docs/[...slug]/+page.tsx')).toEqual(['slug'])
      })

      it('extracts mixed named and rest params', () => {
        const params = Build.Finder.getParams('app/[lang]/docs/[...path]/+page.tsx')
        expect(params).toEqual(['lang', 'path'])
      })
    })

    describe('getDepth', () => {
      it('returns 0 for root', () => {
        expect(Build.Finder.getDepth('/')).toBe(0)
      })

      it('returns depth for top-level routes', () => {
        expect(Build.Finder.getDepth('/about')).toBe(1)
      })

      it('returns depth for nested routes', () => {
        expect(Build.Finder.getDepth('/posts/2024/my-post')).toBe(3)
      })

      it('handles dynamic routes', () => {
        expect(Build.Finder.getDepth('/posts/:id')).toBe(2)
      })
    })

    describe('toCanonicalRoute', () => {
      it('returns root for empty path', () => {
        expect(Build.Finder.toCanonicalRoute('')).toBe('/')
      })

      it('strips app/ prefix and +page suffix', () => {
        expect(Build.Finder.toCanonicalRoute('app/about/+page.tsx')).toBe('/about')
      })

      it('strips +page.jsx suffix', () => {
        expect(Build.Finder.toCanonicalRoute('app/about/+page.jsx')).toBe('/about')
      })

      it('strips +endpoint suffix', () => {
        expect(Build.Finder.toCanonicalRoute('app/api/data/+endpoint.ts')).toBe('/api/data')
      })

      it('handles root page', () => {
        expect(Build.Finder.toCanonicalRoute('app/+page.tsx')).toBe('/')
      })

      it('converts [param] to :param', () => {
        expect(Build.Finder.toCanonicalRoute('app/posts/[id]/+page.tsx')).toBe('/posts/:id')
      })

      it('converts [...wildcard] to *', () => {
        expect(Build.Finder.toCanonicalRoute('app/docs/[...slug]/+page.tsx')).toBe('/docs/*')
      })

      it('handles mixed static and dynamic segments', () => {
        expect(Build.Finder.toCanonicalRoute('app/[lang]/about/+page.tsx')).toBe('/:lang/about')
      })

      it('handles endpoint files with +endpoint.ts', () => {
        expect(Build.Finder.toCanonicalRoute('app/api/users/+endpoint.ts')).toBe('/api/users')
      })

      it('handles endpoint files with +endpoint.js', () => {
        expect(Build.Finder.toCanonicalRoute('app/api/data/+endpoint.js')).toBe('/api/data')
      })
    })

    describe('getImportPath', () => {
      it('generates a relative import path from cwd to generated dir', () => {
        const cwd = process.cwd()
        const file = `${cwd}/app/about/+page.tsx`
        const result = Build.Finder.getImportPath(file)
        expect(result).toContain('app/about/+page')
        expect(result).not.toMatch(/\.(t|j)sx?$/)
      })

      it('normalises backslashes on windows', () => {
        const cwd = process.cwd().replace(/\//g, '\\')
        const file = `${cwd}\\app\\about\\+page.tsx`
        const result = Build.Finder.getImportPath(file)
        expect(result).not.toContain('\\')
      })

      it('strips typescript extension', () => {
        const cwd = process.cwd()
        const result = Build.Finder.getImportPath(`${cwd}/app/page/+page.tsx`)
        expect(result).not.toMatch(/\.tsx$/)
      })
    })
  })
})
