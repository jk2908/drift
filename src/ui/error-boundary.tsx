import { Component } from 'react'

type Props = {
	fallback: ((err: Error, reset: () => void) => React.ReactNode) | React.ReactNode
	onReset?: () => void
	children: React.ReactNode
}

/**
 * A component that catches synchronous errors in its child component tree and displays a fallback UI
 * @param props - the props for the component
 * @param props.fallback - the fallback UI to display when an error occurs, can be a function or a React node
 * @param props.onReset - a callback function to call when the error is reset
 * @param props.children - the child components to render
 * @returns Component
 */
export class ErrorBoundary extends Component<
	Props,
	{
		error: Error | null
	}
> {
	constructor(props: Props) {
		super(props)

		this.state = { error: null }
		this.reset = this.reset.bind(this)
	}

	static getDerivedStateFromError(error: Error) {
		return { error }
	}

	reset() {
		this.props.onReset?.()
		this.state.error && this.setState({ error: null })
	}

	render() {
		const { error } = this.state

		if (!error) return this.props.children

		return typeof this.props.fallback === 'function'
			? this.props.fallback(error, this.reset)
			: this.props.fallback
	}
}
