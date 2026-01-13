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
		this.digest = `${REDIRECT_DIGEST_PREFIX}:${status}:${url}`
	}
}

export const REDIRECT_DIGEST_PREFIX = 'REDIRECT'

/**
 * Check if an error is a Redirect error
 * @description uses the digest property to work across server/client boundaries
 * @param err - the error to check
 * @returns true if the error is a Redirect error, false otherwise
 */
export function isRedirect(err: unknown) {
	return (
		typeof err === 'object' &&
		err !== null &&
		'digest' in err &&
		typeof err.digest === 'string' &&
		err.digest.startsWith(REDIRECT_DIGEST_PREFIX)
	)
}

/**
 * Throws a Redirect exception to signal a redirect
 * @param url - the URL to redirect to
 * @param status - the HTTP status code for the redirect, defaults to 307
 */
export function redirect(url: string, status: RedirectStatusCode = 307): never {
	throw new Redirect(url, status)
}
