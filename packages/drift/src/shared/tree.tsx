import { Suspense } from 'react'

import type { EnhancedMatch } from '../types'

import DefaultErrorPage from '../ui/defaults/+error'

type Match = NonNullable<EnhancedMatch>

export function Tree({
	depth,
	paths,
	params,
	error,
	ui,
}: {
	depth: Match['__depth']
	paths: Match['paths']
	params: Match['params']
	error: Match['error']
	ui: Match['ui']
}) {
	const { layouts, Page, errors, loaders } = ui

	// layouts[0] is the shell - required
	if (!layouts?.[0]) return <DefaultErrorPage error={new Error('Missing app shell')} />

	// start with either the error or page component
	let initial: React.ReactNode = null

	if (error) {
		// find the nearest error boundary at or above this depth
		const Err = errors.slice(0, depth + 1).findLast(e => e !== null) ?? DefaultErrorPage
		initial = <Err error={error} />
	} else if (Page) {
		initial = <Page params={params} />
	}

	// wrap from inside out: page -> layouts -> shell
	let node = initial

	for (let idx = layouts.length - 1; idx >= 0; idx--) {
		const Layout = layouts[idx]
		const Loading = loaders[idx]
		const Err = errors[idx]

		if (Layout) {
			node = (
				<Layout key={`l:${idx}`} params={params}>
					{node}
				</Layout>
			)
		}

		if (Loading) {
			node = <Suspense fallback={<Loading />}>{node}</Suspense>
		}
	}

	return node
}
