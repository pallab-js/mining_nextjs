/** EmptyState — reset-mode friendly: explains why it's empty + next step. */
import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-12'}`}
    >
      {icon && <div className="mb-3 text-ink-dim/50">{icon}</div>}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[12px] text-ink-dim">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
