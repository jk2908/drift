import { mount } from 'drift/client'
import RootLayout from '../app/layout'

mount(({ children, assets, metadata }) => (
	<RootLayout assets={assets} metadata={metadata}>
		{children}
	</RootLayout>
))
