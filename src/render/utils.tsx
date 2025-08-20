import type { Metadata, PluginConfig } from '../types'

import { ASSETS_DIR, DRIFT_PAYLOAD_ID, GENERATED_DIR, INJECT_RUNTIME } from '../config'

import { mergeMetadata } from '../shared/metadata'
import type { Match } from '../shared/router'

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

			<script
				type="module"
				src={
					import.meta.env.PROD
						? `${relativeBase}${ASSETS_DIR}/${INJECT_RUNTIME}`
						: `${relativeBase}${GENERATED_DIR}/entry.client.tsx`
				}
			/>

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

/**
 * Create the metadata for the given route
 * @param match - the route match object
 * @param config - the plugin configuration
 * @param fallback - a promise that resolves to the fallback metadata
 * @returns a promise resolving to the merged metadata
 */
export async function createMetadata(
	match: Match,
	config: PluginConfig,
	fallback: Promise<Metadata>,
) {
	const routeMetadata = match
		? await match.metadata?.({ params: match.params, error: match.error })
		: [await fallback]

	return mergeMetadata(config.metadata ?? {}, ...(routeMetadata ?? []))
}
