import { Keyboard, Plus, Sparkles } from 'lucide-react'
import { type FC, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  COACH_MODE_TOGGLED_EVENT,
  COACH_RESET_EVENT,
} from '@/lib/constants/analyticsEvents'
import { track } from '@/lib/metrics/track'
import { cn } from '@/lib/utils'
import { CoachKeyboardMode } from './CoachKeyboardMode'
import { CoachOrbMode } from './CoachOrbMode'
import { useCoachSession } from './useCoachSession'

type CoachMode = 'keyboard' | 'orb'

const ModeButton: FC<{
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}> = ({ active, onClick, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
    className={cn(
      'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors',
      active
        ? 'bg-foreground text-background'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
    )}
  >
    {children}
  </button>
)

export const CoachPage: FC = () => {
  const [mode, setMode] = useState<CoachMode>('keyboard')
  const session = useCoachSession()

  const handleModeChange = (next: CoachMode) => {
    if (next === mode) return
    track(COACH_MODE_TOGGLED_EVENT, { from: mode, to: next })
    setMode(next)
  }

  const handleReset = () => {
    track(COACH_RESET_EVENT)
    session.resetConversation()
  }

  if (session.isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-border/40 border-b bg-background/80 px-3 py-2.5 backdrop-blur-md">
        <Link
          to="/"
          className="font-semibold text-base text-foreground/90 hover:text-foreground"
        >
          Coach
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="mr-1 flex items-center gap-1 rounded-full border border-border/60 bg-background p-0.5">
            <ModeButton
              active={mode === 'keyboard'}
              onClick={() => handleModeChange('keyboard')}
              label="Keyboard mode"
            >
              <Keyboard className="h-4 w-4" />
            </ModeButton>
            <ModeButton
              active={mode === 'orb'}
              onClick={() => handleModeChange('orb')}
              label="Voice mode"
            >
              <Sparkles className="h-4 w-4" />
            </ModeButton>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            aria-label="New conversation"
            disabled={session.messages.length === 0}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        {mode === 'keyboard' ? (
          <CoachKeyboardMode session={session} />
        ) : (
          <CoachOrbMode session={session} />
        )}
      </main>
    </div>
  )
}
