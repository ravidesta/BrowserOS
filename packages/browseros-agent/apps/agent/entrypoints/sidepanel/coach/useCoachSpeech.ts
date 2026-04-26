import { useEffect, useRef, useState } from 'react'
import { sentry } from '@/lib/sentry/sentry'

export interface UseCoachSpeechReturn {
  isSpeaking: boolean
  isSupported: boolean
  speak: (text: string) => void
  cancel: () => void
}

const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

const pickVoice = (): SpeechSynthesisVoice | undefined => {
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
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSupported = isSpeechSynthesisSupported()
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!isSupported) return
    const refreshVoice = () => {
      voiceRef.current = pickVoice()
    }
    refreshVoice()
    window.speechSynthesis.onvoiceschanged = refreshVoice
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  const speak = (text: string) => {
    if (!isSupported || !text.trim()) return
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = voiceRef.current ?? pickVoice()
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      }
      utterance.rate = 0.98
      utterance.pitch = 1
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    } catch (error) {
      sentry.captureException(error, {
        extra: { message: 'Coach TTS failed to speak utterance' },
      })
      setIsSpeaking(false)
    }
  }

  const cancel = () => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  return {
    isSpeaking,
    isSupported,
    speak,
    cancel,
  }
}
