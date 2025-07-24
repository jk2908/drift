import { customAlphabet } from 'nanoid'

/**
 * Wrap a function call in a Promise.resolve
 * @param fn - the function to call
 * @param args - the arguments to pass to the function
 * @returns a promise that resolves with the return value of the function
 */
// biome-ignore lint/suspicious/noExplicitAny: a bit sus
export async function maybeAsync<T extends (...args: any[]) => any>(
	fn: T,
	...args: Parameters<T>
): Promise<Awaited<ReturnType<T>>> {
	return Promise.resolve(fn(...args))
}

/**
 * Generate a random ID
 * @param length - length of the ID (default: 10)
 * @returns a random ID string safe for variables, URLs, and file paths
 */
export function id(length = 10) {
	return customAlphabet(
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
		length,
	)()
}
