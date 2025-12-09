export async function Yellow() {
	await new Promise(resolve => setTimeout(resolve, 3000))

	return <div style={{ backgroundColor: 'yellow' }}>Yellow Page</div>
}
