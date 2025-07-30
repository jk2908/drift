import { ASSETS_DIR, GENERATED_DIR, INJECT_RUNTIME } from '../config'

export function Runtime({ relativeBase }: { relativeBase: string }) {
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

			<script
				type="module"
				src={
					import.meta.env.PROD
						? `${relativeBase}${ASSETS_DIR}/${INJECT_RUNTIME}`
						: `${relativeBase}${GENERATED_DIR}/entry.client.tsx`
				}
			/>
		</>
	)
}
