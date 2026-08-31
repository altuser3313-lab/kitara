import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.resolve(here, '../../.data');

let driver = null;

async function connect() {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      connectionString: url,
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    });
    await pool.query('SELECT 1');
    return {
      kind: `postgres (${new URL(url).host})`,
      query: (sql, params = []) => pool.query(sql, params),
      exec: async (sql) => { await pool.query(sql); },
      close: () => pool.end()
    };
  }

  const { PGlite } = await import('@electric-sql/pglite');
  fs.mkdirSync(dataDir, { recursive: true });
  const pglite = new PGlite(path.join(dataDir, 'pg'));
  await pglite.waitReady;
  return {
    kind: 'pglite (embedded, ./server/.data/pg)',
    query: (sql, params = []) => pglite.query(sql, params),
    exec: (sql) => pglite.exec(sql),
    close: () => pglite.close()
  };
}

export async function getDb() {
  if (!driver) driver = await connect();
  return driver;
}

export async function query(sql, params = []) {
  const db = await getDb();
  const result = await db.query(sql, params);
  return result.rows ?? [];
}

export async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql) {
  const db = await getDb();
  return db.exec(sql);
}
