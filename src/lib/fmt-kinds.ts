/**
 * Format kinds — serializable identifiers instead of function props, so
 * server pages can pass display specs to client chart/table components
 * (functions cannot cross the RSC boundary).
 */
import { fmtCompact, fmtInt, fmtNum } from './format'

export const FMT = {
  compact: (v: number) => fmtCompact(v, 1),
  compact2: (v: number) => fmtCompact(v),
  int: (v: number) => fmtInt(v),
  pct1: (v: number) => `${fmtNum(v, 1)}%`,
  pct0: (v: number) => `${fmtNum(v, 0)}%`,
  num1: (v: number) => fmtNum(v, 1),
  num2: (v: number) => fmtNum(v, 2),
  raw: (v: number) => String(v),
} as const

export type Fmt = keyof typeof FMT

export function fmtWith(kind: Fmt | undefined, v: number): string {
  return (FMT[kind ?? 'raw'])(v)
}
