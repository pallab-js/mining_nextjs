'use client'
/** Mobile slide-out navigation drawer. */
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LayoutDashboard, Mountain, Activity, Truck, ShieldCheck, Leaf, Boxes, Upload, Settings } from 'lucide-react'

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

export function MobileMenuButton() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring lg:hidden p-2 rounded-md text-ink-dim hover:text-ink hover:bg-panel transition-colors"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
      >
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {open && <MobileNavDrawer onClose={close} />}
    </>
  )
}

export function MobileNavDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const drawerRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    drawerRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocus.current?.focus()
    }
  }, [onClose])

  useEffect(() => {
    // close on route change
  }, [pathname])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="mobile-nav-drawer"
        ref={drawerRef}
        tabIndex={-1}
        className="fixed inset-y-0 left-0 z-50 w-64 max-w-full bg-panel-2 border-r border-line lg:hidden flex flex-col outline-none"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <Link href="/" onClick={onClose} className="flex items-center gap-2" aria-label="COMC home">
            <span className="flex size-6 items-center justify-center rounded bg-signal/15 text-[13px] font-bold text-signal">C</span>
            <span className="text-[13px] font-semibold tracking-wide">COMC<span className="text-ink-dim/60">·ops</span></span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring p-1 rounded-md text-ink-dim hover:text-ink hover:bg-panel transition-colors"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon, ...rest }) => {
            const active = 'exact' in rest ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  active
                    ? 'bg-panel text-ink'
                    : 'text-ink-dim hover:bg-panel hover:text-ink'
                }`}
              >
                <Icon className={`size-5 ${active ? 'text-signal' : 'text-ink-dim'}`} />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
