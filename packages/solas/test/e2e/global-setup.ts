import { spawn, execSync, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = path.resolve(__dirname, '../../../../test/e2e/fixtures/basic')
const VITE_BIN = path.join(FIXTURE_DIR, 'node_modules/vite/bin/vite.js')
const PID_FILE = path.join(__dirname, '.server.pid')

const DEV_PORT = 8787
const PROD_PORT = 8788
const STARTUP_TIMEOUT = 30_000
const POLL_INTERVAL = 500

async function waitForServer(url: string, timeout: number): Promise<void> {
	const start = Date.now()
	while (Date.now() - start < timeout) {
		try {
			await new Promise<void>((resolve, reject) => {
				const req = http.get(url, (res) => {
					res.resume()
					resolve()
				})
				req.on('error', reject)
				req.setTimeout(2000, () => {
					req.destroy()
					reject(new Error('timeout'))
				})
			})
			return
		} catch {
			await new Promise((r) => setTimeout(r, POLL_INTERVAL))
		}
	}
	throw new Error(`Server at ${url} did not start within ${timeout}ms`)
}

function startServer(args: string[], label: string): ChildProcess {
	const proc = spawn('node', args, {
		cwd: FIXTURE_DIR,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: { ...process.env, NODE_ENV: 'development' },
	})

	proc.stdout?.on('data', (data: Buffer) => {
		const text = data.toString().trim()
		if (text.includes('ready') || text.includes('VITE') || text.includes('Local')) {
			console.log(`[${label}] ${text}`)
		}
	})

	proc.stderr?.on('data', (data: Buffer) => {
		const text = data.toString().trim()
		if (text) console.error(`[${label}:err] ${text}`)
	})

	return proc
}

export default async function globalSetup() {
	console.log('[e2e:setup] building fixture for production...')
	execSync(`node ${VITE_BIN} build`, {
		cwd: FIXTURE_DIR,
		stdio: 'pipe',
	})
	console.log('[e2e:setup] build complete')

	const devServer = startServer([VITE_BIN, 'dev', '--port', String(DEV_PORT)], 'e2e:dev')
	const prodServer = startServer([VITE_BIN, 'preview', '--port', String(PROD_PORT)], 'e2e:prod')

	const servers = [devServer, prodServer]

	try {
		await Promise.all([
			waitForServer(`http://localhost:${DEV_PORT}`, STARTUP_TIMEOUT),
			waitForServer(`http://localhost:${PROD_PORT}`, STARTUP_TIMEOUT),
		])
	} catch (err) {
		servers.forEach((s) => { s.kill('SIGTERM') })
		throw err
	}

	const pids = servers.map((s) => s.pid).filter((pid): pid is number => pid !== undefined)
	fs.writeFileSync(PID_FILE, pids.join('\n'))

	const cleanup = () => {
		try {
			fs.unlinkSync(PID_FILE)
		} catch {
			// ignore
		}
		servers.forEach((s) => {
			if (!s.killed) s.kill('SIGTERM')
		})
	}

	process.on('exit', cleanup)
	process.on('SIGINT', () => {
		cleanup()
		process.exit(0)
	})
	process.on('SIGTERM', () => {
		cleanup()
		process.exit(0)
	})
}
