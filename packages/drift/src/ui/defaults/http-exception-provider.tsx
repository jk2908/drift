import { createContext } from 'react'

import type { PathMap } from '../../types'

export const HTTPExceptionContext = createContext<PathMap['errors']>({})

export function HTTPExceptionProvider({
	registry,
	children,
}: {
	registry: PathMap['errors']
	children: React.ReactNode
}) {
	return <HTTPExceptionContext value={registry}>{children}</HTTPExceptionContext>
}
