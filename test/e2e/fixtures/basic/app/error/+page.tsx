import { abort } from '@jk2908/solas/navigation'

export default function Page() {
	abort(500, 'Intentional error for testing')
}
