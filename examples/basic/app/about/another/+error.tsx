'use client'

import type { HTTPException } from '@jk2908/drift/shared/error'

export default function Err({ error }: { error: HTTPException }) {
	console.log(error)
	return (
		<div>
			{error.message} {JSON.stringify(error, null, 2)}
			{error.status}
			{error.stack}
			{error.digest}
		</div>
	)
}
