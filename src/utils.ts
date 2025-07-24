// biome-ignore lint/suspicious/noExplicitAny: i'm suspicious of u
export async function maybeAsync<T extends (...args: any[]) => any>(
	fn: T,
	...args: Parameters<T>
): Promise<Awaited<ReturnType<T>>> {
	return Promise.resolve().then(() => fn(...args))
}