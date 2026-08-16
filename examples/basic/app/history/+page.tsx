'use client'

import { Link, useRouter } from '@jk2908/solas/router'

export default function Page() {
	const { history, go } = useRouter()

	return (
		<>
			<pre>{JSON.stringify(history, null, 2)}</pre>

			<Link href="/history/history-2">Go</Link>

			<button type="button" onClick={() => go(-1)}>
				Go Back
			</button>
			<button type="button" onClick={() => go(1)}>
				Go Forward
			</button>
		</>
	)
}
