import type { Hono } from 'hono'

import type { BuildContext } from '../types'

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
			ctx.logger.warn(
				'[prerender:getPrerenderParamsList]',
				`No exported prerender function found in ${path}`,
			)

			return []
		}

		return await Promise.resolve(mod.prerender())
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
 * @param renderer - the renderer function to use
 * @param urls - the URLs to prerender
 * @param urls.route - the route to prerender
 * @param urls.app - the app URL to use as the base for relative routes
 * @param ctx - the build context
 * @returns an async generator that yields the prerendered route
 * @throws if an error occurs during prerendering
 */
export async function* prerender(
	renderer: (req: Request) => Promise<Response>,
	urls: {
		target: string
		base: string
	},
	ctx?: BuildContext,
) {
	try {
		const url =
			urls.target.startsWith('http://') || urls.target.startsWith('https://')
				? new URL(urls.target)
				: new URL(urls.target, urls.base)

		const req = new Request(url.toString(), {
			method: 'GET',
			headers: {
				Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
				'X-Drift-Renderer': 'prerender',
				Host: url.host,
				Origin: url.origin,
			},
		})

		const res = await renderer(req)

		if (!res.ok) throw new Error(`${urls.target} returned ${res.status}`)

		yield {
			route: urls.target,
			status: res.status,
			headers: res.headers,
			body: await res.text(),
			res,
		}
	} catch (err) {
		ctx?.logger.error(`[prerender*] ${urls.target}`, err)
		throw err
	}
}
