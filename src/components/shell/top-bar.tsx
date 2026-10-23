/**
 * Top bar — global filters (URL state), freshness badge and alert bell.
 * The whole bar is one async server component behind Suspense so the layout
 * never blocks prerender on DB access (Cache Components rule).
 */
import { Suspense } from 'react'
import { SiteSelect, RangeSelect } from './filters'
import { AlertBell } from './alert-bell'
import { FreshnessBadge } from './freshness-badge'
import { MobileMenuButton } from './mobile-nav-drawer'
import { getSiteOptions } from '@/lib/queries/sites'

export async function TopBar() {
  const sites = await getSiteOptions()
  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-canvas/90 px-3 py-2 backdrop-blur lg:px-5">
        <MobileMenuButton />
        <div className="flex items-center gap-2 lg:hidden">
          <span className="flex size-6 items-center justify-center rounded bg-signal/15 text-[13px] font-bold text-signal">
            C
          </span>
        </div>
        <Suspense fallback={<div className="skeleton h-7 w-36" />}>
          <SiteSelect sites={sites} />
        </Suspense>
        <Suspense fallback={<div className="skeleton h-7 w-32" />}>
          <RangeSelect />
        </Suspense>
        <div className="flex-1" />
        <Suspense fallback={<div className="skeleton hidden h-7 w-44 md:block" />}>
          <FreshnessBadge />
        </Suspense>
        <Suspense fallback={<div className="skeleton size-8" />}>
          <AlertBell />
        </Suspense>
      </header>
    </>
  )
}

/** Layout-level Suspense wrapper with a matched skeleton. */
export async function TopBarBoundary() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-canvas/90 px-3 py-2 lg:px-5">
          <div className="skeleton size-8 lg:hidden" />
          <div className="skeleton h-7 w-36" />
          <div className="skeleton h-7 w-32" />
          <div className="flex-1" />
          <div className="skeleton size-8" />
        </header>
      }
    >
      <TopBar />
    </Suspense>
  )
}
