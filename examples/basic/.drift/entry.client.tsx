import { mount } from '.drift/client'

        import Shell from '../app/+layout'

        mount(({ children, assets, metadata }) =>
          
    <Shell assets={assets} metadata={metadata}>
      {children}
    </Shell>
  
        )