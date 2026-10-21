/**
 * Web-layer shared types — explicit Next.js prop shapes so new routes
 * typecheck before `.next/types` regenerates them.
 */

/** `searchParams` prop from any page. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** `params` prop for `/sites/[id]`. */
export type SiteParams = Promise<{ id: string }>
