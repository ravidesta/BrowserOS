import { type FC, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HUSHED_CUSTOMIZATION, getDocServerUrl } from './onlyoffice-config'
import type { OnlyOfficeEditorConfig, OnlyOfficeEditorInstance } from './types'

const SCRIPT_PATH = '/web-apps/apps/api/documents/api.js'
const SAMPLE_DOC_PATH = '/example/sample.docx'

function loadOnlyOfficeScript(docServerUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DocsAPI) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `${docServerUrl}${SCRIPT_PATH}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Failed to load OnlyOffice editor script'))
    document.head.appendChild(script)
  })
}

function buildDefaultConfig(docServerUrl: string): OnlyOfficeEditorConfig {
  return {
    documentType: 'word',
    document: {
      fileType: 'docx',
      key: `browseros-${Date.now()}`,
      title: 'Untitled.docx',
      url: `${docServerUrl}${SAMPLE_DOC_PATH}`,
      permissions: { edit: true, download: true },
    },
    editorConfig: {
      mode: 'edit',
      lang: 'en',
      customization: HUSHED_CUSTOMIZATION,
    },
    width: '100%',
    height: '100%',
  }
}

function decodeConfigParam(
  encoded: string | null,
): OnlyOfficeEditorConfig | null {
  if (!encoded) return null
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) base64 += '='
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as OnlyOfficeEditorConfig
    if (!parsed || typeof parsed !== 'object' || !parsed.document) return null
    return parsed
  } catch {
    return null
  }
}

export const OfficeSuiteEditor: FC = () => {
  const [searchParams] = useSearchParams()
  const rawId = useId()
  const placeholderId = `onlyoffice_${rawId.replace(/:/g, '_')}`
  const editorRef = useRef<OnlyOfficeEditorInstance | null>(null)
  const docServerUrl = getDocServerUrl()

  const incomingConfig = useMemo(
    () => decodeConfigParam(searchParams.get('config')),
    [searchParams],
  )
  const autoMount = incomingConfig !== null
  const incomingTitle = incomingConfig?.document.title ?? null

  const [mounted, setMounted] = useState(autoMount)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!docServerUrl || !mounted) return
    let cancelled = false

    loadOnlyOfficeScript(docServerUrl)
      .then(() => {
        if (cancelled || !window.DocsAPI) return
        const config: OnlyOfficeEditorConfig =
          incomingConfig ?? buildDefaultConfig(docServerUrl)
        if (!config.width) config.width = '100%'
        if (!config.height) config.height = '100%'
        editorRef.current = new window.DocsAPI.DocEditor(placeholderId, config)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      cancelled = true
      editorRef.current?.destroyEditor()
      editorRef.current = null
    }
  }, [docServerUrl, incomingConfig, mounted, placeholderId])

  if (!docServerUrl) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-medium text-base">Document Server not configured</p>
        <p className="mt-2 text-muted-foreground text-sm">
          Set{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            VITE_ONLYOFFICE_DOCSERVER_URL
          </code>{' '}
          to your self-hosted OnlyOffice Document Server URL and rebuild the
          extension.
        </p>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="font-medium text-base">Open the editor</p>
        <p className="mt-2 mb-6 text-muted-foreground text-sm">
          Loads OnlyOffice from your self-hosted Document Server. Connect an LLM
          to edit and compose documents by voice or prompt.
        </p>
        <Button onClick={() => setMounted(true)}>Open Editor</Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {incomingTitle ? (
        <div className="border-border border-b bg-muted/40 px-4 py-2 text-muted-foreground text-xs">
          Opening:{' '}
          <span className="font-medium text-foreground">{incomingTitle}</span>
        </div>
      ) : null}
      {error ? (
        <div className="p-10 text-center text-destructive text-sm">{error}</div>
      ) : (
        <div id={placeholderId} className="h-[80vh] w-full" />
      )}
    </div>
  )
}
