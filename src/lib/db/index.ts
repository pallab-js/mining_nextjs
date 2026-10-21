/**
 * SQLite connection singleton (better-sqlite3).
 * - Opens the git-ignored database at `data/mining.db` lazily, creating `data/` on first use
 * - Applies idempotent DDL on open (see migrations.ts)
 * - Stored on globalThis so dev HMR doesn't leak handles
 */
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { DDL } from './migrations'
import * as tables from './schema'

const globalForDb = globalThis as unknown as { __miningDb?: Database.Database }

export function dbFile(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'mining.db')
}

export function getSQLite(): Database.Database {
  if (!globalForDb.__miningDb) {
    const file = dbFile()
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      const sqlite = new Database(file)
      sqlite.pragma('journal_mode = WAL')
      sqlite.pragma('foreign_keys = ON')
      for (const stmt of DDL) sqlite.exec(stmt)
      globalForDb.__miningDb = sqlite
    } catch (err) {
      throw new Error(
        `Could not open SQLite database at ${file}. ` +
          `Run \`npm run db:seed\` to create it. (${err instanceof Error ? err.message : String(err)})`,
      )
    }
  }
  return globalForDb.__miningDb
}

export const db: BetterSQLite3Database = drizzle(getSQLite())

export { tables }
