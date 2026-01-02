'use client'

import { use } from 'react'

import { HTTPException } from '../../shared/error'

import { ErrorBoundary } from '../components/error-boundary'
import { HTTPExceptionContext } from './http-exception-provider'

export function HTTPExceptionBoundary({
	children,
	path,
}: {
	children: React.ReactNode
	path?: string | null
}) {
	const registry = use(HTTPExceptionContext)

	return (
		<ErrorBoundary
			fallback={err => {
				console.log(
					'HTTPExceptionBoundary caught error:',
					JSON.stringify(err),
					path,
					registry,
				)

				if (
					typeof err === 'object' &&
					err !== null &&
					'digest' in err &&
					typeof err.digest === 'string'
				) {
					const [type, ...rest] = err.digest.split(':')

					if (type === 'http_exception') {
						const [message, status] = rest
						const error = new HTTPException(message, Number(status))
						const importer = path ? registry[path] : undefined

						if (!importer) {
							return (
								<div>
									<h1>
										{error.status} - {error.message}
									</h1>
								</div>
							)
						}

						// dynamic import and render
						const mod = use(importer()) as {
							default: React.ComponentType<{ error: HTTPException | Error }>
						}

						return (
							<>
								<meta name="robots" content="noindex,nofollow" />
								<mod.default error={error} />
							</>
						)
					}
				}

				// re-throw other errors
				throw err
			}}>
			{children}
		</ErrorBoundary>
	)
}
