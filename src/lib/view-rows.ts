/**
 * DataTable row adapter — read-model rows are plain serialisable objects,
 * so they can cross the RSC boundary as props; this just narrows the type.
 * Lives outside the client module so server pages can call it.
 */
export type ViewRow = Record<string, string | number | null>

export function viewRows<T extends object>(rows: T[]): ViewRow[] {
  return rows as unknown as ViewRow[]
}
