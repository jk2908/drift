import { ErrorBoundary } from '@jk2908/drift/ui/error-boundary'

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary fallback={<div>Error: an error has occured</div>}>
			<div>
				<h1>Profile Layout</h1>

				{children}
			</div>
		</ErrorBoundary>
	)
}
