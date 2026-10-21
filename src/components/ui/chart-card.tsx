/** ChartCard — Panel sized for a Recharts client component + loading skeleton. */
import type { ReactNode } from 'react'
import { Panel } from './panel'

export function ChartCard({
  title,
  hint,
  actions,
  height = 240,
  children,
  className = '',
  flush = false,
}: {
  title?: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  height?: number
  children: ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <Panel
      title={title}
      hint={hint}
      actions={actions}
      className={className}
      flush
    >
      <div style={{ height }} className={flush ? '' : 'px-2 pt-3 pb-1'}>
        {children}
      </div>
    </Panel>
  )
}

/** Matched skeleton for Suspense fallbacks. */
export function ChartSkeleton({ height = 240, label }: { height?: number; label?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="border-b border-line px-4 py-2.5">
        <div className="skeleton h-3.5 w-40" />
      </div>
      <div className="p-4">
        <div className="skeleton" style={{ height, width: '100%' }} />
        {label && (
          <p className="sr-only" aria-live="polite">
            {label}
          </p>
        )}
      </div>
    </div>
  )
}
