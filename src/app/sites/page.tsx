/** Sites & mines — portfolio list with live per-site stats. */
import Link from 'next/link'
import { Mountain } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge, StatusDot } from '@/components/ui/status-dot'
import { EmptyState } from '@/components/ui/empty-state'
import { listSites } from '@/lib/queries/sites'
import { fmtInt, fmtDay } from '@/lib/format'
import { toneFor, humanize } from '@/lib/tones'

export const metadata = { title: 'Sites — COMC' }

export default async function SitesPage() {
  const sites = await listSites()
  return (
    <>
      <PageHeader
        title="Sites & Mines"
        subtitle={`${sites.length} site${sites.length === 1 ? '' : 's'} in portfolio`}
      />
      {sites.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel">
          <EmptyState
            icon={<Mountain className="size-6" />}
            title="No sites yet"
            description="Seed demo data or import a sites CSV to get started."
            action={
              <a
                href="/settings"
                className="focus-ring rounded-md border border-line bg-panel-2 px-3 py-1.5 text-[12px] hover:text-ink"
              >
                Go to Settings
              </a>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <Link
              key={s.id}
              href={`/sites/${s.id}`}
              className="focus-ring group rounded-lg border border-line bg-panel p-4 transition-colors hover:border-ink-dim/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="num flex size-8 items-center justify-center rounded bg-panel-2 text-[11px] font-bold text-signal">
                    {s.code}
                  </span>
                  <div>
                    <div className="text-[13px] font-medium group-hover:text-signal">{s.name}</div>
                    <div className="text-[11px] text-ink-dim">
                      {humanize(s.mineral)} · {s.region} · {humanize(s.mineType)}
                    </div>
                  </div>
                </div>
                <StatusDot tone={toneFor('site', s.status)} />
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3">
                <Stat label="Ore/day" value={s.latestOreTpd === null ? '—' : fmtInt(s.latestOreTpd)} unit="t" />
                <Stat label="Capacity" value={fmtInt(s.capacityTpd)} unit="t/d" />
                <Stat label="Fleet" value={`${s.units - s.unitsDown}/${s.units}`} hint={s.unitsDown > 0 ? `${s.unitsDown} down` : undefined} bad={s.unitsDown > 0} />
                <Stat label="Open H&S" value={fmtInt(s.openIncidents)} bad={s.openIncidents > 0} />
              </dl>
              <div className="mt-2 flex items-center justify-between">
                <Badge tone={toneFor('site', s.status)}>{humanize(s.status)}</Badge>
                {s.latestDate && (
                  <span className="num text-[10px] text-ink-dim">thru {fmtDay(s.latestDate)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function Stat({
  label,
  value,
  unit,
  hint,
  bad = false,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  bad?: boolean
}) {
  return (
    <div>
      <dt className="label-micro">{label}</dt>
      <dd className={`num mt-0.5 text-[13px] ${bad ? 'text-bad' : 'text-ink'}`}>
        {value}
        {unit && <span className="text-[10px] text-ink-dim"> {unit}</span>}
      </dd>
      {hint && <dd className="num text-[10px] text-warn">{hint}</dd>}
    </div>
  )
}
