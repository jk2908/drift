import type { ContentfulStatusCode } from 'hono/utils/http-status'

// built upon Hono's HTTPException for compat

export type Payload = string | Record<string, unknown>

type HTTPExceptionOptions = {
	payload?: Payload
	cause?: unknown
}

/**
 * Create a HTTPException instance
 * @param status - the status code of the error
 * @param options - the options
 * @param options.payload - the payload
 * @param options.cause - the cause 
 */
export class HTTPException extends Error {
	readonly status?: ContentfulStatusCode
	readonly payload?: Payload

	constructor(
		status: ContentfulStatusCode,
		message?: string,
		opts?: HTTPExceptionOptions,
	) {
		super(message, { cause: opts?.cause })
		this.status = status
		this.payload = opts?.payload
	}
}

/**
 * Throw an HTTPException
 * @param status - the status code of the error
 * @param message - the message 
 * @param options - the options 
 * @param options.payload - the payload 
 * @returns {never}
 * @throws {HTTPException} - throws a HTTPException with the given status and options
 */
export function error(
	status: ContentfulStatusCode,
	message?: string,
	options?: {
		payload?: Payload
		cause?: unknown
	},
): never {
	throw new HTTPException(status, message, {
		payload: options?.payload,
		cause: options?.cause,
	})
}
