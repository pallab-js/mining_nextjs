import { runSeed, type SeedStats } from '../src/lib/db/seed'

const stats: SeedStats = runSeed()
console.log('✓ seeded data/mining.db with demo dataset:')
for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(16)} ${v}`)
