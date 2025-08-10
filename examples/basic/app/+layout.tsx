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
				{metadata}

				{assets}
			</head>

			<body>
				<header>Drift Example App</header>
				<main>{children}</main>
				<footer>Footer</footer>
			</body>
		</html>
	)
}
