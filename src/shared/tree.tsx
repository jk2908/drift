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
	const { Shell, layouts, Page, Err, loaders = [] } = ui

	if (!Shell) throw new Error('Missing app shell')

	const initial = error ? (
		Err ? (
			<Err error={error} />
		) : (
			<Fallback error={error} />
		)
	) : Page ? (
		<Page params={params} />
	) : null

	const ShellLoading = loaders[0]

	return (
		<Suspense fallback={ShellLoading ? <ShellLoading /> : null}>
			<Shell>
				{layouts?.length
					? layouts.reduce((child, Layout, idx) => {
							const key = `l:${idx}`
							// account for zero index shell loader
							const Loading = loaders[idx + 1]

							return (
								<Suspense key={key} fallback={Loading ? <Loading /> : null}>
									<Layout params={params}>{child}</Layout>
								</Suspense>
							)
						}, initial)
					: initial}
			</Shell>
		</Suspense>
	)
}
