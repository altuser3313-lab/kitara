import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, exec, query } from './index.js';
import { hashPassword } from '../auth.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'katara1234';

export async function resetDatabase({ quiet = false } = {}) {
  const db = await getDb();
  const log = (...args) => { if (!quiet) console.log(...args); };

  log(`> driver: ${db.kind}`);

  await exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));
  log('> schema applied');

  await exec(fs.readFileSync(path.join(here, 'seed.sql'), 'utf8'));
  log('> seed data loaded');

  const users = await query("SELECT id, email FROM users WHERE password_hash = ':demo'");
  for (const user of users) {
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(DEMO_PASSWORD), user.id]);
  }
  log(`> ${users.length} demo accounts hashed (password: ${DEMO_PASSWORD})`);

  const counts = await query(`
    SELECT 'pharmacies' AS table, count(*)::int AS rows FROM pharmacies
    UNION ALL SELECT 'medications', count(*)::int FROM medications
    UNION ALL SELECT 'pharmacy_inventory', count(*)::int FROM pharmacy_inventory
    UNION ALL SELECT 'users', count(*)::int FROM users
    UNION ALL SELECT 'reservations', count(*)::int FROM reservations
    UNION ALL SELECT 'prescriptions', count(*)::int FROM prescriptions
    UNION ALL SELECT 'pharmacy_verifications', count(*)::int FROM pharmacy_verifications
    ORDER BY 1
  `);
  return counts;
}

export async function isEmpty() {
  const rows = await query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacies'"
  );
  return (rows[0]?.n ?? 0) === 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('reset.js')) {
  const counts = await resetDatabase();
  console.table(counts);
  process.exit(0);
}
