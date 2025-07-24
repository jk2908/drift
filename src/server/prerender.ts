import type { Hono } from 'hono'

import type { BuildContext } from '../types'

import { maybeAsync } from '../utils'

/**
 * Check if a route is prerenderable
 * @param path - the path to the route
 * @param ctx - the build context
 * @returns true if the route is prerenderable, false otherwise
 */
export async function isPrerenderable(path: string, ctx: BuildContext) {
	try {
		const code = await Bun.file(path).text()
		const exports = ctx.transpiler.scan(code).exports

		return exports.some(e => e === 'prerender')
	} catch (err) {
		ctx.logger.error(`prerender:isPrerenderable ${path}`, err)
		return false
	}
}

/**
 * Get the list of prerenderable params for a route
 * @param path - the path to the route
 * @param ctx - the build context
 * @returns the list of prerenderable params
 */
export async function getPrerenderParamsList(path: string, ctx: BuildContext) {
	try {
		const mod = await import(path)

		if (!mod || !mod?.prerender || typeof mod.prerender !== 'function') {
			throw new Error(`${path} does not export a prerender function`)
		}

		return await maybeAsync(mod.prerender)
	} catch (err) {
		ctx.logger.error(`prerender:getPrerenderParamsList ${path}`, err)
		return []
	}
}

/**
 * Create prerender routes from a list of params
 * @param route - the route to create prerender routes from
 * @param list - the list of params to create prerender routes from
 * @returns the list of prerender routes
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
		.filter(res => !res.includes(':'))
}

/**
 * Prerender a route
 * @param route - the route to prerender
 * @param app - the app instance to use
 * @param ctx - the build context
 * @returns an async generator that yields the prerendered route
 * @throws if an error occurs during prerendering
 */
export async function* prerender(route: string, app: Hono, ctx: BuildContext) {
	try {
		const url = new URL(route, 'http://localhost')
		const req = new Request(url.toString())
		const res = await app.fetch(req)

		if (!res.ok) throw new Error(`${route} returned ${res.status}`)

		yield {
			route,
			status: res.status,
			headers: res.headers,
			body: await res.text(),
			res,
		}
	} catch (err) {
		ctx.logger.error(`prerender:prerender* ${route}`, err)
		throw err
	}
}
