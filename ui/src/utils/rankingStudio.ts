import { parentFolder, rankResults, Standing } from './comparisonRanking';
import { comparisonCandidate, comparisonFolder } from './comparisonLoras';

export type EvidenceRecord = {
  path: string;
  deleted?: boolean;
  historical?: boolean;
  round?: { id: string; folder?: string; kind?: 'compare' | 'manual'; candidate?: { path: string; strength?: number } | null };
  generation?: {
    model?: { te_name_or_path?: string; loras?: { path: string; strength?: number }[] };
    sample?: { prompt?: string; seed?: number };
  };
};
export const normalPath = (path: string) => path.replace(/\\/g, '/');
export function candidateKey(path: string, strength: number) {
  return JSON.stringify([normalPath(path), strength]);
}
export function shortCheckpoint(path: string) {
  const name = path
    .split(/[\\/]/)
    .pop()!
    .replace(/\.safetensors$/, '');
  const step = name.match(/_(\d+)$/);
  return step ? `Step ${Number(step[1])}` : name;
}
export function studioData(records: EvidenceRecord[], folder: string) {
  const scoped = records.filter(r => {
    if (r.round?.kind !== 'compare') return false;
    return comparisonFolder(r) === folder;
  });
  const combinations = rankResults(records, folder, false, false);
  const paths = [...new Set(combinations.map(r => r.path))].sort((a, b) => {
    const step = (p: string) => Number(p.match(/_(\d+)\.safetensors$/)?.[1] ?? Number.MAX_SAFE_INTEGER);
    return step(a) - step(b) || a.localeCompare(b);
  });
  const strengths = [...new Set(combinations.map(r => r.strength!))].sort((a, b) => a - b);
  const cells = new Map(combinations.map(r => [r.key, r]));
  return { scoped, combinations, paths, strengths, cells };
}
export function evidenceFor(records: EvidenceRecord[], candidate: Standing | undefined, prompt = '') {
  if (!candidate) return [];
  return records.filter(r => {
    if (r.round?.kind !== 'compare') return false;
    const candidateLora = comparisonCandidate(r);
    return (
      !r.deleted &&
      candidateLora !== null &&
      normalPath(candidateLora.path) === normalPath(candidate.path) &&
      (candidate.strength === undefined || Number(candidateLora.strength ?? 1) === candidate.strength) &&
      (!prompt || r.generation?.sample?.prompt === prompt)
    );
  });
}
