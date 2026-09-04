#!/usr/bin/env node
// 把 src/ 与 data/ 内联成一个自包含的 index.html（仓库根，也是 GitHub Pages 的发布入口）。
// 产物不依赖任何网络资源，双击即可打开（file:// 也能跑）—— 这是本项目的交付形态，
// 拆成多文件只是为了改得动，不是为了让人分开加载。
import { readFileSync, writeFileSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(root, ...p), 'utf8');

// data/bundles.json 按下标引用节点。数据一增删下标就会整体错位，
// 而错位是静默的 —— 所以每次构建都拿存下来的名字核对一遍。
function checkBundles(nodes, bundles) {
  const bad = [];
  for (const b of bundles)
    for (const m of b.members)
      if (nodes[m.i]?.n !== m.n) bad.push(`${b.name}: #${m.i} 应该是「${m.n}」，实际是「${nodes[m.i]?.n ?? '越界'}」`);
  if (bad.length) {
    console.error('data/bundles.json 与 concepts.json 对不上：');
    for (const x of bad.slice(0, 10)) console.error('  ' + x);
    if (bad.length > 10) console.error(`  …还有 ${bad.length - 10} 条`);
    throw new Error('组合引用错位，重跑 scripts/make-bundles.py 或手工修 data/bundles.json');
  }
}

function build() {
  const data = JSON.parse(read('data', 'concepts.json'));
  const bundles = JSON.parse(read('data', 'bundles.json'));
  checkBundles(data.nodes, bundles);
  const parts = {
    'style.css': read('src', 'style.css'),
    'data': 'const RAW = ' + JSON.stringify(data) + ';',
    'bundles': 'const BUNDLES = ' + JSON.stringify(bundles) + ';',
    'icons.js': read('src', 'icons.js'),
    'tree.js': read('src', 'tree.js'),
    'graph.js': read('src', 'graph.js'),
    'boot.js': read('src', 'boot.js'),
  };
  let html = read('src', 'index.html');
  for (const [k, v] of Object.entries(parts)) {
    const tag = `/*@inject ${k}*/`;
    if (!html.includes(tag)) throw new Error(`index.html 里找不到注入点 ${tag}`);
    html = html.replace(tag, () => v.trimEnd() + '\n');   // 段与段之间留一行，dist 也要能读
  }
  const left = html.match(/\/\*@inject [^*]+\*\//);
  if (left) throw new Error(`还有没填的注入点：${left[0]}`);

  // 产物写在仓库根：GitHub Pages 选「main / (root)」就能直接发，不用 Action、不用重定向
  writeFileSync(join(root, 'index.html'), html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`index.html  ${kb} KB  ·  ${data.nodes.length} 个节点`);
}

build();

if (process.argv.includes('--watch')) {
  console.log('看着 src/ 和 data/，改了就重建（Ctrl-C 退出）');
  let t = null;
  for (const d of ['src', 'data']) {
    watch(join(root, d), () => { clearTimeout(t); t = setTimeout(build, 60); });
  }
}
