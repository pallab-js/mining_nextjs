'use client'
/**
 * Chart primitives — Recharts wrappers + hand-rolled heatmap/gauge.
 * All are client components receiving plain JSON props from server pages.
 * Dark control-room palette: colours reference the CSS vars from globals.css.
 */
import type { ReactNode } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtWith, type Fmt } from '@/lib/fmt-kinds'

export const PALETTE = {
  signal: '#f5a524',
  good: '#2dd4bf',
  bad: '#f43f5e',
  blue: '#60a5fa',
  purple: '#a78bfa',
  inkDim: '#8b9bb0',
  line: '#1e2a3a',
  panel: '#111823',
}

const AXIS = { stroke: PALETTE.line, fontSize: 10, fontFamily: 'var(--font-mono), monospace' }

/* --------------------------------------------------------------- tooltip */

interface TipEntry {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

function DarkTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: TipEntry[]
  label?: string | number
  format?: Fmt
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-line bg-panel/95 px-3 py-2 shadow-lg max-w-[calc(100vw-2rem)] sm:max-w-none">
      {label !== undefined && <div className="num mb-1.5 text-[10px] text-ink-dim">{label}</div>}
      {payload.map((e, i) => (
        <div key={i} className="num flex items-center gap-2 text-[11px] sm:text-[12px]">
          <span className="size-2 rounded-full shrink-0" style={{ background: e.color }} />
          <span className="text-ink-dim truncate max-w-[120px]">{e.name}</span>
          <span className="ml-auto pl-2 text-ink whitespace-nowrap shrink-0">
            {format && typeof e.value === 'number' ? fmtWith(format, e.value) : String(e.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- trendchart */

export interface SeriesDef {
  key: string
  name: string
  color: string
  kind?: 'line' | 'area'
  /** right-hand axis (for dual-unit charts like grade + recovery) */
  axis?: 'left' | 'right'
  /** value format for this series in tooltips */
  format?: Fmt
}

export function TrendChart({
  data,
  xKey,
  series,
  height = 240,
  yFormat,
  reference,
  responsive = true,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: readonly Record<string, any>[]
  xKey: string
  series: SeriesDef[]
  height?: number
  /** format kind for the left Y axis ticks */
  yFormat?: Fmt
  /** horizontal reference line, e.g. availability target */
  reference?: { y: number; label: string; color?: string }
  /** use responsive height based on viewport (default: true) */
  responsive?: boolean
}) {
  const { useChartHeight } = require('@/lib/responsive')
  const responsiveHeight = responsive ? useChartHeight(height) : height
  const hasRight = series.some((s) => s.axis === 'right')
  const primary = series[0]?.format
  const Chart = series.every((s) => s.kind !== 'area') ? LineChart : ComposedChart
  return (
    <ResponsiveContainer width="100%" height={responsiveHeight}>
      <Chart data={data} margin={{ top: 6, right: hasRight ? 4 : 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={PALETTE.line} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: PALETTE.line }} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={yFormat ? (v: number) => fmtWith(yFormat, v) : undefined}
          width={46}
        />
        {hasRight && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={40}
          />
        )}
        <Tooltip
          content={<DarkTooltip format={primary} />}
          cursor={{ stroke: PALETTE.inkDim, strokeDasharray: '3 3' }}
        />
        {series.map((s) =>
          s.kind === 'area' ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={1.6}
              fill={s.color}
              fillOpacity={0.08}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          ) : (
            <Line
              key={s.key}
              yAxisId={s.axis === 'right' ? 'right' : 'left'}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={1.6}
              dot={false}
              activeDot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          ),
        )}
        {reference && (
          <ReferenceLine
            y={reference.y}
            stroke={reference.color ?? PALETTE.bad}
            strokeDasharray="4 4"
            label={{
              value: reference.label,
              position: 'insideTopRight',
              fill: PALETTE.inkDim,
              fontSize: 10,
            }}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  )
}

/* --------------------------------------------------------------- bar chart */

export function BarTrend({
  data,
  xKey,
  bars,
  stacked = false,
  height = 240,
  horizontal = false,
  yFormat,
  responsive = true,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: readonly Record<string, any>[]
  xKey: string
  bars: { key: string; name: string; color: string; format?: Fmt }[]
  stacked?: boolean
  height?: number
  horizontal?: boolean
  yFormat?: Fmt
  /** use responsive height based on viewport (default: true) */
  responsive?: boolean
}) {
  const { useChartHeight } = require('@/lib/responsive')
  const responsiveHeight = responsive ? useChartHeight(height) : height
  const barFormat = bars[0]?.format
  return (
    <ResponsiveContainer width="100%" height={responsiveHeight}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : undefined}
        margin={{ top: 6, right: 12, bottom: 0, left: -18 }}
        barGap={1}
      >
        <CartesianGrid stroke={PALETTE.line} strokeDasharray="2 4" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={{ stroke: PALETTE.line }} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={110}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: PALETTE.line }} />
            <YAxis
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              tickFormatter={yFormat ? (v: number) => fmtWith(yFormat, v) : undefined}
              width={46}
            />
          </>
        )}
        <Tooltip
          content={<DarkTooltip format={barFormat} />}
          cursor={{ fill: 'rgba(139,155,176,0.06)' }}
        />
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name}
            fill={b.color}
            stackId={stacked ? 's' : undefined}
            maxBarSize={horizontal ? 16 : 28}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ donut */

export function Donut({
  data,
  height = 220,
  centerLabel,
  centerValue,
  responsive = true,
}: {
  data: { name: string; value: number; color: string }[]
  height?: number
  centerLabel?: string
  centerValue?: string
  /** use responsive height based on viewport (default: true) */
  responsive?: boolean
}) {
  const { useChartHeight } = require('@/lib/responsive')
  const responsiveHeight = responsive ? useChartHeight(height) : height
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={responsiveHeight}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            stroke={PALETTE.panel}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
          <Legend
            verticalAlign="bottom"
            formatter={(v) => (
              <span style={{ color: PALETTE.inkDim, fontSize: 11 }}>{v}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-8">
          <span className="num text-[18px] font-medium text-ink">{centerValue}</span>
          <span className="label-micro">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- heatmap */

/** Availability-style heatmap: rows × days, red→teal by value. */
export function Heatmap({
  rowLabels,
  dates,
  cells,
  /** optional link target per row label (site code / unit code pages) */
  rowHrefs,
  height = 30,
}: {
  rowLabels: string[]
  dates: string[]
  /** [row][date] → percent (null = no data) */
  cells: (number | null)[][]
  rowHrefs?: Record<string, string>
  height?: number
}) {
  return (
    <div className="scroll-slim overflow-x-auto">
      <div className="min-w-max">
        <div className="flex">
          <div className="w-14 shrink-0" />
          <div className="flex gap-px">
            {dates.map((d) => (
              <div
                key={d}
                className="num text-[9px] text-ink-dim"
                style={{ width: height }}
                title={d}
              >
                {Number(d.slice(8)) % 2 === 1 ? d.slice(8) : ''}
              </div>
            ))}
          </div>
        </div>
        {rowLabels.map((label, r) => (
          <div key={label} className="flex items-center">
            <div className="w-14 shrink-0 pr-2 text-[10px] text-ink-dim">
              {rowHrefs?.[label] ? (
                <a href={rowHrefs[label]} className="focus-ring hover:text-ink">
                  {label}
                </a>
              ) : (
                label
              )}
            </div>
            <div className="flex gap-px py-px">
              {cells[r]?.map((v, c) => {
                const t = v === null ? 0 : Math.min(Math.max((v - 50) / 50, 0), 1)
                const hue = t * 160 // 0 = red, 160 = teal
                return (
                  <div
                    key={c}
                    style={{
                      width: height,
                      height: height - 6,
                      background:
                        v === null
                          ? 'var(--color-panel-2)'
                          : `hsl(${hue} 72% 48% / ${0.2 + 0.6 * t})`,
                    }}
                    className="rounded-[2px]"
                    title={
                      v === null
                        ? `${label} · ${dates[c]} · no data`
                        : `${label} · ${dates[c]} · ${v.toFixed(1)}%`
                    }
                  />
                )
              })}
            </div>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink-dim sm:gap-1.5">
          <span className="whitespace-nowrap">50%</span>
          <span
            className="h-2 w-28 sm:w-40 rounded-sm flex-shrink-0"
            style={{
              background: 'linear-gradient(to right, hsl(0 72% 48% / 0.8), hsl(80 72% 48% / 0.5), hsl(160 72% 48% / 0.8))',
            }}
          />
          <span className="whitespace-nowrap">100%</span>
          <span className="ml-2 sm:ml-1 whitespace-nowrap">grey = no data</span>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- gauge */

/** Tailings level gauge: meter vs a limit marker (red past the limit). */
export function Gauge({
  value,
  limit = 80,
  max = 100,
  label,
  caption,
}: {
  value: number | null
  limit?: number
  max?: number
  label: string
  caption?: ReactNode
}) {
  if (value === null) {
    return (
      <div className="py-3 text-[12px] text-ink-dim">
        {label}: <span className="num">—</span>
        {caption && <div className="mt-0.5 text-[11px]">{caption}</div>}
      </div>
    )
  }
  const pct = Math.min((value / max) * 100, 100)
  const over = value >= limit
  const near = !over && value >= limit * 0.9
  const color = over ? PALETTE.bad : near ? PALETTE.signal : PALETTE.good
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] text-ink">{label}</span>
        <span className="num text-[14px] font-medium" style={{ color }}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-sm bg-panel-2 ring-1 ring-line" role="img" aria-label={`${label}: ${value.toFixed(1)}%, limit ${limit}%`}>
        <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
        <div
          className="absolute inset-y-0 w-px bg-ink/70"
          style={{ left: `${(limit / max) * 100}%` }}
          aria-label={`Limit ${limit}%`}
        >
          <span className="num absolute -top-5 left-0 text-[9px] whitespace-nowrap text-ink-dim bg-panel px-0.5 rounded">
            {limit}%
          </span>
        </div>
      </div>
      {caption && <div className="mt-1 text-[11px] text-ink-dim">{caption}</div>}
    </div>
  )
}
