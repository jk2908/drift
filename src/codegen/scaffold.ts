import path from 'node:path';
import { APP_DIR, ENTRY_SERVER, ENTRY_CLIENT } from '../constants';

export async function createAppEntries() {
  const cwd = process.cwd();

  const appDir = path.join(cwd, APP_DIR);
  const serverEntry = path.join(appDir, ENTRY_SERVER);
  const clientEntry = path.join(appDir, ENTRY_CLIENT);
  const shellEntry = path.join(appDir, 'shell.tsx');

  const promises: Promise<number>[] = [];

  if (!(await Bun.file(serverEntry).exists())) {
    promises.push(
      Bun.write(
        serverEntry,
        `
          import { handle } from '@jk2908/drift/server'
          
          import { Shell } from './shell'
          
          const app = handle(({ children, assets, metadata }) => 
            <Shell assets={assets} metadata={metadata}>
              {children}
            </Shell>
          )
          
          export default app
        `.trim()
      )
    );
  }

  if (!(await Bun.file(clientEntry).exists())) {
    promises.push(
      Bun.write(
        clientEntry,
        `
          import { mount } from '@jk2908/drift/client'

          import { Shell } from './shell'

          mount(({ children, assets, metadata }) =>
            <Shell assets={assets} metadata={metadata}>
              {children}
            </Shell>
          )
        `.trim()
      )
    );
  }

  if (!(await Bun.file(shellEntry).exists())) {
    promises.push(
      Bun.write(
        shellEntry,
        `
          export function Shell({
            children,
            metadata,
            assets,
          }: {
            children: React.ReactNode
            assets: React.ReactNode
            metadata?: React.ReactNode
          }) {
            return (
              <html lang="en">
                <head>
                  <meta charSet="utf-8" />
                  <meta content="width=device-width, initial-scale=1" name="viewport" />

                  {metadata}
                </head>

                <body>
                  {children}

                  {assets}
                </body>
              </html>
            )
          }
        `.trim()
      )
    );
  }

  return promises;
}
