import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PID_FILE = path.join(__dirname, '.server.pid')

export default async function globalTeardown() {
	try {
		const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10)
		if (pid) {
			process.kill(pid, 'SIGTERM')
		}
		fs.unlinkSync(PID_FILE)
	} catch {
		// PID file may not exist or process already exited
	}
}
