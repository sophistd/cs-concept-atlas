/**
 * [INPUT]: 真实 content 编译器、details 详情渲染器和 tree 的 txt 搜索函数；使用微型内容与 DOM 替身。
 * [OUTPUT]: 来源合并、本地语境检索和共享正文去重的回归结果，不写正式内容或页面产物。
 * [POS]: scripts 的阅读行为检查；覆盖内容进入搜索与详情的边界，浏览器布局另行验收。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compileContent} from './content.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const details = read('../src/details.js');
const tree = read('../src/tree.js');
const search = tree.match(/function txt\([^)]*\)\s*\{[\s\S]*?(?=\nfunction\s)/);
assert.ok(search, '应能从 tree.js 取得真实 txt 函数');

const sharedUrl = 'https://example.org/manual';
const localUrl = 'https://example.org/scenario';
const mainSummary = '为读者介绍共同能力的通用对象说明。';
const mainExplanation = '这个对象通过统一的计算过程保存处理结果，并由调用者决定何时读取，具体运行环境需要另行确认。';

function fixture(sourceOnly = false) {
  const nodes = [
    {i:0,n:'根',d:0,t:'root',p:null,c:[1]},
    {i:1,n:'领域',d:1,t:'group',p:0,c:[2,3]},
    {i:2,n:'对象主位置',d:2,t:'item',p:1,c:[],r:[[3,'同一个东西']]},
    {i:3,n:'对象另一位置',d:2,t:'item',p:1,c:[],r:[[2,'同一个东西']]},
  ];
  const documents = [{filename:'reading-fixture.json',data:{domain:1,name:'领域',sources:[
    {id:'main',title:'通用手册',url:sharedUrl,scope:'基础机制'},
    {id:'recent',title:'同页近期核对',url:sharedUrl,scope:'训练模式',checkedAt:'2026-09-04'},
    {id:'older',title:'同页较早核对',url:sharedUrl,scope:'推理条件',checkedAt:'2026-08-01'},
    {id:'local',title:'场景专用资料',url:localUrl,scope:'本地运行场景'},
  ],entries:nodes.slice(1).map(node => ({
    node:node.i,name:node.n,
    summary:node.i === 1 ? '领域组织相关概念与具体资源入口。' :
      node.i === 3 && !sourceOnly ? '这是只在专有语境中使用的场景定位。' : mainSummary,
    explanation:node.i === 1 ? '读者沿着领域发现共同问题，再进入具体对象了解实现方式与使用条件。' :
      node.i === 3 && !sourceOnly ? '在当前场景中，训练模式决定如何组织迭代过程，调用者还需要区分推理阶段与参数更新阶段。' : mainExplanation,
    sourceIds:node.i === 3 ? ['recent','older','local'] : ['main'],
  }))}}];
  return compileContent(nodes, documents);
}

function reader(data) {
  const card = {innerHTML:'',dataset:{},scrollTop:0,addEventListener(){}};
  const context = vm.createContext({
    N:data.nodes,CONTENT:data.content,
    document:{getElementById(){return card;},body:{classList:{contains(){return false;}}}},
    crumb:node => node.n,mgShow(){},
  });
  vm.runInContext(details, context, {filename:'src/details.js'});
  vm.runInContext(search[0], context, {filename:'src/tree.js:txt'});
  return {
    sources:() => vm.runInContext('detailSources(N[3])', context),
    paint() { vm.runInContext('paint(N[3])', context); return card.innerHTML; },
    matches(query) {
      context.query = query;
      return vm.runInContext('txt(N[3]).includes(query.toLowerCase())', context);
    },
  };
}

let checks = 0;
function check(name, operation) { operation(); checks++; }
const count = (html, text) => html.split(text).length - 1;

check('同一地址保留各处支持范围，并显示已知最近的实际核对日期', () => {
  const html = reader(fixture()).sources();
  assert.equal(count(html, 'href="'+sharedUrl+'"'), 1, '同页只生成一个资料入口');
  const link = html.match(/<a\b[^>]*href="https:\/\/example\.org\/manual"[\s\S]*?<\/a>/)?.[0];
  assert.ok(link, '应显示共同资料入口');
  for (const scope of ['基础机制','训练模式','推理条件']) assert.ok(link.includes(scope), '应保留支持范围：'+scope);
  assert.ok(link.includes('页面核对 2026-09-04'), '无日期或旧日期不能覆盖较新的核对记录');
  assert.ok(!link.includes('2026-08-01') && !link.includes('尚待逐页核验'));
});

check('本地定位和正文中的词都可以搜索，主正文仍可搜索', () => {
  const view = reader(fixture());
  assert.equal(view.matches('专有语境'), true, '本地 summary 应进入搜索');
  assert.equal(view.matches('训练模式'), true, '本地 explanation 应进入搜索');
  assert.equal(view.matches('统一的计算过程'), true, '主说明仍应进入搜索');
  assert.equal(view.matches('这里没有出现的检索词'), false);
  const html = view.paint();
  assert.ok(html.includes('专有语境') && html.includes('训练模式'), '检索命中后应能在详情读到相应语境');
});

check('只有来源不同也保留资料，且不重复共同正文或生成空语境段', () => {
  const html = reader(fixture(true)).paint();
  assert.equal(count(html, mainExplanation), 1, '共享正文应只显示一次');
  assert.ok(!html.includes('在这个位置的用法'), '只有来源补充时不生成空的用法段');
  assert.equal(count(html, 'href="'+localUrl+'"'), 1, '本地独有资料应保留');
  assert.equal(count(html, 'href="'+sharedUrl+'"'), 1, '共同资料去重后仍可访问');
  assert.ok(html.includes('页面核对 2026-09-04'));
});

console.log(`通过 ${checks} 项阅读回归检查；真实详情与搜索代码保留本地语境和来源，不重复共享正文。`);
