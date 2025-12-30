import type { HTTPException } from '@jk2908/drift/shared/error'

export default function Err({ error }: { error?: HTTPException | Error }) {
	return <div style={{ color: 'blue' }}>{JSON.stringify(error, null, 2)}</div>
}
