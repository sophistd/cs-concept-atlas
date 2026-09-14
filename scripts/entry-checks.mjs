/**
 * [INPUT]: 真实 boot/entry 路由、tree 清搜索/Esc 处理器及 offline 守卫；使用轻量 DOM/历史替身。
 * [OUTPUT]: 首访与旧路由兼容、浏览状态保留及外部资源拒绝的回归结果。
 * [POS]: 首访集成的行为检查；验证路由边界，不代替真实浏览器布局或真人试读。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {assertOfflineHtml} from './offline.mjs';
import {readContent} from './content.mjs';
import {readAtlas} from './atlas.mjs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
let checks = 0;
let frameId=0,deferFrames=false;
const frames=new Map();
const check = (name, run) => { run(); checks++; };
const classes = new Set(), elements = new Map(), handlers = {};
const el = id => {
  if (!elements.has(id)) elements.set(id, {id, hidden:false, inert:false, clientWidth:900, clientHeight:600,
    focus(){context.focused=id;}, scrollIntoView(){context.scrolled=id;}, addEventListener(type, handler){handlers[id+':'+type]=handler;},
    dispatchEvent(event){handlers[id+':'+event.type]?.(event);}});
  return elements.get(id);
};
const document = {getElementById:el, body:{classList:{contains:x=>classes.has(x),
  add:x=>classes.add(x),remove:x=>classes.delete(x),
  toggle(x,on){if(on)classes.add(x);else classes.delete(x);}}},
  addEventListener(type,fn){handlers['document:'+type]=fn;}};
document.documentElement={classList:{toggle(){}}};
const enriched=readContent(JSON.parse(read('../data/concepts.json')).nodes,new URL('../data/entries/',import.meta.url).pathname);
const context = vm.createContext({document, location:{hash:'',pathname:'/index.html',search:''},
  ATLAS:JSON.parse(JSON.stringify(readAtlas(enriched,new URL('../data/',import.meta.url).pathname))),CONTENT:enriched.content,URLSearchParams,
  N:[{i:0,d:0},{i:1,d:1}], sel:null,card:el('card'),qEl:el('q'),stage:el('stage'),
  mgPop:{style:{}},mgPos:null,mgWrap:el('mgwrap'),
  mgClosePop(){},mgToggleBig(){}, paint(n){context.painted=n.i;},render(){},centerNode(){},fit(){},
  goto(i){context.sel=context.N[i];context.painted=i;context.location.hash='#node='+i;},
  addEventListener(type,fn){handlers[type]=fn;}, ResizeObserver:class{observe(){}},
  requestAnimationFrame:fn=>{const id=++frameId;if(deferFrames)frames.set(id,fn);else fn();return id;},cancelAnimationFrame:id=>frames.delete(id),
  window:{scrollTo(){context.scrolled='top';}},
  history:{replaceState(a,b,url){context.location.hash=url;}},Event:class{constructor(type){this.type=type;}},
});
vm.runInContext(read('../src/entry.js'),context);
const detailSource=read('../src/details.js');
vm.runInContext(detailSource.slice(detailSource.indexOf('function esc('),detailSource.indexOf('function detailLink(')),context);
vm.runInContext(read('../src/atlas.js'),context);
vm.runInContext(read('../src/boot.js'),context);
check('无 hash 显示介绍且隐藏地图不能聚焦',()=>{
  assert.equal(classes.has('intro'),true);assert.equal(el('intro').hidden,false);
  for (const id of ['top','stage','side','legend']) assert.equal(el(id).inert,true);
});
check('旧 node 深链直接显示详情；返回介绍保留选择，再回地图仍同一节点',()=>{
  context.location.hash='#node=1';handlers.hashchange();assert.equal(context.painted,1);assert.equal(context.focused,'card');
  context.location.hash='#intro';handlers.hashchange();assert.equal(context.sel.i,1);assert.equal(context.focused,'entry-heading');
  context.location.hash='#map';handlers.hashchange();assert.equal(context.painted,1);assert.equal(context.focused,'q');
});
check('未知节点不伪装已找到，显示恢复入口',()=>{
  context.location.hash='#node=999999';handlers.hashchange();assert.equal(el('entry-error').hidden,false);
  assert.equal(context.location.hash,'#node=999999');
});
check('三个首访区段直开、回退和回首页均保留地图选择并正确定位',()=>{
  for(const id of ['entry-routes','entry-resources','entry-training']) {
    context.location.hash='#'+id;handlers.hashchange();
    assert.equal(classes.has('intro'),true);assert.equal(context.focused,id);assert.equal(context.scrolled,id);
    assert.equal(context.sel.i,1);assert.equal(el('entry-error').hidden,true);
  }
  context.location.hash='#intro';handlers.hashchange();assert.equal(context.scrolled,'top');
  context.location.hash='#node=1';handlers.hashchange();assert.equal(context.painted,1);
});
const tree = read('../src/tree.js');
const escape = tree.match(/document\.addEventListener\('keydown',e=>\{ if\(e\.key!=='Escape'\) return;[\s\S]*?\}\);/)[0];
vm.runInContext(escape,context);
check('介绍页 Esc 不清除隐藏地图状态',()=>{
  context.location.hash='#intro';handlers.hashchange();context.qEl.value='CNN';
  handlers['document:keydown']({key:'Escape',preventDefault(){throw new Error('介绍页不应消费地图 Esc');}});
  assert.equal(context.qEl.value,'CNN');assert.equal(context.sel.i,1);
});
check('样例详情切情境后回到条件区，隐藏地图不处理Esc，未知情境明确恢复',()=>{
  context.location.hash='#atlas=photo-B&binding=run-tv';handlers.hashchange();
  assert.equal(classes.has('atlas-mode'),true);assert.equal(el('top').inert,true);
  assert.match(el('atlas-view').innerHTML,/方案调用<\/dt><dd>教学假设通过/);
  assert.match(el('atlas-view').innerHTML,/问题结果<\/dt><dd>尚未检查/);
  assert.equal(context.focused,'atlas-detail-title');
  el('atlas-scenario-select').value='photo-sku';handlers['atlas-scenario-select:change']();handlers.hashchange();
  assert.equal(context.focused,'atlas-heading');assert.equal(context.scrolled,'top');
  assert.match(context.location.hash,/binding=run-tv/);assert.match(el('atlas-view').innerHTML,/此变体不适用于当前目标/);
  context.qEl.value='CNN';handlers['document:keydown']({key:'Escape'});assert.equal(context.qEl.value,'CNN');
  context.location.hash='#atlas=missing';handlers.hashchange();assert.equal(context.focused,'atlas-missing');
  context.location.hash='#node=1';handlers.hashchange();assert.equal(el('atlas-view').inert,true);assert.equal(context.painted,1);
});
check('旧延迟帧在路由切换后不能操作已消失详情或把地图滚回首页区段',()=>{
  deferFrames=true;
  context.location.hash='#atlas=photo-B&object=b01%3Acnn';handlers.hashchange();
  const atlasCallback=[...frames.values()].at(-1);
  context.location.hash='#atlas=missing';handlers.hashchange();
  assert.doesNotThrow(()=>atlasCallback());assert.equal(context.focused,'atlas-missing');assert.equal(context.scrolled,'top');
  context.location.hash='#entry-training';handlers.hashchange();
  const entryCallback=[...frames.values()].at(-1);
  context.location.hash='#map';handlers.hashchange();context.scrolled='map-preserved';
  assert.doesNotThrow(()=>entryCallback());assert.equal(context.scrolled,'map-preserved');assert.equal(context.focused,'q');
  assert.equal(frames.size,0);deferFrames=false;
});
check('JSON内联后的普通对象不把URL中的原型继承键当知识或情境',()=>{
  for(const id of ['constructor','__proto__','toString']) {
    context.location.hash='#atlas='+id;assert.doesNotThrow(()=>handlers.hashchange());
    assert.equal(context.focused,'atlas-missing');
    for(const type of ['object','binding','problem','claim','source','criterion','relation','connection','role']) {
      context.location.hash='#atlas=photo-A&'+type+'='+id;assert.doesNotThrow(()=>handlers.hashchange());
      assert.match(el('atlas-view').innerHTML,/未找到这个样例入口/);
    }
  }
  context.location.hash='#map';handlers.hashchange();
});
const input = tree.slice(tree.indexOf("qEl.addEventListener('input'"),tree.indexOf('// Esc 有三个去处'));
Object.assign(context,{searching:true,hitsEl:{textContent:''},txt:()=>'',viewTo(){}});
vm.runInContext(input,context);
check('清搜索置 #map，刷新路由仍为地图',()=>{
  context.location.hash='#node=1';context.qEl.value='';context.qEl.dispatchEvent(new context.Event('input'));
  assert.equal(context.location.hash,'#map');handlers.hashchange();assert.equal(classes.has('intro'),false);assert.equal(context.painted,0);
});
const icon = svg => '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,'+encodeURIComponent(svg)+'"/>';
check('生成候选与静态内联 favicon 通过自包含守卫',()=>{
  assertOfflineHtml('<script>function atlasUrl(type, id) { return "#atlas=" + id; }</script>');
  assertOfflineHtml(read('../index.html'));assertOfflineHtml('<svg><use href="#mark"/></svg><style>.x{filter:url(#filter)}</style>');assertOfflineHtml(icon('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L8 8"/></svg>'));
});
check('远程图标、样式、脚本和引用型 SVG 被拒绝',()=>{
  for (const html of ['<link rel="icon" href="https://example.org/a.svg">','<link rel="stylesheet" href="a.css">',
    '<script src="https://example.org/a.js"></script>','<img src="a.png">',
    '<style>.x{background:url(images/mark.svg)}</style>', '<style>.x{background:url(/mark.svg)}</style>',
    '<svg><image href="https://example.org/mark.svg"/></svg>', '<svg><use href="icons.svg#mark"/></svg>',
    icon('<svg><script>alert(1)</script></svg>'),icon('<svg onload="alert(1)"></svg>'),
    icon('<svg><use href="https://example.org/x.svg#x"/></svg>')]) assert.throws(()=>assertOfflineHtml(html));
});
console.log(`通过 ${checks} 项首访路由与自包含反例检查；实际浏览器另行验收。`);
