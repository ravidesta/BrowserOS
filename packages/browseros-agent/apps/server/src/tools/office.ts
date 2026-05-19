import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { defineToolWithCategory } from './framework'

const defineOfficeTool = defineToolWithCategory('assistant')

function getDocServerUrl(): string | null {
  const url = process.env.ONLYOFFICE_DOCSERVER_URL
  return typeof url === 'string' && url.length > 0 ? url : null
}

function getJwtSecret(): string | null {
  const secret = process.env.ONLYOFFICE_JWT_SECRET
  return typeof secret === 'string' && secret.length > 0 ? secret : null
}

function isJwtConfigured(): boolean {
  return getJwtSecret() !== null
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function signJwtHS256(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signing = `${header}.${body}`
  const signature = base64UrlEncode(
    createHmac('sha256', secret).update(signing).digest(),
  )
  return `${signing}.${signature}`
}

const HUSHED_CUSTOMIZATION = {
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

const FILE_TYPE_TO_DOCUMENT_TYPE = {
  docx: 'word',
  xlsx: 'cell',
  pptx: 'slide',
  pdf: 'pdf',
} as const

export const office_status = defineOfficeTool({
  name: 'office_status',
  description:
    'Check whether the BrowserOS Office Suite (OnlyOffice-backed) is configured. Returns the Document Server URL, JWT status, and the document operations the suite currently supports. Call this before attempting any other office operation.',
  input: z.object({}),
  output: z.object({
    configured: z.boolean(),
    docServerUrl: z.string().nullable(),
    jwtConfigured: z.boolean(),
    capabilities: z.array(z.string()),
  }),
  handler: async (_args, _ctx, response) => {
    const docServerUrl = getDocServerUrl()
    const jwtConfigured = isJwtConfigured()
    const configured = docServerUrl !== null
    const capabilities = configured
      ? [
          'open-document',
          'edit-document',
          'prepare-document',
          'export-pdf',
          'export-docx',
        ]
      : []

    response.text(
      configured
        ? `Office Suite is configured.\nDocument Server: ${docServerUrl}\nJWT: ${jwtConfigured ? 'enabled' : 'disabled'}\nCapabilities: ${capabilities.join(', ')}`
        : 'Office Suite is not configured. Set ONLYOFFICE_DOCSERVER_URL on the server and VITE_ONLYOFFICE_DOCSERVER_URL on the extension to enable.',
    )
    response.data({
      configured,
      docServerUrl,
      jwtConfigured,
      capabilities,
    })
  },
})

export const office_prepare_document = defineOfficeTool({
  name: 'office_prepare_document',
  description:
    'Build an OnlyOffice editor config for a document so the BrowserOS Office Suite can open it. Returns a config object the extension passes directly to DocsAPI.DocEditor, signed with JWT when ONLYOFFICE_JWT_SECRET is configured. Call office_status first to confirm the suite is configured.',
  input: z.object({
    documentUrl: z
      .string()
      .url()
      .describe(
        'Public URL of the document file. Must be reachable from the OnlyOffice Document Server.',
      ),
    fileType: z
      .enum(['docx', 'xlsx', 'pptx', 'pdf'])
      .describe('Document file extension.'),
    title: z.string().min(1).describe('Display name shown in the editor.'),
    mode: z
      .enum(['view', 'edit'])
      .default('edit')
      .describe('Whether the user can edit the document or only view it.'),
    userId: z
      .string()
      .optional()
      .describe('Stable user identifier for collaboration tracking.'),
    userName: z
      .string()
      .optional()
      .describe('Display name of the current user.'),
    documentKey: z
      .string()
      .optional()
      .describe(
        'Unique document version key. When omitted, derived from documentUrl + title.',
      ),
  }),
  output: z.object({
    config: z.unknown(),
    jwtSigned: z.boolean(),
  }),
  handler: async (args, _ctx, response) => {
    const docServerUrl = getDocServerUrl()
    if (!docServerUrl) {
      response.error(
        'Office Suite is not configured. Set ONLYOFFICE_DOCSERVER_URL.',
      )
      return
    }

    const documentType = FILE_TYPE_TO_DOCUMENT_TYPE[args.fileType]
    const documentKey =
      args.documentKey ??
      createHmac('sha256', 'browseros-doc-key')
        .update(`${args.documentUrl}:${args.title}`)
        .digest('hex')
        .slice(0, 20)

    const config: Record<string, unknown> = {
      document: {
        fileType: args.fileType,
        key: documentKey,
        title: args.title,
        url: args.documentUrl,
      },
      documentType,
      editorConfig: {
        mode: args.mode,
        customization: HUSHED_CUSTOMIZATION,
        ...(args.userId && args.userName
          ? { user: { id: args.userId, name: args.userName } }
          : {}),
      },
    }

    const secret = getJwtSecret()
    let jwtSigned = false
    if (secret) {
      const token = signJwtHS256(
        { ...config, iat: Math.floor(Date.now() / 1000) },
        secret,
      )
      config.token = token
      jwtSigned = true
    }

    response.text(
      jwtSigned
        ? `Prepared editor config for "${args.title}" (${args.fileType}). Signed with JWT.`
        : `Prepared editor config for "${args.title}" (${args.fileType}). WARNING: ONLYOFFICE_JWT_SECRET is not set, so the Document Server will receive unauthenticated requests.`,
    )
    response.data({ config, jwtSigned })
  },
})
