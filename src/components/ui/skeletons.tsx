/** Loading skeletons — one per layout family, used by loading.tsx files. */

export function KpiSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton h-[92px]" />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-8" />
        ))}
      </div>
    </div>
  )
}

export function PanelSkeleton({ height = 220 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />
}

/** Full-page skeleton used by route-segment loading.tsx files. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <KpiSkeletons />
      <div className="grid gap-4 lg:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
      <TableSkeleton />
    </div>
  )
}
