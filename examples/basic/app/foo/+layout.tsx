import { Suspense } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<h1>Foo Layout</h1>

			<Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
		</div>
	)
}
