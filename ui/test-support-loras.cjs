const ts=require('typescript'), fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(file){const c={exports:{},require:n=>n==='./comparisonLoras'?helpers:n==='./comparisonRanking'?ranking:require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:7,module:1}}).outputText,c);return c.exports;}
const helpers=load('src/utils/comparisonLoras.ts');
const ranking=load('src/utils/comparisonRanking.ts');
const studio=load('src/utils/rankingStudio.ts');
const input=[{path:'D:/Models/a.safetensors',strength:.3},{path:'D:/Models/b.safetensors',strength:-.25},{path:'D:/Models/off.safetensors',strength:1,disabled:true},{path:'d:\\TRAINING\\job\\x.safetensors',strength:.9},{path:'D:/Training-other/a.safetensors',strength:0},{path:'D:/External/test/a.safetensors',strength:.7}];
const supports=helpers.supportingLoras(input,'D:/Training/','D:/External/test');
assert.deepEqual(Array.from(supports,x=>x.strength),[.3,-.25,0]);assert.equal(input.length,6);
const candidate={path:'D:/Training/job/750.safetensors',strength:.8};
const make=c=>({round:{id:'round',kind:'compare',folder:'D:/Training/job',candidate:c},generation:{model:{loras:c?[...supports,c]:supports},sample:{prompt:'test'}}});
const result=make(candidate),baseline=make(null);
assert.equal(ranking.rankResults([result,baseline],'D:/Training/job',false,false)[0].total,1);
assert.equal(ranking.rankResults([result,baseline],'D:/Models',false,false).length,0);
assert.equal(studio.studioData([result,baseline],'D:/Training/job').scoped.length,2);
assert.equal(studio.studioData([result,baseline],'D:/Models').scoped.length,0);
assert.equal(studio.evidenceFor([result,baseline],ranking.rankResults([result],'D:/Training/job',false,false)[0]).length,1);
const mismatch=make({...candidate,strength:.6});mismatch.generation.model.loras=[...supports,candidate];
assert.equal(helpers.comparisonCandidate(mismatch),null);
console.log('PASS supporting LoRAs: weights, exclusions, disabled, path boundaries, baseline and candidate attribution');
