const ts = require('typescript'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm'), assert = require('node:assert/strict');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'aitk-rounds-test-'));
const root = path.join(scratch, 'outputs'); fs.mkdirSync(root);
const load = (file, imports = {}) => {
  const ctx = { exports: {}, console, require: name => imports[name] || require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: 7, module: 1, esModuleInterop: true } }).outputText, ctx);
  return ctx.exports;
};
const ledger = load('src/server/comparisonLedger.ts', {'@/paths': { TOOLKIT_ROOT: scratch }});
const ranking = load('src/utils/comparisonRanking.ts');
const encoder = load('src/utils/encoderIdentity.ts');
const service = load('src/server/deleteComparisonRounds.ts', {'./comparisonLedger': ledger, '@/utils/comparisonRanking': ranking, '@/utils/encoderIdentity': encoder});
function record(id, file, folder='D:/LoRA/A', te='custom', loras=true) {
  return { path: file, round: { id, folder, kind:'compare' }, generation:{model:{ te_name_or_path:te, loras:loras?[{path:folder+'/750.safetensors',strength:.6}]:[]},sample:{prompt:'test'}} };
}
async function main() {
  const file = name => { const p=path.join(root,name); fs.writeFileSync(p,'fixture'); return p; };
  const kept=record('one',file('kept.png')), baseline=record('one',file('baseline.png'),'D:/LoRA/A','custom',false);
  const rejected=record('one',path.join(root,'already-gone.png'));
  const stock=record('stock',file('stock.png'),'D:/LoRA/A','');
  const other=record('other',file('other.png'),'D:/LoRA/B');
  await ledger.recordResults([kept,baseline,rejected,stock,other]);
  let result=await service.deleteComparisonRounds(['stock','other'],'D:/LoRA/A','custom',[root]);
  assert.equal(result.deletedRoundIds.length,0); assert.equal(result.failedRoundIds.length,2);
  assert.ok(fs.existsSync(stock.path)); assert.ok(fs.existsSync(other.path));
  result=await service.deleteComparisonRounds(['one'],'D:/LoRA/A','custom',[root]);
  assert.equal(result.deletedRoundIds[0],'one'); assert.equal(result.failedRoundIds.length,0);
  assert.equal(fs.existsSync(kept.path),false); assert.equal(fs.existsSync(baseline.path),false);
  await Promise.all([ledger.recordResults([kept,baseline,rejected]),ledger.recordResults([kept])]);
  assert.equal((await ledger.readResults()).some(r=>r.round.id==='one'),false);
  const outside=path.join(scratch,'protected.txt');fs.writeFileSync(outside,'keep');
  await ledger.recordResults([record('unsafe',outside)]);
  result=await service.deleteComparisonRounds(['unsafe'],'D:/LoRA/A','custom',[root]);
  assert.equal(result.failedRoundIds[0],'unsafe');assert.equal(fs.readFileSync(outside,'utf8'),'keep');
  assert.ok((await ledger.readResults()).some(r=>r.round.id==='unsafe'));
  result=await service.deleteComparisonRounds(['stock'],'D:/LoRA/A',null,[root]);
  assert.equal(result.deletedRoundIds[0],'stock');assert.ok(fs.existsSync(other.path));
  assert.equal((await ledger.forgottenRoundIds()).length,2);
  console.log('PASS round deletion: scoped encoder/folder, baseline, missing file, stale replay, unsafe path, bulk scope, retained failure history');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
