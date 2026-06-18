export async function GET() {
	return new Response(JSON.stringify({ message: 'Hello from API', items: [1, 2, 3] }), {
		headers: { 'Content-Type': 'application/json' },
	})
}

export async function POST(request: Request) {
	const body = await request.text()
	return new Response(JSON.stringify({ received: body }), {
		headers: { 'Content-Type': 'application/json' },
		status: 201,
	})
}
