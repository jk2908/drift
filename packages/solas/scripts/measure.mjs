import fs from 'fs/promises'
import path from 'path'

async function getDirSize(dirPath) {
	let size = 0
	const files = await fs.readdir(dirPath, { withFileTypes: true })

	for (const file of files) {
		const filePath = path.join(dirPath, file.name)

		if (file.isDirectory()) {
			size += await getDirSize(filePath)
		} else {
			const stats = await fs.stat(filePath)
			size += stats.size
		}
	}

	return size
}

async function main() {
	try {
		const packageRoot = path.resolve(process.cwd())
		const distPath = path.join(packageRoot, 'dist')
		const measurePath = path.join(packageRoot, 'build', 'measure.json')

		const bundleSize = await getDirSize(distPath)
		const date = new Date().toISOString()

		await fs.mkdir(path.dirname(measurePath), { recursive: true })

		let measure = []
		try {
			const measureFile = await fs.readFile(measurePath, 'utf-8')
			measure = JSON.parse(measureFile)
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err
			}
		}

		measure.push({
			date,
			bundleSize,
		})

		await fs.writeFile(measurePath, JSON.stringify(measure, null, 2))

		console.log(`Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`)
		console.log(`Bundle size saved to ${measurePath}`)
	} catch (error) {
		console.error('Error measuring bundle size:', error)
		process.exit(1)
	}
}

main()
