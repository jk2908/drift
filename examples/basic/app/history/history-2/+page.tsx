'use client'

import { useRouter } from '@jk2908/solas/router'

export default function Page() {
	const { history, go } = useRouter()

	return (
		<>
			<pre>{JSON.stringify(history, null, 2)}</pre>

			<button type="button" onClick={() => go(-1)}>
				Go Back
			</button>
			<button type="button" onClick={() => go(1)}>
				Go Forward
			</button>
		</>
	)
}
