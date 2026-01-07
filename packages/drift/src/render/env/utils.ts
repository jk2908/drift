import { HTTP_EXCEPTION_DIGEST_PREFIX } from '../../shared/error'
import { REDIRECT_DIGEST_PREFIX } from '../../shared/redirect'

const possibilities = [HTTP_EXCEPTION_DIGEST_PREFIX, REDIRECT_DIGEST_PREFIX]

export function getKnownDigest(err: unknown) {
	if (
		typeof err === 'object' &&
		err !== null &&
		'digest' in err &&
		typeof err.digest === 'string'
	) {
		for (const p of possibilities) {
			if (!err.digest.startsWith(p)) continue
			return err.digest
		}
	}

	return null
}
