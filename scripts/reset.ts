import { runReset } from '../src/lib/db/seed'

runReset()
console.log('✓ data/mining.db reset to an empty (but schema-valid) database')
