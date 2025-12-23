import type { RedirectStatusCode } from 'hono/utils/http-status'

export class Redirect extends Error {
	readonly url: string
	readonly status: RedirectStatusCode

	constructor(url: string, status: RedirectStatusCode = 307) {
		super(`Redirecting to ${url} with status ${status}`)

		this.name = 'Redirect'
		this.url = url
		this.status = status
	}
}

export function redirect(url: string, status: RedirectStatusCode = 307): never {
	throw new Redirect(url, status)
}

export function createRedirectDigest(
	url: string,
	status: RedirectStatusCode = 307,
): string {
	return `redirect:${url}:${status}`
}
