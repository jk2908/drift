import { createRedirectDigest, Redirect } from '../../shared/redirect'

export function onError(err: unknown) {
	if (err instanceof Redirect) {
		return createRedirectDigest(err.url, err.status)
	}

	console.error(err)
}
