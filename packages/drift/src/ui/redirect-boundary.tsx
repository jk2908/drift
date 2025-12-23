'use client'

import { ErrorBoundary } from './error-boundary'

export function RedirectBoundary({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary
			fallback={err => {
				if ('digest' in err && typeof err.digest === 'string') {
					const [type, url] = err.digest.split(':')

					if (type === 'redirect') {
						return <meta httpEquiv="refresh" content={`0;url=${url}`} />
					}
				}

				// only catch redirects, re-throw other errors?
				throw err
			}}>
			{children}
		</ErrorBoundary>
	)
}
