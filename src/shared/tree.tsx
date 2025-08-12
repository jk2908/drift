import Fallback from '../ui/+error'

import type { Match } from './router'

export function Tree({ match }: { match: NonNullable<Match> }) {
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
				<Fallback error={error} />
			)
		) : (
			<Cmp params={params} />
		),
	)
}
