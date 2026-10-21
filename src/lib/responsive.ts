'use client'
/** Responsive utilities for mobile-friendly components. */
import { useEffect, useState } from 'react'

/** Breakpoints matching Tailwind CSS defaults */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/** Hook to track current breakpoint */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('lg')

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= BREAKPOINTS['2xl']) setBp('2xl')
      else if (w >= BREAKPOINTS.xl) setBp('xl')
      else if (w >= BREAKPOINTS.lg) setBp('lg')
      else if (w >= BREAKPOINTS.md) setBp('md')
      else if (w >= BREAKPOINTS.sm) setBp('sm')
      else setBp('sm')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return bp
}

/** Get responsive chart height based on breakpoint */
export function getResponsiveChartHeight(baseHeight: number, breakpoint: Breakpoint): number {
  const ratios: Record<Breakpoint, number> = {
    sm: 0.65,
    md: 0.75,
    lg: 0.9,
    xl: 1,
    '2xl': 1.1,
  }
  return Math.round(baseHeight * ratios[breakpoint])
}

/** Hook for responsive chart height */
export function useChartHeight(baseHeight: number): number {
  const bp = useBreakpoint()
  return getResponsiveChartHeight(baseHeight, bp)
}

/** Check if current viewport is mobile (< md) */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < BREAKPOINTS.md)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return isMobile
}

/** Check if current viewport is tablet (md to lg) */
export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      setIsTablet(w >= BREAKPOINTS.md && w < BREAKPOINTS.lg)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return isTablet
}

/** Check if current viewport is desktop (>= lg) */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= BREAKPOINTS.lg)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return isDesktop
}