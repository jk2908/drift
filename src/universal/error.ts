export type Payload = string | Record<string, unknown>

export type $ErrorOptions = {
	name: string
	message?: string
	status?: number
	payload?: Payload
	cause?: unknown
}

export const ERROR_SYMBOL = Symbol('error')

/**
 * A custom error class that extends the built-in Error class
 * @param options - The options for the error
 * @param options.name - The name of the error
 * @param options.message - The message of the error
 * @param options.status - The status code of the error
 * @param options.payload - The payload of the error
 * @param options.cause - The cause of the error
 */
export class $Error extends Error {
	readonly [ERROR_SYMBOL]: true = true as const
	readonly status?: number
	readonly payload?: Payload
	readonly cause?: unknown

	constructor({ name, message, status, payload, cause }: $ErrorOptions) {
		super(message ?? name)
		this.name = name
		this.status = status
		this.payload = payload
		this.cause = cause
	}
}

/**
 * A function that throws a custom error
 * @param status - The status code of the error
 * @param name - The name of the error
 * @param message - The message of the error
 * @param options - The options for the error
 * @param options.payload - The payload of the error
 * @param options.cause - The cause of the error
 */
export function $error(
	status: number,
	name: string,
	message?: string,
	options?: {
		payload?: Payload
		cause?: unknown
	},
): never {
	throw new $Error({
		status,
		name,
		message,
		payload: options?.payload,
		cause: options?.cause,
	})
}

/**
 * A function that converts an unknown error to $ErrorOptions
 * @param err - The error to convert
 * @returns The $ErrorOptions
 */
export function to$ErrorOptions(err: unknown) {
	if (err instanceof $Error) {
		return {
			name: err.name,
			message: err.message,
			status: err.status,
			payload: err.payload,
			cause: err.cause,
		} satisfies $ErrorOptions
	}

	if (err instanceof Error) {
		return {
			name: err.name,
			message: err.message,
			cause: err.cause,
		} satisfies $ErrorOptions
	}

	return {
		name: 'UnknownError',
		message: String(err),
	} satisfies $ErrorOptions
}
