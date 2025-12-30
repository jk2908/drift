import type { LooseNumber } from '../types'

export type Payload = string | Record<string, unknown>

type HTTPExceptionOptions = {
	payload?: Payload
	cause?: unknown
}

type Code =
	| 100
	| 101
	| 102
	| 103
	| 200
	| 201
	| 202
	| 203
	| 204
	| 205
	| 206
	| 207
	| 208
	| 226
	| 300
	| 301
	| 302
	| 303
	| 304
	| 305
	| 306
	| 307
	| 308
	| 400
	| 401
	| 402
	| 403
	| 404
	| 405
	| 406
	| 407
	| 408
	| 409
	| 410
	| 411
	| 412
	| 413
	| 414
	| 415
	| 416
	| 417
	| 418
	| 421
	| 422
	| 423
	| 424
	| 425
	| 426
	| 428
	| 429
	| 431
	| 451
	| 500
	| 501
	| 502
	| 503
	| 504
	| 505
	| 506
	| 507
	| 508
	| 510
	| 511

export type StatusCode = LooseNumber<Code>

/**
 * Create a HTTPException instance
 * @param message - the message
 * @param status - the status code of the error
 * @param opts - the options
 * @param opts.payload - the payload
 * @param opts.cause - the cause
 */
export class HTTPException extends Error {
	status: StatusCode
	payload?: Payload
	digest?: string

	constructor(message: string, status: StatusCode, opts?: HTTPExceptionOptions) {
		super(message, { cause: opts?.cause })
		this.status = status
		this.payload = opts?.payload
	}
}

/**
 * Throw an HTTPException
 * @param message - the message
 * @param status - the status code of the error
 * @param opts - the options
 * @param opts.payload - the payload
 * @throws a HTTPException with the given status and options
 */
export function error(
	message: string,
	status: StatusCode,
	opts?: {
		payload?: Payload
		cause?: unknown
	},
): never {
	const h = new HTTPException(message, status, {
		payload: opts?.payload,
		cause: opts?.cause,
	})
	h.digest = `http_exception:${message}:${status}`

	throw h
}

export const NOT_FOUND = new HTTPException('Not found', 404)
