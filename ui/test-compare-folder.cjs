const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const src = ts.createSourceFile('page.tsx', fs.readFileSync('src/app/generate/page.tsx', 'utf8'), 99, true, 4);
let fn;
function visit(n) {
  if (ts.isVariableDeclaration(n) && n.name.getText(src) === 'generate') fn = n.initializer.getText(src);
  ts.forEachChild(n, visit);
}
visit(src);
assert.ok(fn);
const code = ts.transpileModule('globalThis.run = ' + fn, { compilerOptions: { target: 7 } }).outputText;
async function test(mode, sweep = true) {
  const requests = []; const errors = []; let ended = false; let controller;
  const noop = () => {};
  const ctx = {
    ready: mode !== 'stopped', running: false,
    apiClient: { get: async () => ({ data: { ZIMAGE_TEXT_ENCODER: 'test-encoder.safetensors' } }) },
    model: { name_or_path: 'base', loras: [{ path: 'old', strength: 0.2 }] },
    arch: 'zimage:turbo', sample: { prompt: 'fixed', seed: -1, width: 768, height: 1024 },
    activeLoras: [{ path: 'old', strength: 0.2 }],
    beginRun: () => (controller = new AbortController()),
    endRun: () => { ended = true; }, setStatusLine: noop, setSweepProgress: noop, setProgress: noop,
    setError: e => errors.push(e), previewSizeRef: {}, requestIdRef: {},
    crypto: { randomUUID: () => 'test-round', getRandomValues: a => { a[0] = 123; return a; } }, Uint32Array,
    parentFolder: p => p.replace(/[\\/][^\\/]+$/, ''),
    proxy: x => x, authHeaders: () => ({}), localStorage: { setItem: noop },
    fetch: async (_, opts) => { requests.push(JSON.parse(opts.body)); return { ok: true, headers: { get: () => 'id' } }; },
    consumeStream: async () => { if (mode === 'cancel') controller.abort(); if (mode === 'error') throw Error('failure'); },
  };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const files = Array.from({ length: 4 }, (_, i) => ({ path: `checkpoint${i}`, name: `checkpoint${i}` }));
  await ctx.run(sweep ? { files, baseline: true } : undefined);
  if (mode === 'stopped') { assert.equal(requests.length, 0); return; }
  assert.ok(ended);
  assert.equal(ctx.model.loras[0].path, 'old');
  if (mode === 'cancel' || mode === 'error') { assert.equal(requests.length, 1); assert.equal(errors.length, mode === 'error' ? 1 : 0); return; }
  if (!sweep) { assert.equal(requests.length, 1); assert.equal(requests[0].model.loras[0].path, 'old'); return; }
  assert.equal(requests.length, 13);
  assert.equal(requests[0].model.loras.length, 0);
  requests.forEach(r => { assert.equal(r.model.te_name_or_path, 'test-encoder.safetensors'); assert.equal(r.sample.seed, 123); assert.equal(r.sample.prompt, 'fixed'); });
  for (let i = 1; i < 13; i++) {
    assert.equal(requests[i].model.loras.length, 1);
    assert.equal(requests[i].model.loras[0].strength, [0.6, 0.8, 1][(i - 1) % 3]);
    assert.equal(requests[i].model.loras[0].path, `checkpoint${Math.floor((i - 1) / 3)}`);
  }
}
(async () => {
  for (const mode of ['normal', 'cancel', 'error', 'stopped']) await test(mode);
  await test('normal', false);
  console.log('PASS: 13-image plan, strengths, fixed seed, isolation, cancellation, failure, stopped-engine guard, normal generation');
})().catch(e => { console.error(e); process.exit(1); });
