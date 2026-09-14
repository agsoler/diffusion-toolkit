'use client';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { apiClient } from '@/utils/api';
import { LoraPick } from './LoraBrowserModal';

export default function CompareFolderModal({ isOpen, onClose, onRun }: {
  isOpen: boolean; onClose: () => void; onRun: (files: LoraPick[], baseline: boolean) => void;
}) {
  const [folders, setFolders] = useState<Record<string, LoraPick[]>>({});
  const [folder, setFolder] = useState('');
  const [baseline, setBaseline] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true); setError('');
    apiClient.get('/api/loras').then(({ data }) => {
      if (!active) return;
      const groups: Record<string, LoraPick[]> = {};
      const files = [...(data.jobs || []).flatMap((j: any) => j.files), ...(data.models || [])];
      for (const f of files) {
        const parent = f.path.replace(/[\\/][^\\/]+$/, '');
        const group = groups[parent] ||= [];
        if (!group.some(x => x.path === f.path)) group.push({ name: f.name, path: f.path });
      }
      Object.values(groups).forEach(g => g.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
      setFolders(groups);
      setFolder(old => groups[old] ? old : Object.keys(groups)[0] || '');
    }).catch(() => { if (active) setError('Could not load LoRA folders. Close and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen]);
  const files = folders[folder] || [];
  return <Modal isOpen={isOpen} onClose={onClose} title="Compare LoRA folder" size="lg">
    <div className="space-y-4 text-sm text-gray-200">
      <p>Each checkpoint runs alone at 0.6, 0.8 and 1.0. Current panel LoRAs are replaced for the sweep only; the prompt and other settings stay fixed.</p>
      <label className="block">Folder
        <select aria-label="LoRA folder" className="mt-1 w-full bg-gray-950 border border-gray-600 rounded p-2" value={folder} onChange={e => setFolder(e.target.value)} disabled={loading}>
          {Object.keys(folders).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {loading && <p>Loading folders…</p>}
      {error && <p role="alert" className="text-red-400">{error}</p>}
      {!loading && !error && !files.length && <p>No checkpoints found. Folders come from training jobs and the configured models/loras directory.</p>}
      <ul className="max-h-40 overflow-auto text-xs font-mono">{files.map(f => <li key={f.path}>{f.name}</li>)}</ul>
      <label className="flex gap-2"><input type="checkbox" checked={baseline} onChange={e => setBaseline(e.target.checked)} />Include a no-LoRA baseline</label>
      <p>{files.length} checkpoints · {files.length * 3 + (baseline ? 1 : 0)} images. A random seed is chosen once if the panel seed is -1. Use checkpoints compatible with the selected base model.</p>
      <p className="text-gray-400">Keep this tab open. Cancel stops the sweep; refreshing discards pending comparisons. Completed images stay in history.</p>
      <button disabled={loading || !!error || !files.length} className="rounded bg-blue-700 px-4 py-2 disabled:opacity-40" onClick={() => { onRun(files, baseline); onClose(); }}>Start comparison</button>
    </div>
  </Modal>;
}
