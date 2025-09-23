// auto-generated

import { handle } from './server'

import Shell from '../app/+layout'

const app = handle(({ children, assets, metadata }) => (
	<Shell assets={assets} metadata={metadata}>
		{children}
	</Shell>
))

export default app
