import type { HTTPException } from '@jk2908/drift/shared/error'

export default function Err({ error }: { error: HTTPException }) {
  return <div>{error.message} hi</div>
}