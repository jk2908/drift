import DefaultErr from '../ui/+error'

import type { Match } from './router'

export function Tree({ match }: { match: Match }) {
	if (!match) return null

	const { layouts, Cmp, params, Err, error } = match

	return layouts.reduce(
		(child, Layout, idx) => {
			const key = `l:${idx}`

			return (
				<Layout key={key} params={params}>
					{child}
				</Layout>
			)
		},
		error ? (
			Err ? (
				<Err error={error} />
			) : (
				<DefaultErr error={error} />
			)
		) : (
			<Cmp params={params} />
		),
	)
}
