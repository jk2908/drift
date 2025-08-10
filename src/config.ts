export const NAME = 'drift'
export const PKG_NAME = `@jk2908/${NAME}`
export const APP_DIR = 'app'
export const GENERATED_DIR = `.${NAME}`
export const ENTRY_SERVER = 'entry.server.tsx'
export const ENTRY_CLIENT = 'entry.client.tsx'
export const INJECT_RUNTIME = `__${NAME.toUpperCase()}_RUNTIME__`
export const ASSETS_DIR = 'assets'
export const DRIFT_PAYLOAD_ID = `__${NAME.toUpperCase()}__`

export const EntryKind = {
  SHELL: '$S',
  LAYOUT: '$L',
  PAGE: '$P',
  ERROR: '$ERR',
  API: '$A'
} as const