'use client';
import { useMemo, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Trash2 } from 'lucide-react';
import { EvidenceRecord } from '@/utils/rankingStudio';
import { encoderIdentity } from '@/utils/encoderIdentity';

type Props = {
  records: EvidenceRecord[];
  folder: string;
  encoder: string | null;
  disabled: boolean;
  onDelete: (ids: string[]) => Promise<void>;
};
export default function RoundsView({ records, folder, encoder, disabled, onDelete }: Props) {
  const [pending, setPending] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const rounds = useMemo(() => {
    const groups = new Map<string, EvidenceRecord[]>();
    for (const r of records) {
      if (r.round?.kind !== 'compare' || !r.round.id) continue;
      groups.set(r.round.id, [...(groups.get(r.round.id) || []), r]);
    }
    return [...groups].map(([id, items]) => {
      const timestamp = items.map(r => Number(r.path.split(/[\\/]/).pop()?.match(/^(\d{13})_/)?.[1]) || 0).sort()[0];
      return { id, items, timestamp, kept: items.filter(r => !r.deleted).length, prompt: items[0].generation?.sample?.prompt || 'No prompt recorded' };
    }).sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  }, [records]);
  const targets = rounds.filter(r => pending?.includes(r.id));
  return <>
    <div className="flex justify-end mb-5">
      <button disabled={disabled || !rounds.length} className="studio-pill text-[#dc9186] inline-flex gap-2 items-center disabled:opacity-40"
        onClick={() => setPending(rounds.map(r => r.id))}><Trash2 size={15}/> Delete {rounds.length} rounds</button>
    </div>
    <div className="flex justify-between studio-kicker border-b border-[var(--line)] pb-3"><span>Round / prompt</span><span>Surviving / generated</span></div>
    {rounds.map((r, index) => <article key={r.id} className="flex gap-5 py-5 border-b border-[var(--line)]">
      <span className="studio-mono studio-muted text-sm pt-1">{String(index + 1).padStart(2, '0')}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words max-w-4xl">{r.prompt}</p>
        <p className="studio-mono studio-muted text-xs mt-3" title={r.id}>{r.timestamp ? new Date(r.timestamp).toLocaleString() : 'Date unavailable'}{encoder === null ? ` · ${encoderIdentity(r.items[0]).split('/').pop()}` : ''}</p>
      </div>
      <div className="text-right w-28 shrink-0"><div className="studio-mono text-xl">{r.kept}<span className="studio-muted text-sm"> / {r.items.length}</span></div>
        <div className="studio-track mt-3 mb-4"><span style={{width: `${r.kept / r.items.length * 100}%`}}/></div>
        <button disabled={disabled} aria-label={`Delete round ${index + 1}`} title="Delete round" className="p-2 text-[#dc9186] disabled:opacity-40" onClick={() => setPending([r.id])}><Trash2 size={16}/></button>
      </div>
    </article>)}
    {!rounds.length && <p className="studio-muted text-center py-16">No rounds in this view.</p>}
    {disabled && <p className="studio-muted text-xs mt-4">Round deletion is unavailable while generation or refresh is running.</p>}
    <Dialog open={pending !== null} onClose={() => { if (!busy) setPending(null); }} className="relative z-[100]" >
      <div className="fixed inset-0 bg-black/75"/>
      <div className="fixed inset-0 flex items-center justify-center p-8" onKeyDown={e => e.stopPropagation()}>
        <DialogPanel className="w-[540px] rounded-xl border border-gray-600 bg-gray-900 p-8 text-gray-100 shadow-2xl">
          <DialogTitle className="text-2xl font-serif">Delete {targets.length === 1 ? 'this round' : `${targets.length} rounds`}?</DialogTitle>
          <p className="text-gray-300 text-sm leading-relaxed mt-4">Delete {targets.reduce((n, r) => n + r.kept, 0)} surviving files and remove {targets.reduce((n, r) => n + r.items.length, 0)} attempts from all rankings. This cannot be undone.</p>
          <p className="text-sm mt-4 border-l-2 border-[#dc9186] pl-4 break-words">{folder}<br/>{encoder || 'All encoders'}<br/><span className="text-gray-400">Other rounds are untouched.</span></p>
          <div className="flex justify-end gap-3 mt-7">
            <button disabled={busy} className="px-4 py-2 rounded-lg border border-gray-600" onClick={() => setPending(null)}>Cancel</button>
            <button disabled={busy || disabled} className="px-4 py-2 rounded-lg bg-red-700 disabled:opacity-40" onClick={async () => {
              if (!pending) return;
              setBusy(true);
              try { await onDelete(pending); } finally { setBusy(false); setPending(null); }
            }}>{busy ? 'Deleting…' : 'Delete permanently'}</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </>;
}
