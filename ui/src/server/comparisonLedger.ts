import sqlite3 from 'sqlite3';
import path from 'path';
import { TOOLKIT_ROOT } from '@/paths';
import fs from 'fs/promises';

const db = new sqlite3.Database(path.join(TOOLKIT_ROOT, 'comparison_ledger.db'));
db.configure('busyTimeout', 5000);
const run = (sql: string, params: any[] = []) => new Promise<void>((resolve, reject) => db.run(sql, params, e => e ? reject(e) : resolve()));
const ready = run(`CREATE TABLE IF NOT EXISTS results (path TEXT PRIMARY KEY, payload TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`);
export async function recordResults(items: any[]) {
  await ready;
  for (const r of items) {
    if (r?.round?.kind !== 'compare') continue;
    if (!r || typeof r.path !== 'string' || !r.generation?.model || !r.generation?.sample) continue;
    await run('INSERT OR IGNORE INTO results(path,payload) VALUES (?,?)', [r.path, JSON.stringify(r)]);
  }
}
export async function readResults() {
  await ready;
  const rows = await new Promise<any[]>((resolve, reject) => db.all('SELECT * FROM results', (e, rows) => e ? reject(e) : resolve(rows)));
  const output = [];
  for (const row of rows) {
    let deleted = !!row.deleted;
    if (!deleted) {
      try { await fs.stat(row.path); } catch (e: any) {
        if (e.code === 'ENOENT') { deleted = true; await run('UPDATE results SET deleted=1 WHERE path=?', [row.path]); }
        else throw e;
      }
    }
    const record = JSON.parse(row.payload);
    if (record.round?.kind === 'compare') output.push({ ...record, deleted });
  }
  return output;
}
