'use client'
/** Breadcrumbs — minimal trail for detail pages. */
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-dim" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3 shrink-0" />}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-ink focus-ring rounded px-0.5">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink font-medium" aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}