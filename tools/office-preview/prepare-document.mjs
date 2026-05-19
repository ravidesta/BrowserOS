#!/usr/bin/env node
// Standalone demo of what the `office_prepare_document` MCP tool does on the
// server: builds an OnlyOffice editor config, optionally signs it with HS256
// JWT, and prints the deep link the LLM would surface to the user.
//
// Usage:
//   node prepare-document.mjs --url=http://localhost:8080/example/sample.docx --title="My Doc"
//   ONLYOFFICE_JWT_SECRET=secret node prepare-document.mjs --url=... --title="..."
//
// No dependencies. Uses node:crypto.

import { createHmac } from 'node:crypto'
import process from 'node:process'

const FILE_TYPE_TO_DOCUMENT_TYPE = {
  docx: 'word',
  xlsx: 'cell',
  pptx: 'slide',
  pdf: 'pdf',
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
}

function parseArgs(argv) {
  const args = {}
  for (const part of argv.slice(2)) {
    const match = part.match(/^--([^=]+)=(.*)$/)
    if (match) args[match[1]] = match[2]
  }
  return args
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url')
}

function signJwtHS256(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signing = `${header}.${body}`
  const signature = base64UrlEncode(
    createHmac('sha256', secret).update(signing).digest(),
  )
  return `${signing}.${signature}`
}

function prepareDocument({
  documentUrl,
  fileType,
  title,
  mode = 'edit',
  userId,
  userName,
  jwtSecret,
}) {
  const documentType = FILE_TYPE_TO_DOCUMENT_TYPE[fileType]
  if (!documentType) {
    throw new Error(`Unknown fileType: ${fileType}. Expected docx, xlsx, pptx, or pdf.`)
  }
  const documentKey = createHmac('sha256', 'browseros-doc-key')
    .update(`${documentUrl}:${title}`)
    .digest('hex')
    .slice(0, 20)

  const config = {
    document: {
      fileType,
      key: documentKey,
      title,
      url: documentUrl,
    },
    documentType,
    editorConfig: {
      mode,
      customization: HUSHED_CUSTOMIZATION,
      ...(userId && userName ? { user: { id: userId, name: userName } } : {}),
    },
  }

  let jwtSigned = false
  if (jwtSecret) {
    config.token = signJwtHS256(
      { ...config, iat: Math.floor(Date.now() / 1000) },
      jwtSecret,
    )
    jwtSigned = true
  }

  const deepLink = `/office?config=${base64UrlEncode(JSON.stringify(config))}`
  return { config, jwtSigned, deepLink }
}

const args = parseArgs(process.argv)
if (!args.url) {
  console.error('Missing --url')
  console.error('')
  console.error('Usage: node prepare-document.mjs --url=<doc-url> [--title=<title>] [--type=docx|xlsx|pptx|pdf] [--mode=edit|view]')
  console.error('Set ONLYOFFICE_JWT_SECRET to sign the config.')
  process.exit(1)
}

const fileType = args.type ?? args.url.split('.').pop() ?? 'docx'
const title = args.title ?? args.url.split('/').pop() ?? `document.${fileType}`

const result = prepareDocument({
  documentUrl: args.url,
  fileType,
  title,
  mode: args.mode ?? 'edit',
  userId: args.userId,
  userName: args.userName,
  jwtSecret: process.env.ONLYOFFICE_JWT_SECRET,
})

console.log('--- config ---')
console.log(JSON.stringify(result.config, null, 2))
console.log('')
console.log('--- deepLink ---')
console.log(result.deepLink)
console.log('')
console.log(`JWT signed: ${result.jwtSigned}`)
if (!result.jwtSigned) {
  console.log('(Set ONLYOFFICE_JWT_SECRET to sign the config.)')
}
