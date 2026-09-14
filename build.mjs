#!/usr/bin/env node
/**
 * [INPUT]: src 模板与交互、分类/组合及逐节点正文；atlas 的三树编译与 offline 自包含守卫。
 * [OUTPUT]: 校验后生成根 index.html；--check 检查产物同步且不写文件，--watch 监听源文件。
 * [POS]: 全景的唯一交付入口；复用 content 校验边界，不向分类或条目正本回写。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
// 把 src/ 与 data/ 内联成一个自包含的 index.html（仓库根，也是 GitHub Pages 的发布入口）。
// 产物不依赖任何网络资源，双击即可打开（file:// 也能跑）—— 这是本项目的交付形态，
// 拆成多文件只是为了改得动，不是为了让人分开加载。
import { readFileSync, writeFileSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { readContent } from './scripts/content.mjs';
import { assertOfflineHtml } from './scripts/offline.mjs';
import { readAtlas } from './scripts/atlas.mjs';

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
  const enriched = readContent(data.nodes, join(root, 'data', 'entries'));
  const atlas = readAtlas(enriched, join(root, 'data'));
  enriched.nodes[0].g = '沿着领域、概念和具体条目探索。每个节点都有基础说明，相关资料可以继续打开阅读。';
  const inline = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const parts = {
    'style.css': read('src', 'style.css'),
    'entry.css': read('src', 'entry.css'),
    'atlas.css': read('src', 'atlas.css'),
    'data': 'const RAW = ' + inline({nodes:enriched.nodes}) + ';',
    'content': 'const CONTENT = ' + inline(enriched.content) + ';',
    'atlas': 'const ATLAS = ' + inline(atlas) + ';',
    'bundles': 'const BUNDLES = ' + inline(bundles) + ';',
    'icons.js': read('src', 'icons.js'),
    'tree.js': read('src', 'tree.js'),
    'details.js': read('src', 'details.js'),
    'graph.js': read('src', 'graph.js'),
    'entry.js': read('src', 'entry.js'),
    'atlas.js': read('src', 'atlas.js'),
    'boot.js': read('src', 'boot.js'),
  };
  let html = read('src', 'index.html');
  for (const [k, v] of Object.entries(parts)) {
    const tag = `/*@inject ${k}*/`;
    if (html.split(tag).length !== 2) throw new Error(`index.html 必须恰有一个注入点 ${tag}`);
    html = html.replace(tag, () => v.trimEnd() + '\n');   // 段与段之间留一行，dist 也要能读
  }
  const left = html.match(/\/\*@inject [^*]+\*\//);
  if (left) throw new Error(`还有没填的注入点：${left[0]}`);
  for (const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script, {filename:'index.html'});
  assertOfflineHtml(html);
  if (process.argv.includes('--check')) {
    if (read('index.html') !== html) throw new Error('根 index.html 与源文件不同，请先 node build.mjs');
    console.log('全景内容、引用、脚本语法与产物同步检查通过。', enriched.content.coverage);
    return;
  }

  // 产物写在仓库根：GitHub Pages 选「main / (root)」就能直接发，不用 Action、不用重定向
  writeFileSync(join(root, 'index.html'), html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`index.html  ${kb} KB  ·  ${data.nodes.length} 个节点`, enriched.content.coverage);
}

build();

if (process.argv.includes('--watch')) {
  console.log('看着 src/ 和 data/，改了就重建（Ctrl-C 退出）');
  let t = null;
  for (const d of ['src', 'data', 'data/entries']) {
    watch(join(root, d), () => { clearTimeout(t); t = setTimeout(() => {
      try { build(); } catch (error) { console.error('构建失败，保留上一次产物：', error.message); }
    }, 60); });
  }
}
