'use client'

import type { HTTPException } from '../../shared/error'

export default function Err({ error }: { error: HTTPException | Error }) {
	const title = 'status' in error ? `${error.status} - ${error.message}` : error.message
	const description = error?.stack || ''

	return (
		<>
			<meta name="robots" content="noindex,nofollow" />
			<title>{title}</title>
			<meta name="description" content={description} />

			<h1>{title}</h1>

			{error?.stack && <pre>{error.stack}</pre>}
		</>
	)
}
