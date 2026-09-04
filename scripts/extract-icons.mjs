#!/usr/bin/env node
// 从本地装着的 lucide-react 里抠出这 24 个图标的几何数据，生成 src/icons.js。
// 不引 CDN、不引 npm 依赖 —— 产物要能离线双击打开，所以图标必须内联进去。
// lucide 是 ISC 许可，署名写在生成文件的头部与 README 里。
//
//   node scripts/extract-icons.mjs [lucide-react 的路径]
//
// 生成的 src/icons.js 是**产物，已提交**，平时不需要跑这个脚本；
// 只有要换图标、或升 lucide 版本时才跑。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';

// 24 个域各配一个图标。域是这份图最稳定的一层，配满就封顶了。
const MAP = [
  ['软件的构成单位',     'package'],
  ['数据结构',           'list-tree'],
  ['算法',               'sigma'],
  ['设计模式',           'shapes'],
  ['架构风格',           'building-2'],
  ['编程范式',           'brain'],
  ['编程语言家族',       'languages'],
  ['语言的构成部件',     'puzzle'],
  ['类型系统',           'type'],
  ['操作系统',           'monitor-cog'],
  ['网络与协议',         'network'],
  ['数据库与存储',       'database'],
  ['并发与并行',         'split'],
  ['从源码到运行',       'terminal'],
  ['前端',               'app-window'],
  ['后端',               'server'],
  ['交付与基础设施',     'container'],
  ['测试',               'flask-conical'],
  ['安全',               'shield'],
  ['人工智能与机器学习', 'brain-circuit'],
  ['数据的表示与格式',   'braces'],
  ['版本控制与协作',     'git-branch'],
  ['计算机体系结构',     'cpu'],
  ['理论计算机科学',     'infinity'],
];

const candidates = [
  process.argv[2],
  join(process.env.HOME, 'Code/tools/vibetrail/node_modules/lucide-react'),
  join(root, 'node_modules/lucide-react'),
].filter(Boolean);
const pkg = candidates.find(p => existsSync(join(p, 'dist/esm/icons')));
if (!pkg) {
  console.error('找不到 lucide-react。装一个再跑：npm i -D lucide-react');
  console.error('或者把路径当参数传进来：node scripts/extract-icons.mjs <path>');
  process.exit(1);
}
const version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;

// icons/<name>.mjs 里的 __iconNode 是 [tag, attrs] 的数组，直接把它抠出来求值
function iconNode(name) {
  const src = readFileSync(join(pkg, 'dist/esm/icons', name + '.mjs'), 'utf8');
  const m = src.match(/const __iconNode = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error(`${name}: 解析不出 __iconNode`);
  return new Function('return ' + m[1])();
}

// 只留渲染需要的：标签名 + 几何属性。key 是 lucide 给 React 用的，扔掉。
const GEOM = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
              'width', 'height', 'points', 'transform'];
const out = {};
for (const [domain, icon] of MAP) {
  out[domain] = iconNode(icon).map(([tag, attrs]) => {
    const a = {};
    for (const k of GEOM) if (attrs[k] != null) a[k] = String(attrs[k]);
    return [tag, a];
  });
}

const body = Object.entries(out)
  .map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
  .join(',\n');

writeFileSync(join(root, 'src/icons.js'), `// 由 scripts/extract-icons.mjs 生成，别手改 —— 换图标改那个脚本的 MAP。
//
// 图标来自 Lucide (https://lucide.dev)，ISC 许可，版本 ${version}。
// 每个值是 [标签名, 几何属性] 的数组，画在 24×24 的坐标系里，
// 描边风格（stroke，不填充）由 CSS 的 .mgi 决定。
//
// 域 → 图标，24 个域各一个：${MAP.map(m => m[1]).join(' · ')}
const ICON = {
${body}
};
`);
console.log(`src/icons.js  ${MAP.length} 个图标  ·  lucide-react ${version} (ISC)`);
