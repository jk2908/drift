import { Suspense } from 'react'

import { Link } from '@jk2908/drift/ui/link'

import { Blue } from './blue'

//export const prerender = true

export const metadata = {
	title: 'Home',
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default async function Page() {
	return (
		<div>
			Hi am a page <Blue />
			<Suspense fallback={<div>Loading suspended component...</div>}>
				<SuspendedComponent />
			</Suspense>
			<Link href="/profile">Go to Profile</Link>
		</div>
	)
}

async function SuspendedComponent() {
	await wait(5000)
	return <div>I am suspended!</div>
}
/*
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

			<Link href="/posts" preload="none">Go to Posts</Link>
			<Link href="/about" preload="none">Go to About</Link>
			<Link href="/profile">Go to Profile (no preloading)</Link>

			{!posts.length
				? 'Loading...'
				: posts.map(p => <div key={p.id}>{JSON.stringify(p)}</div>)}
		</div>
	)
}*/
