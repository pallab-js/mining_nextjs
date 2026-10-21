'use server'
/**
 * Destructive data-management actions.
 *
 * Both require a typed confirmation word so a stray click can never wipe the
 * dataset: `RESEED` restores the demo dataset, `RESET` empties every table.
 */
import { refresh } from 'next/cache'
import { runReset, runSeed } from '../db/seed'
import { RESET_CONFIRM, RESEED_CONFIRM } from '../enums'
import { ok, fail, type ActionResult } from './result'
import { attempt, connection } from './helpers'

function confirmed(fd: FormData, word: string): boolean {
  const raw = fd.get('confirm')
  return typeof raw === 'string' && raw.trim().toUpperCase() === word
}

/** Replace every record with the deterministic demo dataset. */
export async function reseedDatabase(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    if (!confirmed(fd, RESEED_CONFIRM)) {
      return fail(`Type ${RESEED_CONFIRM} to confirm — this replaces every record with the demo dataset.`, {
        confirm: [`The confirmation word must be ${RESEED_CONFIRM}.`],
      })
    }
    await connection()
    const stats = runSeed()
    refresh()
    return ok(
      `Demo dataset restored — ${stats.sites} sites, ${stats.equipment} units, ${stats.productionDays} production days, ${stats.incidents} incidents.`,
    )
  })
}

/** Empty every table (schema stays intact). */
export async function resetDatabase(fd: FormData): Promise<ActionResult> {
  return attempt(async () => {
    if (!confirmed(fd, RESET_CONFIRM)) {
      return fail(`Type ${RESET_CONFIRM} to confirm — this deletes every record and cannot be undone.`, {
        confirm: [`The confirmation word must be ${RESET_CONFIRM}.`],
      })
    }
    await connection()
    runReset()
    refresh()
    return ok('Database cleared — every table is empty. Reseed to restore the demo dataset.')
  })
}
