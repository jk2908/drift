import { handle } from 'drift/server'
import RootLayout from '../app/layout'

const app = handle(({ children, assets, metadata }) => (
	<RootLayout assets={assets} metadata={metadata}>
		{children}
	</RootLayout>
))

export default app
