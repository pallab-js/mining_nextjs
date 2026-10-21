/** ActionResult — never throw from server actions. */
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

export function ok(message: string): ActionResult {
  return { ok: true, message }
}

export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionResult {
  return { ok: false, message, fieldErrors }
}
