export class BoundaryError extends Error {
	digest?: string

	constructor(digest?: string) {
		super()

		if (digest) this.digest = digest
	}
}
