export default async function Page() {
	await new Promise(resolve => setTimeout(resolve, 2000))
	const data = await fetch('http://localhost:8787/posts').then(res => res.json())

	return (
		<div>
			{data?.map(d => (
				<div key={d.id}>{d.title}</div>
			))}
		</div>
	)
}
