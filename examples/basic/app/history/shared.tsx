'use client'

import { useState } from 'react'

export function SharedComponent() {
	const [count, setCount] = useState(0)

	return (
		<div>
			<p>Shared Component Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>Increment</button>
		</div>
	)
}
