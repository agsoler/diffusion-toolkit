export const parentFolder = (p: string) => p.replace(/[\\/][^\\/]+$/, '').replace(/\\/g, '/');
export type Standing = { key: string; name: string; path: string; strength?: number; kept: number; total: number; rank: number };
export function rankResults(results: any[], folder: string, overall: boolean, rate: boolean): Standing[] {
  const groups = new Map<string, Standing>();
  for (const r of results) {
    if (r.round?.kind !== 'compare') continue;
    const loras = r.generation?.model?.loras || [];
    // Stacked LoRAs cannot attribute a vote to one checkpoint. Baselines are reference only.
    if (loras.length !== 1) continue;
    const l = loras[0];
    if (folder && parentFolder(l.path) !== folder) continue;
    const strength = Number(l.strength ?? 1);
    const key = JSON.stringify([l.path.replace(/\\/g, '/'), overall ? null : strength]);
    const g = groups.get(key) || { key, name: l.path.split(/[\\/]/).pop(), path: l.path, strength: overall ? undefined : strength, kept: 0, total: 0, rank: 0 };
    g.total++; if (!r.deleted) g.kept++;
    groups.set(key, g);
  }
  const score = (g: Standing) => rate ? g.kept / g.total : g.kept;
  const rows = [...groups.values()].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name) || (a.strength ?? 0) - (b.strength ?? 0));
  rows.forEach((g, i) => { g.rank = i && score(g) === score(rows[i - 1]) ? rows[i - 1].rank : i + 1; });
  return rows;
}
