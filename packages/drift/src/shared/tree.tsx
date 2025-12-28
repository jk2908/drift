import { Suspense } from 'react'

import type { EnhancedMatch } from '../types'

import Fallback from '../ui/+error'
import { RedirectBoundary } from '../ui/redirect-boundary'

import type { HTTPException } from './error'

type Match = NonNullable<EnhancedMatch>

export function Tree({
	depth,
	params,
	error,
	ui,
}: {
	depth?: Match['__depth']
	params?: Match['params']
	error?: Match['error'] | HTTPException
	ui?: Match['ui']
}) {
	const { Shell, layouts, Page, Err, loaders = [] } = ui ?? {}

	let initial: React.ReactNode

	if (error && !Err) {
		return <Fallback error={error} />
	} else {
		if (!Shell) return <Fallback error={new Error('Missing app shell')} />

		if (error && Err) {
			initial = <Err error={error} />
		} else if (Page) {
			// if we're deeper than 0 (root) and there's no
			// layout at this depth but there is a loader,
			// wrap the page in suspense
			if (depth !== undefined && depth > 0 && !layouts?.[depth] && loaders[depth]) {
				const Loading = loaders?.[depth]

				initial = (
					<Suspense fallback={<Loading />}>
						<Page params={params} />
					</Suspense>
				)
			} else {
				initial = <Page params={params} />
			}
		} else {
			initial = null
		}
	}

	const ShellLoading = loaders[0]

	return (
		<RedirectBoundary>
			<Suspense fallback={ShellLoading ? <ShellLoading /> : null}>
				<Shell params={params}>
					{layouts?.length
						? layouts.reduce((child, Layout, idx) => {
								if (!Layout) return child

								const key = `l:${idx}`
								// account for shell loader at index 0
								const Loading = loaders[idx + 1]

								if (Loading) {
									return (
										<Suspense key={key} fallback={Loading ? <Loading /> : null}>
											<Layout params={params}>{child}</Layout>
										</Suspense>
									)
								}

								return (
									<Layout key={key} params={params}>
										{child}
									</Layout>
								)
							}, initial)
						: initial}
				</Shell>
			</Suspense>
		</RedirectBoundary>
	)
}
