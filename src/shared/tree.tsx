import { Suspense } from 'react'

import type { EnhancedMatch } from '../types'

import Fallback from '../ui/+error'

export function Tree({ match }: { match: NonNullable<EnhancedMatch> }) {
	const {
		params,
		error,
		ui: { layouts, Page, Err },
	} = match

	const initial = error ? (
		Err ? (
			<Suspense fallback={null}>
				<Err error={error} />
			</Suspense>
		) : (
			<Fallback error={error} />
		)
	) : Page ? (
		<Suspense fallback={null}>
			<Page params={params} />
		</Suspense>
	) : null

	if (!layouts?.length) return initial

	return layouts.reduce((child, Layout, idx) => {
		const key = `l:${idx}`

		return (
			<Suspense key={key} fallback={null}>
				<Layout params={params}>{child}</Layout>
			</Suspense>
		)
	}, initial)
}
