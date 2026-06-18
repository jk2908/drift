export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<section>
			<nav>Dashboard Nav</nav>
			<div>{children}</div>
		</section>
	)
}
