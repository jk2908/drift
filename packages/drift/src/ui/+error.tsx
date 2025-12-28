import type { HTTPException } from '../shared/error'

export const metadata = async ({ error }: { error: HTTPException }) => ({
	title: `${error.status} ${error.message}`,
	description: error.stack,
})

export default function Page({ error }: { error: HTTPException }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<meta name="robots" content="noindex,nofollow" />
			</head>

			<body>
				<h1>
					{error.status && `${error.status} - `}
					{error.message}
				</h1>

				{error.stack && <pre>{error.stack}</pre>}
			</body>
		</html>
	)
}
