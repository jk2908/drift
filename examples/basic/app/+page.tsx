import { useState } from 'react'

import { Link } from '@jk2908/drift/ui/link'

export const metadata = {
	title: 'Home',
}

export default function HomePage({ params }: { params?: Record<string, string> }) {
	const [count, setCount] = useState(0)

	return (
		<div>
			<h1>Welcome to Drift Example</h1>
			<pre>{JSON.stringify(params, null, 2)}</pre>
			<button onClick={() => setCount(count + 1)} type="button">
				Click me! Count: {count}
			</button>

			<Link href="/about">Go to About</Link>
		</div>
	)
}
