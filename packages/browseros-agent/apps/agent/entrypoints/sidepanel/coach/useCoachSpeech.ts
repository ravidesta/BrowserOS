import { useEffect, useRef, useState } from 'react'
import { sentry } from '@/lib/sentry/sentry'
import { synthesizeAzureSpeech } from '@/lib/voice/azure-speech-client'
import {
  type AzureSpeechConfig,
  isAzureSpeechConfigured,
  useAzureSpeechConfig,
} from '@/lib/voice/azure-speech-storage'

export type CoachSpeechBackend = 'azure' | 'browser' | 'none'

export interface UseCoachSpeechReturn {
  isSpeaking: boolean
  isSupported: boolean
  backend: CoachSpeechBackend
  speak: (text: string) => Promise<void>
  cancel: () => void
}

const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

const pickBrowserVoice = (): SpeechSynthesisVoice | undefined => {
  if (!isSpeechSynthesisSupported()) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return undefined
  const preferredNames = [
    'Samantha',
    'Karen',
    'Serena',
    'Google US English',
    'Microsoft Aria Online (Natural)',
  ]
  for (const name of preferredNames) {
    const match = voices.find((v) => v.name === name)
    if (match) return match
  }
  return voices.find((v) => v.lang?.startsWith('en')) ?? voices[0]
}

export const useCoachSpeech = (): UseCoachSpeechReturn => {
  const { config: azureConfig } = useAzureSpeechConfig()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const browserVoiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const azureConfigRef = useRef<AzureSpeechConfig>(azureConfig)
  azureConfigRef.current = azureConfig

  const browserSupported = isSpeechSynthesisSupported()
  const azureReady = isAzureSpeechConfigured(azureConfig)
  const backend: CoachSpeechBackend = azureReady
    ? 'azure'
    : browserSupported
      ? 'browser'
      : 'none'
  const isSupported = backend !== 'none'

  useEffect(() => {
    if (!browserSupported) return
    const refresh = () => {
      browserVoiceRef.current = pickBrowserVoice()
    }
    refresh()
    window.speechSynthesis.onvoiceschanged = refresh
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [browserSupported])

  const releaseAudio = () => {
    if (audioRef.current) {
      audioRef.current.onplay = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    abortRef.current = null
    if (browserSupported) window.speechSynthesis.cancel()
    releaseAudio()
    setIsSpeaking(false)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: unmount-only cleanup; cancel reads refs
  useEffect(() => {
    return () => {
      cancel()
    }
  }, [])

  const speakBrowser = (text: string) => {
    if (!browserSupported) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = browserVoiceRef.current ?? pickBrowserVoice()
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      }
      utterance.rate = 0.98
      utterance.pitch = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      sentry.captureException(error, {
        extra: { message: 'Coach browser TTS failed' },
      })
      setIsSpeaking(false)
    }
  }

  const speakAzure = async (text: string) => {
    const config = azureConfigRef.current
    if (!isAzureSpeechConfigured(config)) {
      speakBrowser(text)
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const blob = await synthesizeAzureSpeech(text, config, controller.signal)
      if (controller.signal.aborted) return
      releaseAudio()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onplay = () => setIsSpeaking(true)
      audio.onended = () => {
        setIsSpeaking(false)
        releaseAudio()
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        releaseAudio()
      }
      audioRef.current = audio
      audioUrlRef.current = url
      await audio.play()
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return
      sentry.captureException(error, {
        extra: {
          message: 'Coach Azure TTS failed; falling back to browser speech',
          region: config.region,
          voice: config.voice,
        },
      })
      speakBrowser(text)
    }
  }

  const speak = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (azureReady) {
      await speakAzure(trimmed)
      return
    }
    speakBrowser(trimmed)
  }

  return {
    isSpeaking,
    isSupported,
    backend,
    speak,
    cancel,
  }
}
