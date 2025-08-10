import { DRIFT_PAYLOAD_ID } from '../config'

export function readDriftPayload() {
	const el = document.getElementById(DRIFT_PAYLOAD_ID)
	return !el || !el.textContent ? null : JSON.parse(JSON.stringify(el.textContent))
}
