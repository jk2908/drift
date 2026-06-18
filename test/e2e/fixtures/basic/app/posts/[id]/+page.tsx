export const metadata = {
	title: 'Post',
}

export default function Page({ params }: { params: { id: string } }) {
	return (
		<div>
			<h1>Post {params.id}</h1>
			<p>Viewing post number {params.id}</p>
		</div>
	)
}
