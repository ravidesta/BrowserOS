import { type FC, useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { HUSHED_CUSTOMIZATION, getDocServerUrl } from './onlyoffice-config'
import type { OnlyOfficeEditorInstance } from './types'

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

export const OfficeSuiteEditor: FC = () => {
  const rawId = useId()
  const placeholderId = `onlyoffice_${rawId.replace(/:/g, '_')}`
  const editorRef = useRef<OnlyOfficeEditorInstance | null>(null)
  const docServerUrl = getDocServerUrl()
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!docServerUrl || !mounted) return
    let cancelled = false

    loadOnlyOfficeScript(docServerUrl)
      .then(() => {
        if (cancelled || !window.DocsAPI) return
        editorRef.current = new window.DocsAPI.DocEditor(placeholderId, {
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
        })
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
  }, [docServerUrl, mounted, placeholderId])

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
      {error ? (
        <div className="p-10 text-center text-destructive text-sm">{error}</div>
      ) : (
        <div id={placeholderId} className="h-[80vh] w-full" />
      )}
    </div>
  )
}
