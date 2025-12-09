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
 * Generate a random id
 * @param length - length of the id (default: 10)
 * @returns a random id string safe for variables, URLs, and file paths
 */
export function id(length = 10) {
	return customAlphabet(
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
		length,
	)()
}

/**
 * Get the relative base path for the client runtime
 * @param path - the path to get the relative base path from
 * @returns - the relative base path
 */
export function getRelativeBasePath(path: string) {
	if (import.meta.env.DEV) {
		const segments = path.split('/').filter(Boolean)
		return segments.length === 0 ? '/' : segments.map(() => '../').join('')
	}

	return import.meta.env.BASE_URL ?? '/'
}
