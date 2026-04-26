import { z } from 'zod'
import { defineToolWithCategory } from './framework'

const defineOfficeTool = defineToolWithCategory('assistant')

function getDocServerUrl(): string | null {
  const url = process.env.ONLYOFFICE_DOCSERVER_URL
  return typeof url === 'string' && url.length > 0 ? url : null
}

function isJwtConfigured(): boolean {
  return Boolean(process.env.ONLYOFFICE_JWT_SECRET)
}

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
      ? ['open-document', 'edit-document', 'export-pdf', 'export-docx']
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
