/**
 * [INPUT]: 在 Node VM 中载入真实 graph.js、tree.js 的全局 Esc 处理器与节点/组合，提供 DOM 替身。
 * [OUTPUT]: 交互状态回归结果，覆盖弹层切换、原生搜索框 Esc、错误组合编号与指针隔离，不改产物。
 * [POS]: scripts 的图谱事件回归入口；检查真实处理器的状态变化，几何与浏览器行为由浏览器验收。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const elements = new Map();
function element(id) {
  const classes = new Set(), listeners = new Map();
  let html = '';
  const node = {
    id, dataset: {}, style: {}, value: '', onclick: null,
    classList: {add: value => classes.add(value), remove: value => classes.delete(value),
      contains: value => classes.has(value), toggle(value, on = !classes.has(value)) {
        if (on) classes.add(value); else classes.delete(value); return on;
      }},
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    emit(type, event = {}) {
      for (const handler of listeners.get(type) || []) handler.call(node, event);
      if (type === 'click' && node.onclick) node.onclick(event);
    },
    dispatchEvent(event) { node.emit(event.type, event); },
    setAttribute() {}, setPointerCapture() {}, focus() {},
    querySelector() {
      const match = html.match(/data-i="(\d+)"/);
      return match ? result({i: match[1]}) : null;
    },
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      if (id === 'mgpop' && value.includes('id="mgq"')) {
        elements.set('mgq', element('mgq'));
        elements.set('mgres', element('mgres'));
      }
    },
  };
  return node;
}
function get(id) {
  if (!elements.has(id)) elements.set(id, element(id));
  return elements.get(id);
}
function result(dataset) {
  const node = {dataset, closest(selector) {
    if (selector === '.mgr' || (selector === '.mgr[data-b]' && 'b' in dataset) ||
        (selector === '.mgr[data-i]' && 'i' in dataset)) return node;
    return null;
  }};
  return node;
}
const document = element('document'), window = element('window');
document.getElementById = get;
document.querySelectorAll = () => [];
document.body = element('body');
const context = vm.createContext({
  N: JSON.parse(read('../data/concepts.json')).nodes,
  BUNDLES: JSON.parse(read('../data/bundles.json')),
  document, window, addEventListener: window.addEventListener,
  NS: 'http://www.w3.org/2000/svg', FAM: 'sans-serif',
  mc: {measureText: text => ({width: text.length * 7})},
  esc: String, crumb: () => '', txt: node => node.n.toLowerCase(),
  requestAnimationFrame: () => 0, goto: () => {},
  qEl: get('q'), Event: class { constructor(type) { this.type = type; } },
});
// 按页面实际顺序先注册树的 Esc 处理器，再注册图谱；不复制处理逻辑。
const treeEscape = read('../src/tree.js').match(/document\.addEventListener\('keydown',e=>\{ if\(e\.key!=='Escape'\) return;[\s\S]*?\}\);/);
assert.ok(treeEscape, '应找到真实 tree.js 的全局 Esc 处理器');
vm.runInContext(treeEscape[0], context);
vm.runInContext(read('../src/graph.js'), context);
vm.runInContext('let redraws=0; mgShow=()=>{redraws++;};', context);
const state = source => vm.runInContext(source, context);
let count = 0;
function check(name, operation) { operation(); count++; }
check('实现语言的双向记录合成一条正确方向的关联', () => {
  const result=JSON.parse(state('JSON.stringify([...MEDG.values()].flat().filter(e=>e.a===mrep(946)&&e.b===mrep(494)))'));
  assert.equal(result.length,1);
  assert.equal(result[0].lab,'用什么语言实现');
  assert.equal(result[0].st.f,'dep');
});

check('组合切换到加点不残留处理器，点击结果后状态仍有效', () => {
  get('mgbun').emit('click');
  assert.equal(typeof get('mgpop').onclick, 'function');
  get('mgadd').emit('click');
  assert.equal(get('mgpop').onclick, null);
  get('mgq').value = 'react';
  get('mgq').emit('input');
  const row = get('mgres').querySelector('.mgr');
  assert.ok(row);
  const event = {target: row};
  get('mgres').emit('click', event);
  get('mgpop').emit('click', event);
  assert.equal(state('mgBundle'), null);
  assert.equal(state('mgPin.size'), 1);
  assert.equal(state('Number.isNaN(mgBundle)'), false);
});

check('加点框 Esc 只关闭弹层并消费事件', () => {
  document.body.classList.add('mgbig');
  get('mgadd').emit('click');
  let prevented = false, stopped = false;
  get('mgq').emit('keydown', {key: 'Escape', preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; }});
  assert.ok(prevented && stopped);
  assert.equal(get('mgpop').style.display, 'none');
  assert.ok(document.body.classList.contains('mgbig'));
});

check('组合编号必须合法，误投加点结果不会修改组合', () => {
  get('mgbun').emit('click');
  for (const dataset of [{i: '1'}, {b: 'NaN'}, {b: '99999'}, {b: ''}, {b: '-2'}]) {
    get('mgpop').emit('click', {target: result(dataset)});
    assert.equal(state('mgBundle'), null);
  }
  get('mgpop').emit('click', {target: result({b: '0'})});
  assert.equal(state('mgBundle'), 0);
  assert.equal(get('mgpop').onclick, null);
});

check('弹层的指针、滚轮、双击不作用于图谱', () => {
  const before = state('redraws'), target = {closest: selector => selector === '#mgpop' ? get('mgpop') : null};
  get('mgwrap').emit('pointerdown', {button: 0, pointerId: 1, target});
  assert.equal(state('mgDrag'), false);
  get('mgwrap').emit('wheel', {target, preventDefault() { assert.fail('弹层滚轮不应被阻止'); }});
  get('mgwrap').emit('dblclick', {target});
  assert.equal(state('redraws'), before);
});

check('背景支持指针平移，取消手势后停止平移', () => {
  get('mgwrap').emit('pointerdown', {button: 0, pointerId: 3, clientX: 10, clientY: 20,
    target: {closest: () => null}, stopPropagation() {}});
  window.emit('pointermove', {pointerId: 3, clientX: 30, clientY: 50});
  assert.equal(state('mgTx'), 20);
  assert.equal(state('mgTy'), 30);
  window.emit('pointercancel', {pointerId: 3});
  assert.equal(state('mgDrag'), false);
  window.emit('pointermove', {pointerId: 3, clientX: 90, clientY: 100});
  assert.equal(state('mgTx'), 20);
});

check('搜索框连续 Esc 按弹层、放大、搜索逐层退出，原生清空不能抢先执行', () => {
  state('mgClosePop()');
  document.body.classList.add('mgbig');
  get('q').value = 'Redis';
  get('mgbun').emit('click');
  let inputEvents = 0, nativeClears = 0;
  get('q').addEventListener('input', () => inputEvents++);
  function pressEscape() {
    const event = {key: 'Escape', target: get('q'), defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }};
    document.emit('keydown', event);
    // type=search 的原生 Esc 行为只在事件未被消费时发生。
    if (!event.defaultPrevented) { get('q').value = ''; nativeClears++; }
  }
  pressEscape();
  assert.equal(get('mgpop').style.display, 'none');
  assert.ok(document.body.classList.contains('mgbig'));
  assert.equal(get('q').value, 'Redis');
  assert.equal(inputEvents, 0);

  pressEscape();
  assert.equal(document.body.classList.contains('mgbig'), false);
  assert.equal(get('q').value, 'Redis');
  assert.equal(inputEvents, 0);

  pressEscape();
  assert.equal(get('q').value, '');
  assert.equal(inputEvents, 1);
  assert.equal(nativeClears, 0);
});

console.log(`通过 ${count} 项图谱事件回归；DOM 替身只验证状态，实际浏览器另行验收。`);
