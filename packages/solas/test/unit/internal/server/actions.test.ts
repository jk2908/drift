import { describe, it, expect, vi } from 'vitest'

vi.mock('@vitejs/plugin-rsc/rsc', () => ({
  createTemporaryReferenceSet: vi.fn(),
  decodeAction: vi.fn(),
  decodeFormState: vi.fn(),
  decodeReply: vi.fn(),
  loadServerAction: vi.fn(),
}))

import { maybeAction } from '../../../../src/internal/server/actions.js'

describe('maybeAction', () => {
  it('returns action=false for GET requests', async () => {
    const req = new Request('http://localhost/')
    const result = await maybeAction(req)
    expect(result).toEqual({ action: false, formData: null })
  })

  it('returns action=true when x-rsc-action-id header is present', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'x-rsc-action-id': 'some-action' },
    })
    const result = await maybeAction(req)
    expect(result).toEqual({ action: true, formData: null })
  })

  it('returns action=false for non-multipart POST', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    })
    const result = await maybeAction(req)
    expect(result).toEqual({ action: false, formData: null })
  })

  it('returns action=false when multipart form cannot be parsed', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=--test' },
      body: new Blob(['not-form-data'], { type: 'multipart/form-data' }),
    })

    const result = await maybeAction(req)
    expect(result).toEqual({ action: false, formData: null })
  })
})
