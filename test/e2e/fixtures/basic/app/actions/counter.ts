'use server'

let count = 0

export async function getCount() {
	return count
}

export async function increment(formData: FormData) {
	count += Number(formData.get('amount')) || 1
}

export async function reset() {
	count = 0
}
