import type { HTTPException } from '../shared/error'

export default function Page({ error }: { error: HTTPException }) {
	return <pre>{JSON.stringify(error, null, 2)}</pre>
}
