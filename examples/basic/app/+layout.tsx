import type { ReactNode } from 'react'

export default function Shell({
	children,
	assets,
	metadata,
}: { children: ReactNode; assets?: ReactNode; metadata?: ReactNode }) {
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
