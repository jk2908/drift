export default async function Layout({ children }: { children: React.ReactNode }) {
	await new Promise(res => setTimeout(res, 4000))

	return (
		<div>
			<h1>About Me</h1>
			<p>This is the about me page.</p>
			{children}
		</div>
	)
}
