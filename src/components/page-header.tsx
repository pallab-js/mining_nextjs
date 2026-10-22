/** PageHeader — consistent title/subtitle/actions row for every module page. */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumbs?: { label: string; href: string }[]
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      {breadcrumbs && (
        <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-dim" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="size-3 shrink-0" />}
                <Link href={crumb.href} className="hover:text-ink focus-ring rounded px-0.5">
                  {crumb.label}
                </Link>
              </li>
            ))}
            <li className="text-ink font-medium" aria-current="page">{title}</li>
          </ol>
        </nav>
      )}
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12px] text-ink-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
