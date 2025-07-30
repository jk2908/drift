import { HYDRATE_ID } from '../config'

export function getHydrationData() {
	const el = document.getElementById(HYDRATE_ID)
	return !el || !el.textContent ? null : JSON.parse(JSON.stringify(el.textContent))
}
