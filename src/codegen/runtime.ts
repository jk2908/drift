import { ASSETS_DIR, GENERATED_DIR, INJECT_RUNTIME } from '../config'

export function createRuntime() {
	return `
    export const runtime = (
      <>
        {import.meta.env?.DEV && (
          <>
            <script
              type="module"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: //
              dangerouslySetInnerHTML={{
                __html: 
                  \`import RefreshRuntime from '../@react-refresh'
                  
                    RefreshRuntime.injectIntoGlobalHook(window)
                    window.$RefreshReg$ = () => {}
                    window.$RefreshSig$ = () => type => type
                    window.__vite_plugin_react_preamble_installed__ = true
                \`,
              }}
            />

            <script type="module" src="../@vite/client" />
          </>
        )}
        <script
          type="module"
          src={import.meta.env.PROD ? '/${ASSETS_DIR}/${INJECT_RUNTIME}' : '/${GENERATED_DIR}/entry.client.tsx'}
        />
      </>
    )
  `.trim()
}
