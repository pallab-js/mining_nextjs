/** EmptyState — reset-mode friendly: explains why it's empty + next step. */
import type { ReactNode } from 'react'
import Link from 'next/link'

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  href,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
  /** optional link to the relevant create/import page */
  href?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-12'}`}
    >
      {icon && <div className="mb-3 text-ink-dim/50">{icon}</div>}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[12px] text-ink-dim">{description}</p>}
      {(action || href) && (
        <div className="mt-4 flex flex-col gap-2 w-full max-w-xs items-center">
          {action && <div>{action}</div>}
          {href && (
            <Link
              href={href}
              className="focus-ring w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-[11.5px] hover:border-ink-dim/50 min-h-[44px]"
            >
              Get started
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
