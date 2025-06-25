export type $RedirectStatus = 301 | 302 | 303 | 307 | 308
export const REDIRECT_SYMBOL = Symbol('redirect')

/**
 * A custom redirect class that extends the built-in Error class
 * @param options - The options for the redirect
 * @param options.url - The URL to redirect to
 * @param options.status - The status code to redirect with
 */
export class $Redirect {
	readonly url: string
	readonly status: $RedirectStatus
	readonly [REDIRECT_SYMBOL]: true = true as const

	constructor(status: $RedirectStatus, url: string) {
		this.status = status
		this.url = url
	}
}

/**
 * A function that throws a redirect error
 * @param status - The status code to redirect with
 * @param url - The URL to redirect to
 * @returns Never
 */
export function $redirect(status: $RedirectStatus, url: string): never {
	throw new $Redirect(status, url)
}
