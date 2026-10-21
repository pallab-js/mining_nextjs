/** KPI tile — label, big mono number, delta vs previous period, tone hint. */
import type { ReactNode } from 'react'
import { fmtDelta } from '@/lib/format'

export type Tone = 'good' | 'warn' | 'bad' | 'neutral'

const TONE_RING: Record<Tone, string> = {
  good: 'border-l-good',
  warn: 'border-l-warn',
  bad: 'border-l-bad',
  neutral: 'border-l-line',
}

const TONE_TEXT: Record<Tone, string> = {
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
  neutral: 'text-ink-dim',
}

export function KpiTile({
  label,
  value,
  unit,
  delta,
  /** when false an upward delta is bad (e.g. CO₂e intensity) */
  upIsGood = true,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: ReactNode
  unit?: string
  /** fractional change vs previous period (0.023 = +2.3%), null if unknown */
  delta?: number | null
  upIsGood?: boolean
  tone?: Tone
  hint?: string
}) {
  const deltaTone: Tone | null =
    delta === null || delta === undefined || !Number.isFinite(delta) || delta === 0
      ? null
      : (delta > 0) === upIsGood
        ? 'good'
        : 'bad'
  return (
    <div
      className={`rounded-lg border border-line border-l-2 bg-panel px-4 py-3 ${TONE_RING[tone]}`}
    >
      <div className="label-micro">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="num text-[26px] leading-none font-medium text-ink">{value}</span>
        {unit && <span className="text-[12px] text-ink-dim">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className={`num mt-1.5 text-[11px] ${deltaTone ? TONE_TEXT[deltaTone] : 'text-ink-dim'}`}>
          {fmtDelta(delta)} <span className="text-ink-dim/70">vs prev</span>
        </div>
      )}
      {hint && <div className="mt-1 text-[11px] text-ink-dim">{hint}</div>}
    </div>
  )
}
