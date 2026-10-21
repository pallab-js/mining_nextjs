'use client'
/** Granularity toggle — day / week / month, kept in the URL (`?gran=`). */
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const OPTIONS = ['day', 'week', 'month'] as const
export type Gran = (typeof OPTIONS)[number]

export function GranToggle({ current }: { current: Gran }) {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const set = (g: Gran) => {
    const params = new URLSearchParams(sp.toString())
    if (g === 'day') params.delete('gran')
    else params.set('gran', g)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex rounded-md border border-line bg-panel p-0.5" role="group" aria-label="Granularity">
      {OPTIONS.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => set(g)}
          aria-pressed={g === current}
          className={`focus-ring rounded px-3 py-1.5 text-[11px] capitalize transition-colors min-h-[44px] min-w-[60px] ${
            g === current ? 'bg-panel-2 text-ink shadow-[inset_0_0_0_1px_var(--color-line)]' : 'text-ink-dim hover:text-ink'
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  )
}
