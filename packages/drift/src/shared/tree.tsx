import { Suspense } from 'react'

import type { EnhancedMatch } from '../types'

import DefaultErrorComponent from '../ui/defaults/+error'
import { HttpExceptionBoundary } from '../ui/defaults/http-exception-boundary'

type Match = NonNullable<EnhancedMatch>

/**
 * Route tree renderer
 * @description stucture is as follows:
 * - shell (layouts[0]) renders immediately as the "skeleton"
 * - everything inside the shell is wrapped in Suspense so it can stream
 * - error boundaries wrap Suspense so they can catch streaming errors
 *
 * <HTTPExceptionBoundary>           ← catches shell errors
 *   <Shell>                         ← renders immediately
 *     <Suspense fallback={...}>     ← inner inner can stream
 *       <HTTPExceptionBoundary>     ← catches inner errors
 *         <Layout>
 *           <Suspense>
 *             <Page />
 *           </Suspense>
 *         </Layout>
 *       </HTTPExceptionBoundary>
 *     </Suspense>
 *   </Shell>
 * </HTTPExceptionBoundary>
 */
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

	const Shell = layouts[0]
	if (!Shell) throw new Error('Shell layout is required in the route tree')

	// build the inner inner (everything after shell)
	let inner: React.ReactNode = null

	if (error) {
		// find the nearest error boundary at or above this depth
		// @note: error should only be present if there's an
		// error boundary in the tree. So findLast should
		// always succeed
		const Err =
			errors.slice(0, depth + 1).findLast(e => e !== null) ?? DefaultErrorComponent
		inner = <Err error={error} />
	} else if (Page) {
		inner = <Page params={params} />
	}

	// wrap from innermost to layouts[1] (skip shell)
	for (let idx = layouts.length - 1; idx >= 1; idx--) {
		const Layout = layouts[idx]
		const Loading = loaders[idx]
		const Err = errors[idx]

		// wrap in layout
		if (Layout) {
			inner = (
				<Layout key={`l:${idx}`} params={params}>
					{inner}
				</Layout>
			)
		}

		// wrap in suspense (for this segment's loading state)
		if (Loading) {
			inner = <Suspense fallback={<Loading />}>{inner}</Suspense>
		}

		// wrap in error boundary (outside suspense to catch streaming errors)
		if (Err) {
			inner = <HttpExceptionBoundary>{inner}</HttpExceptionBoundary>
		}
	}

	// now wrap with shell structure: shell renders immediately,
	// inner streams inside Suspense
	const ShellLoading = loaders[0]
	const ShellErr = errors[0]

	return (
		<HttpExceptionBoundary>
			<Shell params={params}>
				<Suspense fallback={ShellLoading ? <ShellLoading /> : null}>{inner}</Suspense>
			</Shell>
		</HttpExceptionBoundary>
	)
}
