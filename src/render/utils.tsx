import { DRIFT_PAYLOAD_ID } from '../config'

/**
 * Create the asset JSX to render
 * @param relativeBase - the base path for the assets
 * @param payload - the drift payload
 * @returns the asset scripts (as JSX elements)
 */
export function createAssets(relativeBase: string, payload?: string) {
	return (
		<>
			{import.meta.env?.DEV && (
				<>
					<script
						type="module"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: //
						dangerouslySetInnerHTML={{
							__html: `
                import RefreshRuntime from '${relativeBase}@react-refresh'
                
                RefreshRuntime.injectIntoGlobalHook(window)
                window.$RefreshReg$ = () => {}
                window.$RefreshSig$ = () => type => type
                window.__vite_plugin_react_preamble_installed__ = true
              `,
						}}
					/>

					<script type="module" src={`${relativeBase}@vite/client`} />
				</>
			)}

			{payload && (
				<script
					id={DRIFT_PAYLOAD_ID}
					type="application/json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: //
					dangerouslySetInnerHTML={{
						__html: payload,
					}}
				/>
			)}
		</>
	)
}
