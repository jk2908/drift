export default function Shell({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</head>
			<body>
				<header>E2E Test App</header>
				<main>{children}</main>
				<footer>Footer</footer>
			</body>
		</html>
	)
}
