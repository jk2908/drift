import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import type { BoundaryError } from '../../../../src/internal/boundary-error.js'
import { ErrorBoundary } from '../../../../src/internal/ui/error-boundary.js'

function ErrorThrower({ message }: { message: string }) {
	throw new Error(message)
	// to satisfy ts
	return null
}

function createInstance(props: { onError?: (error: BoundaryError) => void } = {}) {
	return new ErrorBoundary({
		fallback: 'error',
		children: null,
		...props,
	})
}

describe('ErrorBoundary', () => {
	describe('static methods', () => {
		it('getDerivedStateFromError captures the error', () => {
			const result = ErrorBoundary.getDerivedStateFromError(new Error('boom'))
			expect(result).toEqual({ error: new Error('boom') })
		})

		it('componentDidCatch calls onError prop', () => {
			const onError = vi.fn()
			const instance = createInstance({ onError })
			instance.componentDidCatch(new Error('test error'))
			expect(onError).toHaveBeenCalledWith(new Error('test error'))
		})

		it('componentDidCatch handles missing onError prop', () => {
			const instance = createInstance()
			expect(() => instance.componentDidCatch(new Error('test'))).not.toThrow()
		})
	})

	describe('render', () => {
		beforeEach(() => {
			vi.stubGlobal('console', { ...console, error: vi.fn() })
		})

		it('renders children when no error', async () => {
			const screen = await render(
				<ErrorBoundary fallback={<div>fallback</div>}>
					<div>child content</div>
				</ErrorBoundary>,
			)

			await expect.element(screen.getByText('child content')).toBeVisible()
			await expect.element(screen.getByText('fallback')).not.toBeInTheDocument()
		})

		it('renders fallback when child throws', async () => {
			const screen = await render(
				<ErrorBoundary fallback={<div>error ui</div>}>
					<ErrorThrower message="boom" />
				</ErrorBoundary>,
			)

			await expect.element(screen.getByText('error ui')).toBeVisible()
		})

		it('calls onError when child throws', async () => {
			const onError = vi.fn()
			await render(
				<ErrorBoundary fallback={<div>fallback</div>} onError={onError}>
					<ErrorThrower message="boom" />
				</ErrorBoundary>,
			)

			expect(onError).toHaveBeenCalledOnce()
		})

		it('calls function fallback with error', async () => {
			const fallback = vi.fn().mockReturnValue(<div>function fallback</div>)
			const screen = await render(
				<ErrorBoundary fallback={fallback}>
					<ErrorThrower message="custom error" />
				</ErrorBoundary>,
			)

			expect(fallback).toHaveBeenCalled()
			await expect.element(screen.getByText('function fallback')).toBeVisible()
		})

		it('passes error message to function fallback', async () => {
			const screen = await render(
				<ErrorBoundary fallback={(error: Error) => <div>Error: {error.message}</div>}>
					<ErrorThrower message="test error" />
				</ErrorBoundary>,
			)

			await expect.element(screen.getByText('Error: test error')).toBeVisible()
		})
	})
})
