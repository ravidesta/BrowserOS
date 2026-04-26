import type { AzureSpeechConfig } from './azure-speech-storage'

const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3'
const USER_AGENT = 'BrowserOS-Coach'

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const buildSsml = (text: string, voice: string) =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${escapeXml(voice)}"><prosody rate="0%">${escapeXml(text)}</prosody></voice></speak>`

export interface AzureSpeechSynthesisError extends Error {
  status?: number
}

export const synthesizeAzureSpeech = async (
  text: string,
  config: AzureSpeechConfig,
  signal?: AbortSignal,
): Promise<Blob> => {
  const endpoint = `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
      'User-Agent': USER_AGENT,
    },
    body: buildSsml(text, config.voice),
    signal,
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const error = new Error(
      `Azure Speech synthesis failed (${response.status}): ${body || response.statusText}`,
    ) as AzureSpeechSynthesisError
    error.status = response.status
    throw error
  }
  return response.blob()
}
