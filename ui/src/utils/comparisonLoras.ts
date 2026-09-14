export type ComparisonLora = { path: string; strength?: number; [key: string]: any };
export const normalizedLoraPath = (value: string) => {
  const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '');
  return /^[a-z]:\//i.test(normalized) || normalized.startsWith('//') ? normalized.toLowerCase() : normalized;
};
export function supportingLoras(loras: ComparisonLora[], trainingFolder: string, comparisonFolder: string) {
  if (!trainingFolder) throw Error('Training folder is unavailable; cannot select supporting LoRAs.');
  const inside = (file: string, root: string) => {
    const p = normalizedLoraPath(file), r = normalizedLoraPath(root);
    return p === r || p.startsWith(r + '/');
  };
  return loras.filter(l => !l.disabled && !inside(l.path, trainingFolder) && !inside(l.path, comparisonFolder));
}
export function comparisonCandidate(record: any): ComparisonLora | null {
  if (record.round?.kind !== 'compare') return null;
  const loras: ComparisonLora[] = record.generation?.model?.loras || [];
  if (Object.prototype.hasOwnProperty.call(record.round, 'candidate')) {
    const candidate = record.round.candidate;
    if (!candidate) return null;
    const matches = loras.filter(l => normalizedLoraPath(l.path) === normalizedLoraPath(candidate.path) && Number(l.strength ?? 1) === Number(candidate.strength ?? 1));
    return matches.length === 1 ? matches[0] : null;
  }
  return loras.length === 1 ? loras[0] : null;
}
export function comparisonFolder(record: any): string {
  if (record.round?.kind !== 'compare') return '';
  if (record.round.folder) return record.round.folder.replace(/\\/g, '/');
  const candidate = comparisonCandidate(record);
  return candidate ? candidate.path.replace(/[\\/][^\\/]+$/, '').replace(/\\/g, '/') : '';
}
