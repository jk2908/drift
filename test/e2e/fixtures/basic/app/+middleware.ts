import type { HttpRouter } from '@jk2908/solas'

export const middleware: HttpRouter.Middleware = async (req, next) => {
	const response = await next()
	const headers = new Headers(response.headers)
	headers.set('x-middleware', 'executed')
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}
