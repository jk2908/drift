import { Suspense } from 'react'

import type { EnhancedMatch } from '../types'

import Fallback from '../ui/+error'

type Match = NonNullable<EnhancedMatch>

export function Tree({
	params,
	error,
	ui,
}: {
	params: Match['params']
	error: Match['error']
	ui: Match['ui']
}) {
	const { layouts, Page, Err } = ui

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
