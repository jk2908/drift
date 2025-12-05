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

	const expectShellLoader = loaders.length === (layouts?.length ?? 0) + 1
	const ShellLoader = expectShellLoader ? loaders[0] : null
	const layoutLoaders = expectShellLoader ? loaders.slice(1) : loaders

	const initial = error ? (
		Err ? (
			<Err error={error} />
		) : (
			<Fallback error={error} />
		)
	) : Page ? (
		<Page params={params} />
	) : null

	return (
		<Suspense fallback={ShellLoader ? <ShellLoader /> : null}>
			<Shell>
				{layouts?.length
					? layouts.reduce((child, Layout, idx) => {
							const key = `l:${idx}`
							const Loading = layoutLoaders[idx]

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
