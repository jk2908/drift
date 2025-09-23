export const metadata = {
	title: 'Drift Example App'
}

export default function Shell({
	children,
	assets,
	metadata,
}: {
	children: React.ReactNode
	assets?: React.ReactNode
	metadata?: React.ReactNode
}) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				
				{metadata}
			</head>

			<body>
				<header>Drift Example App</header>
				<main>{children}</main>
				<footer>Footer</footer>

				{assets}
			</body>
		</html>
	)
}
