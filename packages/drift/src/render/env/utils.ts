export function onError(err: unknown) {
	if (
		typeof err === 'object' &&
		err !== null &&
		'digest' in err &&
		typeof err.digest === 'string'
	) {
		return err.digest
	}

	console.error(err)
}
