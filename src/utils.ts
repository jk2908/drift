/** biome-ignore-all lint/suspicious/noExplicitAny: // */

export async function maybeAsync<T extends (...args: any[]) => any>(
	fn: T,
	...args: Parameters<T>
): Promise<Awaited<ReturnType<T>>> {
	return Promise.resolve().then(() => fn(...args))
}

export function debounce(fn: (...args: any[]) => any, wait: number) {
	let timeoutId: ReturnType<typeof setTimeout> | null = null

	return (...args: any[]) => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}

		timeoutId = setTimeout(() => {
			fn.apply(null, args)
		}, wait)
	}
}
