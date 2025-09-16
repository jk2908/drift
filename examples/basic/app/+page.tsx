import { useEffect, useState } from 'react'

import { Link } from '@jk2908/drift/ui/link'

export const metadata = {
	title: 'Home',
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function HomePage({ params }: { params?: Record<string, string> }) {
	const [count, setCount] = useState(0)
	const [posts, setPosts] = useState([])

	useEffect(() => {
		wait(3000).then(() => {
			fetch('/posts').then(res => res.json().then(setPosts))
		})
	}, [])

	return (
		<div>
			<h1>Welcome to Drift Example</h1>
			<pre>{JSON.stringify(params, null, 2)}</pre>

			<button onClick={() => setCount(count + 1)} type="button">
				Click me! Count: {count}
			</button>

			<Link href="/about">Go to About</Link>

			{!posts.length
				? 'Loading...'
				: posts.map(p => <div key={p.id}>{JSON.stringify(p)}</div>)}
		</div>
	)
}
