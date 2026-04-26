export interface OnlyOfficeEditorInstance {
  destroyEditor: () => void
}

export interface OnlyOfficeEditorConfig {
  document: {
    fileType: string
    key: string
    title: string
    url: string
    permissions?: Record<string, boolean>
  }
  documentType: 'word' | 'cell' | 'slide' | 'pdf'
  editorConfig?: {
    mode?: 'view' | 'edit'
    lang?: string
    callbackUrl?: string
    user?: { id: string; name: string }
    customization?: Record<string, unknown>
  }
  token?: string
  width?: string
  height?: string
}

export interface OnlyOfficeDocsAPI {
  DocEditor: new (
    placeholderId: string,
    config: OnlyOfficeEditorConfig,
  ) => OnlyOfficeEditorInstance
}

declare global {
  interface Window {
    DocsAPI?: OnlyOfficeDocsAPI
  }
}
