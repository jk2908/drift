import type { HttpException } from '../../shared/http-exception'

export default function NotFound({ error }: { error: HttpException }) {
	const title =
		'status' in error ? `${error.status} - ${error.message}` : '404 - Not found'

	return (
		<>
			<meta name="robots" content="noindex,nofollow" />
			<title>{title}</title>

			<h1>{title}</h1>
			<p>{error.message}</p>

			{error?.stack && <pre>{error.stack}</pre>}
		</>
	)
}
