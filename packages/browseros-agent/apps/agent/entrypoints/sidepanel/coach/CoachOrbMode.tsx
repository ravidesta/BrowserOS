import { Mic, MicOff, Square, VolumeX } from 'lucide-react'
import { type FC, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  COACH_MESSAGE_SENT_EVENT,
  COACH_OPENED_EVENT,
  COACH_VOICE_RECORDED_EVENT,
  COACH_VOICE_SPOKEN_EVENT,
} from '@/lib/constants/analyticsEvents'
import { track } from '@/lib/metrics/track'
import { cn } from '@/lib/utils'
import { useVoiceInput } from '@/lib/voice/useVoiceInput'
import { CoachOrb, type CoachOrbState } from './CoachOrb'
import type { CoachSession } from './useCoachSession'
import { useCoachSpeech } from './useCoachSpeech'

interface CoachOrbModeProps {
  session: CoachSession
}

export const CoachOrbMode: FC<CoachOrbModeProps> = ({ session }) => {
  const { sendCoachMessage, status, lastAssistantText, selectedProvider } =
    session
  const voice = useVoiceInput()
  const speech = useCoachSpeech()
  const lastSpokenTextRef = useRef('')
  const recordingStartRef = useRef<number | null>(null)
  const speechRef = useRef(speech)
  const sessionDepsRef = useRef({ sendCoachMessage, voice, selectedProvider })

  speechRef.current = speech
  sessionDepsRef.current = { sendCoachMessage, voice, selectedProvider }

  useEffect(() => {
    track(COACH_OPENED_EVENT, { mode: 'orb' })
    return () => {
      speechRef.current.cancel()
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to transcript/status; other refs are stable
  useEffect(() => {
    if (
      voice.transcript &&
      !voice.isTranscribing &&
      status !== 'submitted' &&
      status !== 'streaming'
    ) {
      const text = voice.transcript.trim()
      if (text) {
        const duration = recordingStartRef.current
          ? Date.now() - recordingStartRef.current
          : 0
        const deps = sessionDepsRef.current
        track(COACH_VOICE_RECORDED_EVENT, {
          duration_ms: duration,
          chars: text.length,
        })
        track(COACH_MESSAGE_SENT_EVENT, {
          mode: 'orb',
          provider_type: deps.selectedProvider?.type,
          chars: text.length,
        })
        deps.sendCoachMessage(text)
      }
      voice.clearTranscript()
      recordingStartRef.current = null
    }
  }, [voice.transcript, voice.isTranscribing, status])

  useEffect(() => {
    if (!speech.isSupported || !lastAssistantText) return
    if (status === 'streaming' || status === 'submitted') return
    if (lastAssistantText === lastSpokenTextRef.current) return
    speech.speak(lastAssistantText)
    lastSpokenTextRef.current = lastAssistantText
    track(COACH_VOICE_SPOKEN_EVENT, { chars: lastAssistantText.length })
  }, [lastAssistantText, status, speech])

  const handleStartRecording = async () => {
    speech.cancel()
    recordingStartRef.current = Date.now()
    await voice.startRecording()
  }

  const handleStopRecording = async () => {
    await voice.stopRecording()
  }

  const isAssistantBusy = status === 'submitted' || status === 'streaming'
  const orbState: CoachOrbState = voice.isRecording
    ? 'listening'
    : speech.isSpeaking || isAssistantBusy
      ? 'speaking'
      : 'idle'

  const statusLabel = voice.isRecording
    ? 'Listening...'
    : voice.isTranscribing
      ? 'Transcribing...'
      : isAssistantBusy
        ? 'Coach is thinking...'
        : speech.isSpeaking
          ? 'Coach is speaking...'
          : 'Tap the mic to talk'

  return (
    <div className="flex h-full flex-col items-center justify-between gap-6 px-6 py-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <CoachOrb state={orbState} audioLevel={voice.audioLevel} size={188} />
        <div className="text-center">
          <p
            className={cn(
              'font-medium text-foreground/80 text-sm transition-opacity',
              voice.isRecording && 'text-foreground',
            )}
          >
            {statusLabel}
          </p>
          {voice.error && (
            <p className="mt-2 text-destructive text-xs">{voice.error}</p>
          )}
        </div>
        {(voice.transcript || lastAssistantText) && (
          <div className="w-full max-w-xs space-y-3 text-center">
            {voice.transcript && (
              <p className="text-muted-foreground text-sm italic">
                "{voice.transcript}"
              </p>
            )}
            {lastAssistantText && !voice.transcript && (
              <p className="whitespace-pre-wrap text-foreground/90 text-sm leading-relaxed">
                {lastAssistantText}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {speech.isSpeaking && (
          <Button
            variant="ghost"
            size="icon"
            onClick={speech.cancel}
            aria-label="Stop speaking"
          >
            <VolumeX className="h-5 w-5" />
          </Button>
        )}
        {voice.isRecording ? (
          <Button
            size="lg"
            variant="destructive"
            onClick={handleStopRecording}
            aria-label="Stop recording"
            className="h-16 w-16 rounded-full"
          >
            <Square className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleStartRecording}
            disabled={voice.isTranscribing || isAssistantBusy}
            aria-label="Start recording"
            className="h-16 w-16 rounded-full"
          >
            {voice.isTranscribing || isAssistantBusy ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
