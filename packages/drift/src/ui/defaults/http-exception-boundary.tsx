'use client'

import { HttpException, isHttpException } from '../../shared/error'

import { ErrorBoundary } from '../components/error-boundary'

export class HttpExceptionBoundary extends ErrorBoundary {
	componentDidCatch(error: Error) {
		if (!isHttpException(error)) throw error

		super.componentDidCatch(error)
	}

	render() {
		const { error } = this.state
		if (!error) return this.props.children

		if (
			typeof error === 'object' &&
			error !== null &&
			'digest' in error &&
			typeof error.digest === 'string'
		) {
			const [type, ...rest] = error.digest.split(':')

			if (type === 'http_exception') {
				const [message, status] = rest
				const httpError = new HttpException(message, Number(status))

				return typeof this.props.fallback === 'function'
					? this.props.fallback(httpError, this.reset)
					: this.props.fallback
			}
		}

		return null
	}
}
