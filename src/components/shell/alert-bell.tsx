/** AlertBell — live count from the fixed 30-day all-sites evaluation. */
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getActiveAlerts } from '@/lib/queries/alerts'

export async function AlertBell() {
  const alerts = await getActiveAlerts()
  const count = alerts.length
  const critical = alerts.some((a) => a.severity === 'critical' || a.severity === 'high')
  return (
    <Link
      href="/#alerts"
      aria-label={`${count} active alert${count === 1 ? '' : 's'}`}
      className="focus-ring relative flex size-8 items-center justify-center rounded-md border border-line bg-panel hover:border-ink-dim/40"
    >
      <Bell className={`size-4 ${critical ? 'text-bad' : count > 0 ? 'text-warn' : 'text-ink-dim'}`} />
      {count > 0 && (
        <span
          className={`num absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-canvas ${
            critical ? 'bg-bad' : 'bg-warn'
          }`}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
