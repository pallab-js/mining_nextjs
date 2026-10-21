/** Panel — the standard bordered container every module uses. */
import type { ReactNode } from 'react'

export function Panel({
  title,
  hint,
  actions,
  children,
  className = '',
  bodyClassName = '',
  flush = false,
}: {
  title?: ReactNode
  hint?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** remove body padding (charts that manage their own padding) */
  flush?: boolean
}) {
  return (
    <section
      className={`rounded-lg border border-line bg-panel ${className}`}
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset' }}
    >
      {(title || actions) && (
        <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[13px] font-medium text-ink">{title}</h2>}
            {hint && <p className="mt-0.5 truncate text-[11px] text-ink-dim">{hint}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : `p-4 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
