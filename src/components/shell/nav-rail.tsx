'use client'
/** Left nav rail — active state follows the pathname. */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Mountain,
  Activity,
  Truck,
  ShieldCheck,
  Leaf,
  Boxes,
  Upload,
  Settings,
} from 'lucide-react'

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/sites', label: 'Sites', icon: Mountain },
  { href: '/production', label: 'Production', icon: Activity },
  { href: '/equipment', label: 'Equipment', icon: Truck },
  { href: '/safety', label: 'Safety', icon: ShieldCheck },
  { href: '/environment', label: 'Environment', icon: Leaf },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function NavRail() {
  const pathname = usePathname()
  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-panel-2 px-3 py-2 lg:h-full lg:w-52 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 lg:px-2 lg:py-3">
      <Link
        href="/"
        className="mb-3 hidden items-center gap-2 px-2 lg:flex"
        aria-label="COMC home"
      >
        <span className="flex size-6 items-center justify-center rounded bg-signal/15 text-[13px] font-bold text-signal">
          C
        </span>
        <span className="text-[13px] font-semibold tracking-wide">
          COMC<span className="text-ink-dim/60"> · ops</span>
        </span>
      </Link>
      {NAV.map(({ href, label, icon: Icon, ...rest }) => {
        const active = 'exact' in rest ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`focus-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
              active
                ? 'bg-panel text-ink shadow-[inset_2px_0_0_var(--color-signal)]'
                : 'text-ink-dim hover:bg-panel hover:text-ink'
            }`}
          >
            <Icon className={`size-4 ${active ? 'text-signal' : ''}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
