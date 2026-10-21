import { describe, expect, it } from 'vitest'
import {
  METRICS,
  availabilityPct,
  co2eIntensity,
  daysBetween,
  formatMetricValue,
  mean,
  pctDelta,
  stripRatio,
  utilizationPct,
  weightedAvg,
} from './metrics'

describe('weightedAvg', () => {
  it('weights by second component', () => {
    expect(weightedAvg([{ value: 80, weight: 100 }, { value: 90, weight: 300 }])).toBeCloseTo(87.5, 6)
  })
  it('ignores zero/negative/invalid weights', () => {
    expect(weightedAvg([{ value: 10, weight: 0 }, { value: 20, weight: -5 }, { value: 42, weight: NaN }])).toBeNull()
  })
  it('is null for empty input', () => {
    expect(weightedAvg([])).toBeNull()
  })
  it('is a plain mean when weights are equal', () => {
    expect(weightedAvg([{ value: 10, weight: 1 }, { value: 20, weight: 1 }])).toBeCloseTo(15, 9)
  })
})

describe('mean', () => {
  it('ignores null/undefined/NaN', () => {
    expect(mean([10, null, 20, undefined, Number.NaN])).toBeCloseTo(15, 9)
  })
  it('returns null when nothing usable', () => {
    expect(mean([null, undefined])).toBeNull()
  })
})

describe('pctDelta', () => {
  it('computes relative change', () => {
    expect(pctDelta(120, 100)).toBeCloseTo(0.2, 9)
    expect(pctDelta(80, 100)).toBeCloseTo(-0.2, 9)
  })
  it('null when previous is 0 (division guard)', () => {
    expect(pctDelta(5, 0)).toBeNull()
  })
  it('null when either side missing', () => {
    expect(pctDelta(null, 10)).toBeNull()
    expect(pctDelta(10, null)).toBeNull()
  })
  it('handles negative previous by absolute base', () => {
    expect(pctDelta(-120, -100)).toBeCloseTo(-0.2, 9)
  })
})

describe('ratios', () => {
  it('stripRatio', () => {
    expect(stripRatio(300, 100)).toBeCloseTo(3, 9)
    expect(stripRatio(300, 0)).toBeNull()
  })
  it('availabilityPct', () => {
    expect(availabilityPct(21, 3)).toBeCloseTo(87.5, 6)
    expect(availabilityPct(0, 0)).toBeNull()
  })
  it('utilizationPct', () => {
    expect(utilizationPct(480, 600)).toBeCloseTo(80, 6)
    expect(utilizationPct(10, 0)).toBeNull()
  })
  it('co2eIntensity is kg per tonne', () => {
    expect(co2eIntensity(9, 1000)).toBeCloseTo(9, 9)
    expect(co2eIntensity(1, 0)).toBeNull()
  })
})

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
  })
  it('NaN on garbage', () => {
    expect(Number.isNaN(daysBetween('nope', '2026-01-01'))).toBe(true)
  })
})

describe('metric registry', () => {
  it('covers every documented metric with a basis and tone', () => {
    for (const [key, def] of Object.entries(METRICS)) {
      expect(def.key).toBe(key)
      expect(['range-aggregate', 'latest-reading']).toContain(def.basis)
      expect(typeof def.higherIsBetter).toBe('boolean')
      expect(def.label.length).toBeGreaterThan(0)
    }
  })
  it('formats values with unit', () => {
    expect(formatMetricValue('recovery_pct', 87.34)).toBe('87.3%')
    expect(formatMetricValue('co2e_intensity', 9.123)).toBe('9.12 kg/t')
    expect(formatMetricValue('recovery_pct', null)).toBe('—')
  })
})
