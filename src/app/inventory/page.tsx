/** Stockpiles & shipments — inventory levels, pipeline, value. */
import { Suspense } from 'react'
import { connection } from 'next/server'
import { Boxes } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { KpiTile } from '@/components/ui/kpi-tile'
import { Panel } from '@/components/ui/panel'
import { ChartSkeleton } from '@/components/ui/chart-card'
import { KpiSkeletons, TableSkeleton } from '@/components/ui/skeletons'
import { DataTable, type Column } from '@/components/ui/data-table'
import { viewRows } from '@/lib/view-rows'
import { EmptyState } from '@/components/ui/empty-state'
import { Donut, PALETTE } from '@/components/charts'
import { ActionForm } from '@/components/forms/action-form'
import { FormDialog } from '@/components/forms/form-dialog'
import { createShipment, createStockpile } from '@/lib/actions/inventory'
import { shipmentFields, stockpileFields } from '@/lib/field-specs'
import { filterFromSearchParams, rangeLabel } from '@/lib/filter'
import {
  getShipmentKpis,
  getStockpileByProduct,
  listShipments,
  listStockpiles,
} from '@/lib/queries/inventory'
import { getSiteOptions } from '@/lib/queries/sites'
import { fmtCompact, fmtInt, fmtMoney } from '@/lib/format'
import type { SearchParams } from '@/lib/web'

export const metadata = { title: 'Inventory — COMC' }

const PRODUCT_COLORS = [PALETTE.signal, PALETTE.good, PALETTE.blue, PALETTE.purple, PALETTE.bad, PALETTE.inkDim]

export default function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  return <InventoryContent sp={searchParams} />
}

async function InventoryContent({ sp }: { sp: SearchParams }) {
  await connection()
  const f = filterFromSearchParams(await sp)
  const sites = await getSiteOptions()
  const scopedSite = sites.find((s) => s.id === f.siteId)?.code
  return (
    <>
      <PageHeader
        title="Stockpiles & Shipments"
        subtitle={`${rangeLabel(f)} · ${f.from} → ${f.to}`}
        breadcrumbs={[
          { label: 'Overview', href: '/' },
          { label: 'Inventory', href: '/inventory' },
        ]}
        actions={
          <>
            <FormDialog
              label="＋ Stockpile"
              title="Update stockpile"
              description="One stockpile per site and product — saving updates it."
            >
              <ActionForm
                action={createStockpile}
                fields={stockpileFields(sites, scopedSite)}
                submitLabel="Save stockpile"
              />
            </FormDialog>
            <FormDialog
              label="＋ Shipment"
              title="Create shipment"
              description="Log a load moving from a site to a customer."
            >
              <ActionForm
                action={createShipment}
                fields={shipmentFields(sites, scopedSite)}
                submitLabel="Create shipment"
              />
            </FormDialog>
          </>
        }
      />
      <div className="space-y-4">
        <Suspense fallback={<KpiSkeletons count={6} />}>
          <InventoryKpis sp={sp} />
        </Suspense>
        <div className="grid gap-4 xl:grid-cols-3">
          <Suspense fallback={<ChartSkeleton label="Loading stockpile mix" />}>
            <StockpileMix sp={sp} />
          </Suspense>
          <div className="xl:col-span-2">
            <Suspense fallback={<TableSkeleton rows={6} />}>
              <StockpileTable sp={sp} />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={<TableSkeleton rows={6} />}>
          <ShipmentTable sp={sp} />
        </Suspense>
      </div>
    </>
  )
}

async function InventoryKpis({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const kpis = await getShipmentKpis(f)
  const stockpiles = await listStockpiles(f)
  const totalStock = stockpiles.reduce((s, p) => s + p.tonnes, 0)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <KpiTile label="Stock on ground" value={fmtCompact(totalStock)} unit="t" hint={`${stockpiles.length} stockpiles`} />
      <KpiTile label="In transit" value={fmtCompact(kpis.tonnesInTransit)} unit="t" hint={`${kpis.inTransit} shipments`} />
      <KpiTile label="Planned" value={fmtCompact(kpis.tonnesPlanned)} unit="t" hint={`${kpis.planned} shipments`} />
      <KpiTile label="Delivered" value={fmtInt(kpis.delivered)} unit="shipments" tone="good" />
      <KpiTile label="Delayed" value={fmtInt(kpis.delayed)} tone={kpis.delayed > 0 ? 'bad' : 'neutral'} />
      <KpiTile label="Delivered value" value={fmtMoney(kpis.deliveredValue)} hint="tonnes × price, in window" />
    </div>
  )
}

async function StockpileMix({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const mix = await getStockpileByProduct(f)
  const total = mix.reduce((s, m) => s + m.tonnes, 0)
  return (
    <Panel title="Stockpile mix" hint="tonnes by product">
      {mix.length === 0 ? (
        <EmptyState compact icon={<Boxes className="size-6" />} title="No stockpiles" description="Seed or import stockpile records." href="/import" />
      ) : (
        <Donut
          data={mix.map((m, i) => ({ name: m.product, value: m.tonnes, color: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }))}
          centerValue={fmtCompact(total)}
          centerLabel="tonnes"
        />
      )}
    </Panel>
  )
}

async function StockpileTable({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const rows = await listStockpiles(f)
  const columns: Column[] = [
    { key: 'site', header: 'Site', kind: 'mono', priority: 'critical' },
    { key: 'product', header: 'Product', priority: 'critical' },
    { key: 'tonnes', header: 'Tonnes', align: 'right', kind: 'num', fmt: 'int', priority: 'high' },
    { key: 'gradePct', header: 'Grade %', align: 'right', kind: 'num', fmt: 'num2', priority: 'medium' },
    { key: 'updatedAt', header: 'Updated', align: 'right', kind: 'date', priority: 'low' },
  ]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Stockpiles</h2>
        <span className="text-[11px] text-ink-dim">{rows.length} records</span>
      </div>
      <DataTable columns={columns} rows={viewRows(rows)} pageSize={10} dense emptyState={<EmptyState compact title="No stockpiles" href="/import" />} />
    </div>
  )
}

async function ShipmentTable({ sp }: { sp: SearchParams }) {
  const f = filterFromSearchParams(await sp)
  const rows = await listShipments(f, 100)
  const columns: Column[] = [
    { key: 'site', header: 'Site', kind: 'mono', priority: 'critical' },
    { key: 'product', header: 'Product', priority: 'critical' },
    { key: 'status', header: 'Status', kind: 'badge', toneKind: 'shipment', priority: 'critical' },
    { key: 'tonnes', header: 'Tonnes', align: 'right', kind: 'num', fmt: 'int', priority: 'high' },
    { key: 'destination', header: 'Destination', priority: 'high' },
    { key: 'shippedDate', header: 'Shipped', align: 'right', kind: 'date', priority: 'medium' },
    { key: 'eta', header: 'ETA', align: 'right', kind: 'mono', priority: 'medium' },
    { key: 'customer', header: 'Customer', kind: 'dim', priority: 'low' },
    { key: 'priceUsdPerT', header: 'US$/t', align: 'right', kind: 'num', fmt: 'int', priority: 'low' },
  ]
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Shipments</h2>
        <span className="text-[11px] text-ink-dim">{rows.length} shipments</span>
      </div>
      <DataTable columns={columns} rows={viewRows(rows)} pageSize={15} dense emptyState={<EmptyState compact title="No shipments in range" href="/import" />} />
    </div>
  )
}
