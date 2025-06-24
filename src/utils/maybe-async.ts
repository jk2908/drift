// biome-ignore lint/suspicious/noExplicitAny: //
export async function maybeAsync<T extends (...args: any[]) => any>(
	fn: T,
	...args: Parameters<T>
) {
	return await Promise.resolve(fn(...args))
}
