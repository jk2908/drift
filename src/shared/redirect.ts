import type { RedirectStatusCode } from 'hono/utils/http-status'

/**
 * Create a redirect instance
 * @param status - the status code of the redirect
 * @param options - redirect options
 * @param options.url - the destination
 */
export class Redirect {
	readonly url: string
	readonly status: RedirectStatusCode

	constructor(status: RedirectStatusCode, url: string) {
		this.status = status
		this.url = url
	}
}

/**
 * Throw a redirect
 * @param status - the status code of the redirect
 * @param url - the destination 
 * @throws a Redirect error with the given status and URL
 */
export function redirect(status: RedirectStatusCode, url: string): never {
	throw new Redirect(status, url)
}
