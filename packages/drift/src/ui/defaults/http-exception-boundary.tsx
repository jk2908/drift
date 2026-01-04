'use client'

import { HTTPException } from '../../shared/error'

import { ErrorBoundary } from '../components/error-boundary'
import DefaultErrorComponent from './+error'

export function HTTPExceptionBoundary({
	children,
	path,
}: {
	children: React.ReactNode
	path?: string | null
}) {
	return (
		<ErrorBoundary
			fallback={err => {
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

						return <DefaultErrorComponent error={error} />
					}
				}

				// re-throw other errors
				throw err
			}}>
			{children}
		</ErrorBoundary>
	)
}
