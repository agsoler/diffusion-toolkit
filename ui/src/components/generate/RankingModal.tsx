'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Grid2X2, Images, RefreshCw, X, List } from 'lucide-react';
import RoundsView from './RoundsView';
import { comparisonFolder } from '@/utils/comparisonLoras';
import { apiClient } from '@/utils/api';
import { encodeFilePathForUrl } from '@/utils/basic';
import { parentFolder, rankResults, Standing } from '@/utils/comparisonRanking';
import { saveComparisonHistory } from '@/utils/comparisonHistory';
import {
  candidateKey,
  evidenceFor,
  EvidenceRecord,
  normalPath,
  shortCheckpoint,
  studioData,
} from '@/utils/rankingStudio';
import './RankingStudio.css';
import { encoderIdentity } from '@/utils/encoderIdentity';

const views = ['Heatmap', 'Evidence board', 'Rounds'];
const percentage = (r: Standing) => Math.round((100 * r.kept) / r.total);
const label = (r: Standing) =>
  `${shortCheckpoint(r.path)}${r.strength === undefined ? ' · all strengths' : ` · ${r.strength}`}`;
type Props = { isOpen: boolean; onClose: () => void; history: EvidenceRecord[]; running?: boolean; onForgetRounds: (ids: string[]) => void };

export default function RankingModal({ isOpen, onClose, history, running = false, onForgetRounds }: Props) {
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [separateEncoders, setSeparateEncoders] = useState(true);
  const [encoder, setEncoder] = useState('');
  const [folder, setFolder] = useState('');
  const [view, setView] = useState(0);
  const [overall, setOverall] = useState(false);
  const [rate, setRate] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [visibleImages, setVisibleImages] = useState(12);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const historyRef = useRef(history);
  historyRef.current = history;
  const request = useRef(0);
  const refresh = async () => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      await saveComparisonHistory(historyRef.current);
      const { data } = await apiClient.get('/api/comparison-ledger');
      const { data: settings } = await apiClient.get('/api/settings');
      if (request.current !== id) return;
      onForgetRounds(data.forgottenRoundIds || []);
      setSeparateEncoders(settings.RANKINGS_SEPARATE_ENCODERS !== 'false');
      setRecords(data.results.filter((r: EvidenceRecord) => r.round?.kind === 'compare'));
      setLoaded(true);
      const availableFolders = [...new Set<string>(data.results.map(comparisonFolder).filter(Boolean))];
      const latest = historyRef.current.find(r => r.round?.kind === 'compare' && r.round.folder && availableFolders.includes(normalPath(r.round.folder)));
      const first = latest || data.results.find((r: EvidenceRecord) => comparisonFolder(r));
      setFolder(
        old =>
          (availableFolders.includes(old) ? old : '') ||
          (first?.round?.folder
            ? normalPath(first.round.folder)
            : first?.generation?.model?.loras?.[0]
              ? parentFolder(first.generation.model.loras[0].path)
              : ''),
      );
    } catch {
      if (request.current === id)
        setError(
          'Could not refresh rankings. Any displayed results are from the last successful refresh. Retry to include recent changes.',
        );
    } finally {
      if (request.current === id) setLoading(false);
    }
  };
  useEffect(() => {
    if (isOpen) void refresh();
    return () => {
      request.current++;
    };
  }, [isOpen]);
  useEffect(() => {
    setPrompt('');
    setVisibleImages(12);
  }, [folder, selectedKey, encoder, separateEncoders]);
  const folders = useMemo(
    () => [...new Set(records.map(comparisonFolder).filter(Boolean))].sort(),
    [records],
  );
  const encoders = [...new Set(records.filter(r => comparisonFolder(r) === folder).map(encoderIdentity))].sort();
  const activeEncoder = encoders.includes(encoder) ? encoder : encoders[0] || '';
  const encoderControl = separateEncoders ? <label className="flex items-center gap-2">Text encoder
    <select aria-label="Ranking text encoder" value={activeEncoder} onChange={e => setEncoder(e.target.value)} className="studio-select max-w-[480px]">
      {!encoders.length && <option value="">No encoder results</option>}
      {encoders.map(value => <option key={value} value={value}>{value.split('/').pop()}</option>)}
    </select>
  </label> : <span>All text encoders combined · change in Settings</span>;
  const filteredRecords = useMemo(() => separateEncoders ? records.filter(r => encoderIdentity(r) === activeEncoder) : records, [records, separateEncoders, activeEncoder]);
  const data = useMemo(() => studioData(filteredRecords, folder), [filteredRecords, folder]);
  const rows = useMemo(() => rankResults(filteredRecords, folder, overall, rate), [filteredRecords, folder, overall, rate]);
  const selected = data.cells.get(selectedKey) || data.combinations[0];
  const select = (r: Standing) => {
    if (r.strength === undefined) {
      const match = data.combinations.find(c => normalPath(c.path) === normalPath(r.path));
      if (match) setSelectedKey(match.key);
    } else setSelectedKey(r.key);
  };
  const evidence = evidenceFor(data.scoped, selected);
  const prompts = [...new Set(evidence.map(r => r.generation?.sample?.prompt || '').filter(Boolean))];
  const shownEvidence = evidenceFor(data.scoped, selected, prompt);
  const rounds = new Set(data.scoped.flatMap(r => (r.round?.id ? [r.round.id] : []))).size;
  const kept = data.scoped.filter(r => !r.deleted).length;
  const cycle = (direction: number) => setView(v => (v + direction + views.length) % views.length);
  const deleteRounds = async (ids: string[]) => {
    setLoading(true);
    setError('');
    try {
      // Explicit IDs freeze the confirmed scope; chunking keeps the number of rounds unbounded.
      for (let i = 0; i < ids.length; i += 500) {
        const { data: result } = await apiClient.post('/api/comparison-ledger/rounds', { roundIds: ids.slice(i, i + 500), folder, encoder: separateEncoders ? activeEncoder : null });
        onForgetRounds(result.deletedRoundIds);
        setRecords(old => old.filter(r => !result.deletedRoundIds.includes(r.round?.id)));
        if (result.failedRoundIds.length) throw Error('Some rounds could not be completely deleted. Their history is retained; refresh and retry.');
      }
    } catch (e: any) { setError(e?.response?.data?.error || e.message || 'Unable to delete rounds. Refresh and retry.'); }
    finally { setLoading(false); }
  };

  function Leaderboard() {
    return (
      <section>
        <div className="studio-kicker mb-4">
          {overall ? 'Leading checkpoints' : 'Leading combinations'} · {rate ? 'survival rate' : 'survivors'}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {rows.map(r => (
            <button
              key={r.key}
              onClick={() => select(r)}
              title={r.path}
              className={`studio-leader ${selected && normalPath(selected.path) === normalPath(r.path) && (overall || selected.strength === r.strength) ? 'chosen' : ''}`}
            >
              <span className="studio-mono studio-muted">#{r.rank}</span>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between gap-3">
                  <span className="truncate">{label(r)}</span>
                  <b className="shrink-0">
                    {r.kept}/{r.total}
                  </b>
                </div>
                <div className="studio-track mt-2">
                  <span style={{ width: `${percentage(r)}%` }} />
                </div>
                <div className="studio-muted text-[10px] mt-1">
                  {percentage(r)}% surviving{r.total < 3 ? ' · small sample' : ''}
                </div>
              </div>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </section>
    );
  }
  function Evidence() {
    return (
      <section className="studio-evidence">
        <div className="studio-kicker">Inspect the evidence</div>
        <h3 className="mt-2">{selected ? label(selected) : 'Choose a combination'}</h3>
        <p className="studio-muted text-xs my-3">
          {selected
            ? `${selected.kept} survivors / ${selected.total} attempts. Actual images from this combination.`
            : ''}
        </p>
        <div className="grid gap-2 grid-cols-3">
          {evidence.slice(0, 3).map(r => (
            <a
              key={r.path}
              href={`/api/files/${encodeFilePathForUrl(r.path)}`}
              target="_blank"
              rel="noreferrer"
              title={r.generation?.sample?.prompt || 'Open survivor'}
            >
              <img
                loading="lazy"
                src={`/api/files/${encodeFilePathForUrl(r.path)}`}
                alt={r.generation?.sample?.prompt || 'Surviving generated image'}
                className="w-full aspect-[3/4] object-contain rounded-sm"
              />
            </a>
          ))}
        </div>
        {!evidence.length && <p className="studio-muted text-sm py-5">No surviving images for this combination.</p>}
      </section>
    );
  }
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-7">
        <DialogPanel
          className="relative w-full h-full max-w-[1600px] rounded-2xl overflow-hidden shadow-2xl border border-white/15"
          onKeyDown={e => {
            const target = e.target as HTMLElement;
            if (target.closest('input,textarea,select,[contenteditable]')) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              cycle(e.key === 'ArrowRight' ? 1 : -1);
            }
          }}
        >
          <div className={`ranking-studio variant-${['A', 'C', 'A'][view]}`}>
            <button
              onClick={onClose}
              aria-label="Close rankings and return to Generate"
              title="Return to Generate (Esc)"
              className="studio-close"
              data-autofocus
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-4 border-b border-[var(--line)] pb-5 pr-16">
              <span className="studio-kicker">Comparison studio · your eye, your verdict</span>
              <button
                onClick={refresh}
                disabled={loading}
                aria-label="Refresh rankings"
                title="Refresh rankings"
                className="studio-muted p-2"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <span role="status" className="studio-muted text-xs">
                {loading ? 'Refreshing evidence…' : loaded ? 'Snapshot of current survivors · no GPU required' : ''}
              </span>
            </div>
            <header className="py-7 border-b border-[var(--line)] mb-6">
              <DialogTitle as="h1">
                {view === 0
                  ? 'The sweet spot, at a glance.'
                  : view === 1 ? 'The images have the last word.' : 'Rounds'}
              </DialogTitle>
              <div className="flex gap-5 items-end mt-6">
                <label className="studio-kicker flex-1 min-w-0">
                  LoRA output folder under test
                  <select
                    aria-label="Ranking folder"
                    value={folder}
                    onChange={e => {
                      setFolder(e.target.value);
                      setSelectedKey('');
                    }}
                    className="studio-select block w-full mt-2 text-sm normal-case tracking-normal"
                  >
                    {!folders.length && <option value="">No recorded folders</option>}
                    {folders.map(f => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={view === 2 ? 'hidden' : 'studio-kicker'}>
                  Leaderboard grouping
                  <select
                    aria-label="Leaderboard grouping"
                    hidden={view === 2}
                    value={overall ? 'overall' : 'combination'}
                    onChange={e => setOverall(e.target.value === 'overall')}
                    className="studio-select block mt-2 text-sm normal-case tracking-normal"
                  >
                    <option value="combination">Checkpoint + strength</option>
                    <option value="overall">Checkpoint overall</option>
                  </select>
                </label>
                <label className={view === 2 ? 'hidden' : 'studio-kicker'}>
                  Rank by
                  <select
                    aria-label="Rank by"
                    hidden={view === 2}
                    value={rate ? 'rate' : 'survivors'}
                    onChange={e => setRate(e.target.value === 'rate')}
                    className="studio-select block mt-2 text-sm normal-case tracking-normal"
                  >
                    <option value="survivors">Most survivors</option>
                    <option value="rate">Highest survival rate</option>
                  </select>
                </label>
              </div>
              <p className="studio-muted text-xs mt-4">
                {rounds} tracked rounds · {data.scoped.length} generated · {kept} surviving ·{' '}
                {data.scoped.length - kept} rejected.{view !== 2 && ' Keep comparing; there is no fixed trial count.'}
              </p>
            </header>
            {error && (
              <p role="alert" className="text-red-500 mb-5">
                {error}
              </p>
            )}
            {view !== 2 && <div className="studio-muted text-xs mb-4 flex items-center gap-4">
              {view !== 2 && <span>Only Compare folder runs count. Manual generations are excluded.</span>}
              {encoderControl}
            </div>}
            {view !== 2 && new Set(rows.map(r => r.total)).size > 1 && (
              <p className="studio-muted text-xs mb-5">
                Unequal exposure: compare attempt counts. More trials can produce more survivors without a higher
                survival rate.
              </p>
            )}
            {view === 2 ? <RoundsView records={data.scoped} folder={folder} encoder={separateEncoders ? activeEncoder : null} disabled={loading || running} onDelete={deleteRounds} encoderControl={encoderControl}/> : !rows.length ? (
              <p className="studio-muted py-16 text-center">
                {loading
                  ? 'Loading comparisons…'
                  : 'No single-LoRA results in this folder yet. Run Compare, remove the rejects, then return here.'}
              </p>
            ) : (
              <>
                {view === 0 && (
                  <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(270px,1fr)] gap-10">
                    <section>
                      <div className="flex justify-between mb-7">
                        <div>
                          <div className="studio-kicker">01 / Map the sweet spot</div>
                          <h2>Where the style holds.</h2>
                        </div>
                        <span className="studio-muted text-xs">
                          Survivors / attempts
                          <br />
                          Colour = survival rate
                        </span>
                      </div>
                      <div className="overflow-auto max-h-[650px] p-1 pr-5 [scrollbar-gutter:stable]">
                        <div
                          className="grid gap-2"
                          style={{
                            gridTemplateColumns: `110px repeat(${data.strengths.length}, minmax(105px, 1fr))`,
                          }}
                        >
                          <span className="studio-kicker self-end pb-3">Checkpoint</span>
                          {data.strengths.map(s => (
                            <span key={s} className="studio-mono text-center pb-3">
                              {s} strength
                            </span>
                          ))}
                          {data.paths.map(path => (
                            <div key={path} className="contents">
                              <div title={path} className="self-center studio-mono text-xs break-words pr-2">
                                {shortCheckpoint(path)}
                              </div>
                              {data.strengths.map(s => {
                                const cell = data.cells.get(candidateKey(path, s));
                                const pct = cell ? percentage(cell) : 0;
                                return (
                                  <button
                                    key={s}
                                    disabled={!cell}
                                    onClick={() => cell && select(cell)}
                                    aria-label={`${shortCheckpoint(path)}, strength ${s}: ${cell ? `${cell.kept} of ${cell.total} surviving` : 'not tested'}`}
                                    aria-pressed={cell?.key === selected?.key}
                                    className={`studio-cell ${cell?.key === selected?.key ? 'chosen' : ''}`}
                                    style={{
                                      background: `color-mix(in srgb, #c4ed84 ${pct * 0.8}%, #202621)`,
                                      color: pct >= 60 ? '#182310' : '#ecf6e3',
                                    }}
                                  >
                                    {cell ? (
                                      <>
                                        <strong>
                                          {cell.kept}
                                          <small>/{cell.total}</small>
                                        </strong>
                                        <span>{pct}% survive</span>
                                      </>
                                    ) : (
                                      <span>Not tested</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="studio-muted text-xs mt-5">
                        Untested settings are blank, not failures. Every completed image counts once.
                      </p>
                    </section>
                    <aside className="border-l border-[var(--line)] pl-8">
                      <Leaderboard />
                      <div className="mt-8 pt-7 border-t border-[var(--line)]">
                        <Evidence />
                      </div>
                    </aside>
                  </div>
                )}
                {view === 1 && (
                  <>
                    <div className="flex justify-between items-end mb-7">
                      <div>
                        <div className="studio-kicker">02 / The contact sheet</div>
                        <h2>Show me what survived.</h2>
                      </div>
                      <label className="text-xs studio-muted w-[480px] min-w-0 shrink-0">
                        Filter evidence by prompt
                        <select
                          aria-label="Evidence prompt"
                          value={prompt}
                          onChange={e => {
                            setPrompt(e.target.value);
                            setVisibleImages(12);
                          }}
                          className="studio-select block mt-2 max-w-[480px]"
                        >
                          <option value="">All prompts</option>
                          {prompts.map(p => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-9">
                      <section>
                        <div className="grid grid-cols-3 gap-5">
                          {shownEvidence.slice(0, visibleImages).map(r => (
                            <a
                              key={r.path}
                              className="studio-print"
                              href={`/api/files/${encodeFilePathForUrl(r.path)}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open full image"
                            >
                              <img
                                loading="lazy"
                                src={`/api/files/${encodeFilePathForUrl(r.path)}`}
                                alt={r.generation?.sample?.prompt || 'Surviving generated image'}
                                className="w-full aspect-[3/4] object-contain"
                              />
                              <div className="text-sm pt-3">{selected && label(selected)}</div>
                              <p className="text-[11px] mt-2 line-clamp-3" title={r.generation?.sample?.prompt}>
                                {r.generation?.sample?.prompt}
                              </p>
                              <p className="text-[10px] mt-2">
                                Seed {r.generation?.sample?.seed ?? 'unknown'} ·{' '}
                                {r.round ? 'Tracked round' : 'Imported history'}
                              </p>
                            </a>
                          ))}
                        </div>
                        {!shownEvidence.length && (
                          <p className="studio-muted py-10">No surviving images for this selection.</p>
                        )}
                        {shownEvidence.length > visibleImages && (
                          <button className="studio-pill mt-6" onClick={() => setVisibleImages(n => n + 12)}>
                            Show more ({shownEvidence.length - visibleImages} remaining)
                          </button>
                        )}
                      </section>
                      <aside className="border-l border-[var(--line)] pl-7">
                        <div className="studio-kicker">Pinned for inspection</div>
                        <h2 className="mt-3 break-words">{selected && shortCheckpoint(selected.path)}</h2>
                        <div className="text-5xl font-serif my-4">
                          {selected?.strength}
                          <small className="text-sm studio-muted ml-2">strength</small>
                        </div>
                        <p className="studio-muted text-sm mb-6">
                          {selected?.kept} survivors in {selected?.total} attempts. Prompt filtering changes the images
                          shown, not the overall ranking.
                        </p>
                        <Leaderboard />
                      </aside>
                    </div>
                  </>
                )}
              </>
            )}
            <p hidden={view === 2} className="studio-muted text-xs mt-8 border-t border-[var(--line)] pt-4">
              Ties stay tied, including the top three. Baselines are included in summary counts but do not compete;
              supporting LoRAs do not compete. Unattributed legacy stacks are excluded. Images still present are votes—not objective quality scores.
              Close, cull, compare and reopen to update.
            </p>
            <nav
              aria-label="Ranking visualisations"
              className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full border border-white/20 bg-[#080b0c] text-white px-4 py-3 shadow-2xl"
            >
              <button onClick={() => cycle(-1)} aria-label="Previous visualisation">
                <ArrowLeft size={18} />
              </button>
              {[Grid2X2, Images, List].map((Icon, i) => (
                <button
                  key={views[i]}
                  onClick={() => setView(i)}
                  aria-pressed={view === i}
                  title={views[i]}
                  className={`flex gap-2 items-center rounded-full px-3 py-1 text-sm ${view === i ? 'bg-white/15' : 'text-gray-400'}`}
                >
                  <Icon size={16} />
                  {view === i && views[i]}
                </button>
              ))}
              <button onClick={() => cycle(1)} aria-label="Next visualisation">
                <ArrowRight size={18} />
              </button>
            </nav>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
