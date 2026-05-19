import { afterEach, beforeEach, describe, it } from 'bun:test'
import assert from 'node:assert'
import { createHmac } from 'node:crypto'
import { office_prepare_document, office_status } from '../../src/tools/office'
import { ToolResponse } from '../../src/tools/response'
import type { ToolContext } from '../../src/tools/framework'

const ENV_KEYS = ['ONLYOFFICE_DOCSERVER_URL', 'ONLYOFFICE_JWT_SECRET'] as const

function captureEnv() {
  const saved = new Map<string, string | undefined>()
  for (const key of ENV_KEYS) saved.set(key, process.env[key])
  return () => {
    for (const key of ENV_KEYS) {
      const value = saved.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const fakeCtx = {} as ToolContext

interface StatusOutput {
  configured: boolean
  docServerUrl: string | null
  jwtConfigured: boolean
  capabilities: string[]
}

interface PrepareConfig {
  document: { fileType: string; title: string; url: string; key: string }
  documentType: string
  editorConfig?: {
    mode?: string
    customization?: Record<string, unknown>
    user?: { id: string; name: string }
  }
  token?: string
}

interface PrepareOutput {
  config: PrepareConfig
  jwtSigned: boolean
  deepLink: string
}

describe('office_status', () => {
  let restoreEnv: () => void
  beforeEach(() => {
    restoreEnv = captureEnv()
    delete process.env.ONLYOFFICE_DOCSERVER_URL
    delete process.env.ONLYOFFICE_JWT_SECRET
  })
  afterEach(() => restoreEnv())

  it('reports unconfigured when env vars are missing', async () => {
    const response = new ToolResponse()
    await office_status.handler({}, fakeCtx, response)
    const result = response.toResult()
    assert.deepStrictEqual(result.structuredContent, {
      configured: false,
      docServerUrl: null,
      jwtConfigured: false,
      capabilities: [],
    })
  })

  it('reports configured + jwt when env vars are set', async () => {
    process.env.ONLYOFFICE_DOCSERVER_URL = 'https://docs.example.com'
    process.env.ONLYOFFICE_JWT_SECRET = 'top-secret'
    const response = new ToolResponse()
    await office_status.handler({}, fakeCtx, response)
    const data = response.toResult().structuredContent as StatusOutput
    assert.strictEqual(data.configured, true)
    assert.strictEqual(data.docServerUrl, 'https://docs.example.com')
    assert.strictEqual(data.jwtConfigured, true)
    assert.ok(data.capabilities.includes('prepare-document'))
    assert.ok(data.capabilities.includes('open-document'))
  })

  it('reports docserver but no jwt when only docserver is set', async () => {
    process.env.ONLYOFFICE_DOCSERVER_URL = 'https://docs.example.com'
    delete process.env.ONLYOFFICE_JWT_SECRET
    const response = new ToolResponse()
    await office_status.handler({}, fakeCtx, response)
    const data = response.toResult().structuredContent as StatusOutput
    assert.strictEqual(data.configured, true)
    assert.strictEqual(data.jwtConfigured, false)
  })
})

describe('office_prepare_document', () => {
  let restoreEnv: () => void
  beforeEach(() => {
    restoreEnv = captureEnv()
    process.env.ONLYOFFICE_DOCSERVER_URL = 'https://docs.example.com'
  })
  afterEach(() => restoreEnv())

  it('errors when docserver is not configured', async () => {
    delete process.env.ONLYOFFICE_DOCSERVER_URL
    const response = new ToolResponse()
    await office_prepare_document.handler(
      {
        documentUrl: 'https://files.example.com/doc.docx',
        fileType: 'docx',
        title: 'Test.docx',
        mode: 'edit',
      },
      fakeCtx,
      response,
    )
    const result = response.toResult()
    assert.ok(result.isError, 'expected error result when docserver missing')
  })

  it('builds config without JWT when secret missing', async () => {
    delete process.env.ONLYOFFICE_JWT_SECRET
    const response = new ToolResponse()
    await office_prepare_document.handler(
      {
        documentUrl: 'https://files.example.com/doc.docx',
        fileType: 'docx',
        title: 'Test.docx',
        mode: 'edit',
      },
      fakeCtx,
      response,
    )
    const result = response.toResult()
    assert.ok(!result.isError)
    const data = result.structuredContent as PrepareOutput
    assert.strictEqual(data.jwtSigned, false)
    assert.strictEqual(data.config.documentType, 'word')
    assert.strictEqual(data.config.document.fileType, 'docx')
    assert.strictEqual(data.config.document.title, 'Test.docx')
    assert.strictEqual(data.config.token, undefined)
    assert.ok(data.deepLink.startsWith('/office?config='))
  })

  it('signs JWT (HS256) when secret is configured', async () => {
    process.env.ONLYOFFICE_JWT_SECRET = 'super-secret-key-for-testing'
    const response = new ToolResponse()
    await office_prepare_document.handler(
      {
        documentUrl: 'https://files.example.com/doc.xlsx',
        fileType: 'xlsx',
        title: 'Sheet.xlsx',
        mode: 'view',
      },
      fakeCtx,
      response,
    )
    const data = response.toResult().structuredContent as PrepareOutput
    assert.strictEqual(data.jwtSigned, true)
    assert.strictEqual(data.config.documentType, 'cell')
    assert.ok(typeof data.config.token === 'string', 'token should be set')

    const parts = (data.config.token as string).split('.')
    assert.strictEqual(parts.length, 3, 'JWT should have 3 parts')
    const [header, body, signature] = parts

    const decodedHeader = JSON.parse(
      Buffer.from(header as string, 'base64url').toString(),
    )
    assert.deepStrictEqual(decodedHeader, { alg: 'HS256', typ: 'JWT' })

    const expectedSig = Buffer.from(
      createHmac('sha256', 'super-secret-key-for-testing')
        .update(`${header}.${body}`)
        .digest(),
    ).toString('base64url')
    assert.strictEqual(signature, expectedSig, 'signature must verify')
  })

  it('maps file types to OnlyOffice document types', async () => {
    delete process.env.ONLYOFFICE_JWT_SECRET
    const cases: Array<['docx' | 'xlsx' | 'pptx' | 'pdf', string]> = [
      ['docx', 'word'],
      ['xlsx', 'cell'],
      ['pptx', 'slide'],
      ['pdf', 'pdf'],
    ]
    for (const [fileType, expected] of cases) {
      const response = new ToolResponse()
      await office_prepare_document.handler(
        {
          documentUrl: `https://x.example.com/file.${fileType}`,
          fileType,
          title: `t.${fileType}`,
          mode: 'edit',
        },
        fakeCtx,
        response,
      )
      const data = response.toResult().structuredContent as PrepareOutput
      assert.strictEqual(
        data.config.documentType,
        expected,
        `${fileType} should map to ${expected}`,
      )
    }
  })

  it('deepLink round-trips back to the config object', async () => {
    process.env.ONLYOFFICE_JWT_SECRET = 'secret'
    const response = new ToolResponse()
    await office_prepare_document.handler(
      {
        documentUrl: 'https://files.example.com/doc.docx',
        fileType: 'docx',
        title: 'Round-Trip Doc',
        mode: 'edit',
      },
      fakeCtx,
      response,
    )
    const data = response.toResult().structuredContent as PrepareOutput
    const encoded = data.deepLink.replace('/office?config=', '')
    const json = Buffer.from(encoded, 'base64url').toString('utf8')
    const decoded = JSON.parse(json)
    assert.deepStrictEqual(decoded, data.config)
  })

  it('includes user identity when both userId and userName are provided', async () => {
    delete process.env.ONLYOFFICE_JWT_SECRET
    const response = new ToolResponse()
    await office_prepare_document.handler(
      {
        documentUrl: 'https://files.example.com/doc.docx',
        fileType: 'docx',
        title: 'Doc',
        mode: 'edit',
        userId: 'user-123',
        userName: 'Test User',
      },
      fakeCtx,
      response,
    )
    const data = response.toResult().structuredContent as PrepareOutput
    assert.deepStrictEqual(data.config.editorConfig?.user, {
      id: 'user-123',
      name: 'Test User',
    })
  })

  it('derives a stable documentKey from url + title when not provided', async () => {
    delete process.env.ONLYOFFICE_JWT_SECRET
    async function run() {
      const response = new ToolResponse()
      await office_prepare_document.handler(
        {
          documentUrl: 'https://files.example.com/doc.docx',
          fileType: 'docx',
          title: 'Stable.docx',
          mode: 'edit',
        },
        fakeCtx,
        response,
      )
      return (response.toResult().structuredContent as PrepareOutput).config
        .document.key
    }
    const a = await run()
    const b = await run()
    assert.strictEqual(a, b, 'documentKey must be deterministic')
  })
})
