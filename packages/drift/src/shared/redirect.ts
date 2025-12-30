import type { RedirectStatusCode } from 'hono/utils/http-status'

/**
 * Redirect exception class to signal a redirect
 */
export class Redirect extends Error {
	url: string
	status: RedirectStatusCode
	digest?: string

	constructor(url: string, status: RedirectStatusCode = 307) {
		super(`Redirecting to ${url} with status ${status}`)

		this.name = 'Redirect'
		this.url = url
		this.status = status
	}
}

/**
 * Throws a Redirect exception to signal a redirect
 * @param url - the URL to redirect to
 * @param status - the HTTP status code for the redirect, defaults to 307
 */
export function redirect(url: string, status: RedirectStatusCode = 307): never {
	const r = new Redirect(url, status)
	r.digest = `redirect:${url}:${status}`

	throw r
}
