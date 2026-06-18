import * as counter from './counter'

export const metadata = {
	title: 'Actions',
}

export default function Page() {
	return (
		<div>
			<h1>Server Actions</h1>
			<form action={counter.increment}>
				<input type="hidden" name="amount" value="1" />
				<span data-testid="count">{counter.getCount()}</span>
				<button type="submit" data-testid="increment">
					Increment
				</button>
				<button formAction={counter.reset} type="submit" data-testid="reset">
					Reset
				</button>
			</form>
		</div>
	)
}
