export const HUSHED_CUSTOMIZATION = {
  compactHeader: true,
  compactToolbar: true,
  toolbarHideFileName: true,
  hideRightMenu: true,
  hideRulers: true,
  integrationMode: 'embed',
  feedback: false,
  help: false,
  plugins: false,
  chat: false,
  comments: false,
  autosave: true,
  forcesave: false,
  uiTheme: 'theme-light',
} as const

export function getDocServerUrl(): string | null {
  const env = import.meta.env as Record<string, string | undefined>
  const url = env.VITE_ONLYOFFICE_DOCSERVER_URL
  return typeof url === 'string' && url.length > 0 ? url.replace(/\/$/, '') : null
}
