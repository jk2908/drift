export default function ServerError({ error }: { error?: { status?: number; message?: string } }) {
	return (
		<div>
			<h1>500 - Server Error</h1>
			<p>Something went wrong.</p>
			{error?.message && <p>{error.message}</p>}
		</div>
	)
}
