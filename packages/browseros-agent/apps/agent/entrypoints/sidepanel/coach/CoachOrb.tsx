import type { FC } from 'react'
import { cn } from '@/lib/utils'

export type CoachOrbState = 'idle' | 'listening' | 'speaking'

interface CoachOrbProps {
  state: CoachOrbState
  /** Audio level 0-100 — only used when state is 'listening'. */
  audioLevel?: number
  size?: number
  className?: string
}

const baseGold = 'rgb(212, 175, 55)'
const lightGold = 'rgb(248, 222, 126)'
const deepGold = 'rgb(157, 116, 18)'

export const CoachOrb: FC<CoachOrbProps> = ({
  state,
  audioLevel = 0,
  size = 168,
  className,
}) => {
  const listeningScale = 1 + Math.min(audioLevel, 100) / 350
  const orbStyle =
    state === 'listening'
      ? { transform: `scale(${listeningScale.toFixed(3)})` }
      : undefined

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-label={`Coach orb ${state}`}
      role="img"
    >
      <div
        className={cn(
          'absolute inset-0 rounded-full opacity-60 blur-2xl',
          state === 'speaking' && 'animate-coach-orb-speak',
          state === 'idle' && 'animate-coach-orb-idle',
        )}
        style={{
          background: `radial-gradient(circle, ${lightGold} 0%, ${baseGold} 55%, transparent 75%)`,
        }}
      />
      <div
        className={cn(
          'relative rounded-full transition-transform duration-100 ease-out',
          state === 'speaking' && 'animate-coach-orb-speak',
          state === 'idle' && 'animate-coach-orb-idle',
        )}
        style={{
          width: size * 0.78,
          height: size * 0.78,
          background: `radial-gradient(circle at 35% 30%, ${lightGold} 0%, ${baseGold} 45%, ${deepGold} 100%)`,
          boxShadow: `0 0 60px 4px ${baseGold}55, inset 0 0 30px ${deepGold}33`,
          ...orbStyle,
        }}
      />
    </div>
  )
}
