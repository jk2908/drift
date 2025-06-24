import path from 'node:path'

import { ROUTES_DIR, GENERATED_DIR } from '../constants'

export function getImportPath(file: string) {
	const cwd = process.cwd()
	const generatedDir = path.join(cwd, GENERATED_DIR)

	return path
		.relative(generatedDir, path.resolve(cwd, file))
		.replace(/\\/g, '/')
		.replace(/\.(t|j)sx?$/, '')
}

export const isDynamicRoute = (route: string) => route.includes(':')

export function routify(file: string, replace?: string) {
	return (
	  file
		.replace(new RegExp(`^${ROUTES_DIR}`), '')
		.replace(/\/index\.(j|t)sx?$/, '/')
		.replace(/\.(j|t)sx?$/, '')
		.replace(/\[(.+?)\]/g, ':$1') || '/'
	)
  }
  