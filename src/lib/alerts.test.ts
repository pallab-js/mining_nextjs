import { describe, expect, it } from 'vitest'
import { compare, evaluateAlerts, type RuleInput } from './alerts'
import type { MetricKey } from './enums'

const rule = (over: Partial<RuleInput> = {}): RuleInput => ({
  id: 1,
  name: 'Test rule',
  metric: 'recovery_pct',
  comparator: '<',
  threshold: 72,
  severity: 'medium',
  siteId: null,
  active: true,
  ...over,
})

describe('compare', () => {
  it('applies each comparator strictly/inclusively', () => {
    expect(compare(70, '<', 72)).toBe(true)
    expect(compare(72, '<', 72)).toBe(false)
    expect(compare(72, '<=', 72)).toBe(true)
    expect(compare(85, '>', 85)).toBe(false)
    expect(compare(85, '>=', 85)).toBe(true)
    expect(compare(90, '<', 72)).toBe(false)
  })
})

describe('evaluateAlerts', () => {
  it('fires on breach', () => {
    const out = evaluateAlerts({ recovery_pct: 68 }, [rule()])
    expect(out).toHaveLength(1)
    expect(out[0].currentValue).toBe(68)
    expect(out[0].metricLabel).toBe('Recovery')
  })

  it('does not fire when within limits', () => {
    expect(evaluateAlerts({ recovery_pct: 90 }, [rule()])).toHaveLength(0)
  })

  it('skips inactive rules', () => {
    expect(evaluateAlerts({ recovery_pct: 60 }, [rule({ active: false })])).toHaveLength(0)
  })

  it('skips unresolvable (null/undefined/NaN) metrics instead of firing', () => {
    expect(evaluateAlerts({ recovery_pct: null }, [rule()])).toHaveLength(0)
    expect(evaluateAlerts({}, [rule()])).toHaveLength(0)
    expect(evaluateAlerts({ recovery_pct: Number.NaN }, [rule()])).toHaveLength(0)
  })

  it('scopes per metric key', () => {
    const rules = [
      rule({ id: 1, metric: 'availability_pct', comparator: '<', threshold: 85 }),
      rule({ id: 2, metric: 'tailings_level_pct', comparator: '>=', threshold: 80 }),
      rule({ id: 3, metric: 'co2e_intensity', comparator: '>', threshold: 10 }),
    ]
    const out = evaluateAlerts(
      { availability_pct: 82.9, tailings_level_pct: 74, co2e_intensity: 13.6 },
      rules,
    )
    expect(out.map((a) => a.ruleId)).toEqual([1, 3])
  })

  it('sorts by severity: critical → low', () => {
    const out = evaluateAlerts(
      { recovery_pct: 50, availability_pct: 50 },
      [
        rule({ id: 1, metric: 'recovery_pct', severity: 'low' }),
        rule({ id: 2, metric: 'availability_pct', severity: 'critical' }),
      ],
    )
    expect(out.map((a) => a.severity)).toEqual(['critical', 'low'])
  })

  it('keeps site scope metadata', () => {
    const out = evaluateAlerts({ recovery_pct: 10 } as Partial<Record<MetricKey, number>>, [rule({ siteId: 7 })])
    expect(out[0].siteId).toBe(7)
  })
})
