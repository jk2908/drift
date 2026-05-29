import { Link } from '@jk2908/solas/router'

import { RefreshButton } from './refresh-button.js'

export const prerender = false

export default function Page() {
	const serverTime = new Date().toISOString()
	const requestNonce = Math.random().toString(36).slice(2, 10)

	return (
		<div>
			<h1>Refresh</h1>
			<p>Use the button below to fetch a fresh RSC payload for this route.</p>
			<div>Server time: {serverTime}</div>
			<div>Request nonce: {requestNonce}</div>
			<p>
				After each refresh, the server values above should change while the client state
				below stays in place.
			</p>
			<RefreshButton />
			<Link href="/navigation">Back to navigation</Link>
		</div>
	)
}
