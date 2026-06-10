import { SharedComponent } from './shared'

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<h1>History Example</h1>
			<SharedComponent />
			{children}
		</div>
	)
}
