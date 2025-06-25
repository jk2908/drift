export default function HomePage({ params }: { params: Record<string, string> }) {
	return (
		<div>
			<h1>Welcome to Drift Example</h1>
			<pre>{JSON.stringify(params, null, 2)}</pre>
		</div>
	)
}
