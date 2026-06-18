import { Link } from '@jk2908/solas/router'

export const metadata = {
	title: 'Home',
}

export default function Page() {
	return (
		<div>
			<h1>Home</h1>
			<p>Welcome to the E2E test app</p>
			<Link href="/about">Go to About</Link>
		</div>
	)
}
