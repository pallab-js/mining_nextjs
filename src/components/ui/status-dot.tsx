/** StatusDot / Badge — one tone vocabulary for states & severities. */
import type { ReactNode } from 'react'

export type DotTone = 'good' | 'warn' | 'bad' | 'idle'

const DOT: Record<DotTone, string> = {
  good: 'bg-good',
  warn: 'bg-warn',
  bad: 'bg-bad',
  idle: 'bg-ink-dim/40',
}

export function StatusDot({ tone, pulse = false }: { tone: DotTone; pulse?: boolean }) {
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${DOT[tone]} ${pulse ? 'animate-pulse' : ''}`}
    />
  )
}

const BADGE: Record<DotTone, string> = {
  good: 'border-good/30 bg-good/10 text-good',
  warn: 'border-warn/30 bg-warn/10 text-warn',
  bad: 'border-bad/30 bg-bad/10 text-bad',
  idle: 'border-line bg-panel-2 text-ink-dim',
}

export function Badge({
  tone = 'idle',
  children,
  className = '',
}: {
  tone?: DotTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${BADGE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
