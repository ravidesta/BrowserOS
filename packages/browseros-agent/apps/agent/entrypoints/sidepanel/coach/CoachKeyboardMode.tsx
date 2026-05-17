import { Loader2, SendHorizonal, Square } from 'lucide-react'
import { type FC, type FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  COACH_MESSAGE_SENT_EVENT,
  COACH_OPENED_EVENT,
} from '@/lib/constants/analyticsEvents'
import { track } from '@/lib/metrics/track'
import { cn } from '@/lib/utils'
import type { CoachSession } from './useCoachSession'

interface CoachKeyboardModeProps {
  session: CoachSession
}

const formatMessageText = (parts: { type: string; text?: string }[]) =>
  parts
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('')

export const CoachKeyboardMode: FC<CoachKeyboardModeProps> = ({ session }) => {
  const {
    messages,
    sendCoachMessage,
    status,
    stop,
    chatError,
    selectedProvider,
  } = session
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    track(COACH_OPENED_EVENT, { mode: 'keyboard' })
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scroll on each new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const isBusy = status === 'submitted' || status === 'streaming'

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (isBusy || !input.trim()) return
    track(COACH_MESSAGE_SENT_EVENT, {
      mode: 'keyboard',
      provider_type: selectedProvider?.type,
      chars: input.trim().length,
    })
    sendCoachMessage(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <p
              className="text-2xl text-foreground/90"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Tell me.
            </p>
            <p
              className="mt-1 text-foreground/70 text-xl italic"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              I'll listen first.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => {
              const text = formatMessageText(
                message.parts as { type: string; text?: string }[],
              )
              if (!text) return null
              const isUser = message.role === 'user'
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex w-full',
                    isUser ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {text}
                  </div>
                </div>
              )
            })}
            {isBusy && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2.5 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {chatError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                {chatError.message ?? 'Something went wrong.'}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-border/40 border-t bg-background/80 px-3 py-2.5 backdrop-blur-md"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to your Coach..."
            rows={1}
            className="max-h-32 min-h-[44px] resize-none"
          />
          {isBusy ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={stop}
              aria-label="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              aria-label="Send"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
