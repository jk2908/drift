import type { Hono } from 'hono'

import { maybeAsync } from '../utils/maybe-async'

/**
 * Check if a route is prerenderable
 * @param path - The path to the route
 * @param transpiler - The transpiler to use
 * @returns True if the route is prerenderable, false otherwise
 */
export async function isPrerenderable(
	path: string,
	transpiler: InstanceType<typeof Bun.Transpiler>,
) {
	try {
		const code = await Bun.file(path).text()
		const exports = transpiler.scan(code).exports

		return exports.some(e => e === 'prerender')
	} catch (err) {
		console.error(`framework:prerender:isPrerenderable: ${path}`, err)
		return false
	}
}

/**
 * Get the list of prerenderable params for a route
 * @param path - The path to the route
 * @returns The list of prerenderable params
 */
export async function getPrerenderParamsList(path: string) {
	try {
		const mod = await import(path)

		if (!mod || !mod?.prerender || typeof mod.prerender !== 'function') {
			throw new Error(
				`framework:prerender:getPrerenderParamsList ${path} does not export a prerender function`,
			)
		}

		return await maybeAsync(mod.prerender)
	} catch (err) {
		console.error(
			`framework:prerender:getPrerenderParamsList: error getting prerenderable values from ${path}`,
			err,
		)
		return []
	}
}

/**
 * Create prerender routes from a list of params
 * @param route - The route to create prerender routes from
 * @param list - The list of params to create prerender routes from
 * @returns The list of prerender routes
 */
export function createPrerenderRoutesFromParamsList(
	route: string,
	list: Record<string, string>[],
) {
	return list
		.map(list =>
			Object.entries(list).reduce(
				(acc, [key, value]) => acc.replace(`:${key}`, encodeURIComponent(String(value))),
				route,
			),
		)
		.filter(resolved => !resolved.includes(':'))
}

/**
 * Prerender a route
 * @param route - The route to prerender
 * @param app - The app to use
 * @returns The prerender result
 */
export async function* prerender(route: string, app: Hono) {
	try {
		const url = new URL(route, 'http://localhost')
		const req = new Request(url.toString())
		const res = await app.fetch(req)

		if (!res.ok) throw new Error(`framework:prerender:prerender* ${route} returned ${res.status}`)

		yield {
			route,
			status: res.status,
			headers: res.headers,
			body: await res.text(),
			res,
		}
	} catch (err) {
		console.error(`framework:prerender:prerender* error prerendering ${route}`, err)
		throw err
	}
}
