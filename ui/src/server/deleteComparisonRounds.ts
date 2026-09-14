import fs from 'fs/promises';
import path from 'path';
import { encoderIdentity } from '@/utils/encoderIdentity';
import { parentFolder } from '@/utils/comparisonRanking';
import { readResults, forgetRound } from './comparisonLedger';

export async function deleteComparisonRounds(ids: string[], folder: string, encoder: string | null, roots: string[]) {
  const records = await readResults();
  const deletedRoundIds: string[] = [];
  const failedRoundIds: string[] = [];
  const realRoots = await Promise.all(roots.map(r => fs.realpath(r).catch(() => null)));
  const within = (file: string, root: string) => {
    const relative = path.relative(root, file);
    return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
  };
  for (const id of [...new Set(ids)]) {
    const items = records.filter(r => r.round?.id === id);
    // A round is indivisible: refuse IDs containing records outside the confirmed scope.
    if (!items.length || items.some(r =>
      (r.round?.folder?.replace(/\\/g, '/') || parentFolder(r.generation?.model?.loras?.[0]?.path || '')) !== folder ||
      (encoder !== null && encoderIdentity(r) !== encoder))) {
      failedRoundIds.push(id); continue;
    }
    try {
      for (const item of items) {
        const resolved = path.resolve(item.path);
        if (!roots.some(root => within(resolved, path.resolve(root)))) throw Error('Outside inference output');
        try {
          const real = await fs.realpath(resolved);
          if (!realRoots.some(root => root && within(real, root))) throw Error('Unsafe output link');
          if (!(await fs.lstat(resolved)).isFile()) throw Error('Not a regular output file');
          await fs.unlink(resolved);
        } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
      }
      await forgetRound(id);
      deletedRoundIds.push(id);
    } catch { failedRoundIds.push(id); }
  }
  return { deletedRoundIds, failedRoundIds };
}
