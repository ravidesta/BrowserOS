import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HUSHED_CUSTOMIZATION, getDocServerUrl } from './onlyoffice-config'
import type { OnlyOfficeEditorConfig } from './types'

const HOST_PAGE = '/onlyoffice-host.html'
const SAMPLE_DOC_PATH = '/example/sample.docx'

interface HostMessage {
  source: 'browseros-office'
  type: 'ready' | 'mounted' | 'error'
  message?: string
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
    const parsed = JSON.parse(json) as Partial<OnlyOfficeEditorConfig>
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.document ||
      typeof parsed.document.url !== 'string' ||
      typeof parsed.documentType !== 'string'
    ) {
      return null
    }
    return parsed as OnlyOfficeEditorConfig
  } catch {
    return null
  }
}

export const OfficeSuiteEditor: FC = () => {
  const [searchParams] = useSearchParams()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const docServerUrl = getDocServerUrl()

  const incomingConfig = useMemo(
    () => decodeConfigParam(searchParams.get('config')),
    [searchParams],
  )
  const autoMount = incomingConfig !== null
  const incomingTitle = incomingConfig?.document.title ?? null

  const [mounted, setMounted] = useState(autoMount)
  const [hostReady, setHostReady] = useState(false)
  const [hostError, setHostError] = useState<string | null>(null)

  useEffect(() => {
    if (!mounted) return
    function onMessage(event: MessageEvent) {
      const data = event.data as HostMessage | undefined
      if (!data || data.source !== 'browseros-office') return
      if (data.type === 'ready') {
        setHostReady(true)
        setHostError(null)
      } else if (data.type === 'error') {
        setHostError(data.message ?? 'Failed to mount editor')
      } else if (data.type === 'mounted') {
        setHostError(null)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [mounted])

  useEffect(() => {
    if (!hostReady || !docServerUrl) return
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    const config: OnlyOfficeEditorConfig =
      incomingConfig ?? buildDefaultConfig(docServerUrl)
    iframe.contentWindow.postMessage(
      {
        source: 'browseros-office',
        type: 'init',
        config,
        docServerUrl,
      },
      '*',
    )
  }, [hostReady, docServerUrl, incomingConfig])

  if (!docServerUrl) {
    return (
      <div className="rounded-xl border border-border border-dashed bg-card p-10 text-center">
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
          Loads OnlyOffice from your self-hosted Document Server in a sandboxed
          frame. Connect an LLM to edit and compose documents by voice or
          prompt.
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
      {hostError ? (
        <div className="border-border border-b bg-destructive/10 px-4 py-2 text-destructive text-sm">
          {hostError}
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        src={HOST_PAGE}
        title="OnlyOffice Editor"
        className="block h-[80vh] w-full border-0"
      />
    </div>
  )
}
