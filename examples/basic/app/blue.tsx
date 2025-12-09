'use client'

import { useState } from 'react'

export function Blue() {
	const [count, setCount] = useState(0)

	return (
		<div style={{ backgroundColor: 'blue', width: '100px', height: '100px' }}>
			<button type="button" onClick={() => setCount(count + 1)}>
				Count: {count}
			</button>
		</div>
	)
}
