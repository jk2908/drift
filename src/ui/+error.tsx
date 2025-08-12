import type { HTTPException } from '../shared/error'

export const metadata = async ({ error }: { error: HTTPException }) => ({
	title: `${error.status} ${error.message}`,
	description: error.stack,
})

export default function Err({ error }: { error: HTTPException }) {
	return <pre>{JSON.stringify(error, null, 2)}</pre>
}
