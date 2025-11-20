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
