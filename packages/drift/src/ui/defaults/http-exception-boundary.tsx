'use client'

import { HTTPException } from '../../shared/error'

import { ErrorBoundary } from '../components/error-boundary'

export function HTTPExceptionBoundary({
	children,
	Component,
}: {
	children: React.ReactNode
	Component: React.ComponentType<{ error?: HTTPException | Error }>
}) {
	return (
		<ErrorBoundary
			fallback={err => {
				// only catch HTTPExceptions
				if (
					typeof err === 'object' &&
					err !== null &&
					'digest' in err &&
					typeof err.digest === 'string'
				) {
					const [type, ...rest] = err.digest.split(':')

					if (type === 'http_exception') {
						const [message, status] = rest

						return (
							<Component
								error={new HTTPException(message, Number(status), { cause: err })}
							/>
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
