const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Render the modal's element tree without browser effects or loading real result images.
const source = fs.readFileSync('src/components/generate/RankingModal.tsx', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: 9, module: 1, jsx: 4 } }).outputText;
const standing = { key: 'candidate', path: '/test/model_750.safetensors', strength: 0.6, kept: 1, total: 1, rank: 1 };
let view = 0;
let hook = 0;
const element = (type, props) => ({ type, props });
const context = { exports: {}, require(name) {
  if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'fragment' };
  if (name === 'react') return {
    useState(initial) { const index = hook++; return [index === 4 ? view : initial, value => {
      if (index === 4) view = typeof value === 'function' ? value(view) : value;
    }]; },
    useEffect() {}, useMemo: fn => fn(), useRef: current => ({ current }),
  };
  if (name === '@headlessui/react') return { Dialog: 'Dialog', DialogPanel: 'DialogPanel', DialogTitle: 'DialogTitle' };
  if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
  if (name === './RoundsView') return { default: 'RoundsView' };
  if (name.endsWith('comparisonLoras')) return { comparisonFolder: () => '/test' };
  if (name.endsWith('encoderIdentity')) return { encoderIdentity: () => 'stock' };
  if (name.endsWith('comparisonRanking')) return { rankResults: () => [standing] };
  if (name.endsWith('rankingStudio')) return {
    normalPath: p => p, shortCheckpoint: () => 'Step 750', candidateKey: () => standing.key,
    evidenceFor: () => [], studioData: () => ({ scoped: [], combinations: [standing],
      paths: [standing.path], strengths: [0.6], cells: new Map([[standing.key, standing]]) }),
  };
  return {};
} };
vm.runInNewContext(code, context);
function render() { hook = 0; return context.exports.default({ isOpen: true, onClose() {}, history: [], onForgetRounds() {} }); }
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function find(tree, predicate) { return nodes(tree).find(predicate); }
const titles = ['The sweet spot, at a glance.', 'The images have the last word.', 'Rounds'];
const labels = ['Heatmap', 'Evidence board', 'Rounds'];
for (let i = 0; i < 3; i++) {
  const tree = render();
  assert.equal(view, i);
  assert.equal(find(tree, n => n.type === 'DialogTitle').props.children, titles[i]);
  assert.equal(find(tree, n => n.props?.['aria-label'] === 'Rank by').props.hidden, i === 2);
  assert.equal(Boolean(find(tree, n => n.type === 'RoundsView')), i === 2);
  assert.equal(find(tree, n => n.props?.title === labels[i]).props['aria-pressed'], true);
  find(tree, n => n.props?.['aria-label'] === 'Next visualisation').props.onClick();
}
assert.equal(view, 0);
find(render(), n => n.props?.['aria-label'] === 'Previous visualisation').props.onClick();
assert.equal(view, 2);
find(render(), n => n.props?.title === 'Evidence board').props.onClick();
assert.equal(view, 1);
assert.match(find(render(), n => n.props?.className?.startsWith('ranking-studio')).props.className, /variant-C/);
assert.doesNotMatch(source, /Strength curves|LineChart|const colours|Evidence wide|studio-checkpoint/);
console.log('PASS ranking views: three tabs, direct selection, forward/back wrap, titles, evidence theme, round controls');
