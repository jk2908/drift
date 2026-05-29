'use client'

import { useState } from 'react'

import { useRouter } from '@jk2908/solas/router'

export function RefreshButton() {
	const { isNavigating, refresh } = useRouter()
	const [clicks, setClicks] = useState(0)

	return (
		<div>
			<button
				type="button"
				onClick={() => {
					setClicks(count => count + 1)
					refresh()
				}}>
				Refresh route
			</button>
			<div>Client refresh clicks: {clicks}</div>
			<div>Is navigating: {isNavigating ? 'Yes' : 'No'}</div>
		</div>
	)
}
