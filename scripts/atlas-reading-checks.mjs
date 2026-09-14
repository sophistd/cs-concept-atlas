/**
 * [INPUT]: 真实 content/atlas 编译产物、details/atlas 阅读函数与轻量 DOM 替身。
 * [OUTPUT]: 样例所有详情往返、情境结果分层、来源定位和绑定检查展示的回归结果。
 * [POS]: 三树阅读边界检查；不代替浏览器布局、交互现场或真人理解证据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readContent} from './content.mjs';
import {readAtlas} from './atlas.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const enriched=readContent(JSON.parse(read('data/concepts.json')).nodes,new URL('data/entries/',root).pathname);
const atlas=readAtlas(enriched,new URL('data/',root).pathname);
const context=vm.createContext({ATLAS:atlas,CONTENT:enriched.content,N:enriched.nodes,URLSearchParams,
  document:{getElementById(){return {addEventListener(){}};}}});
vm.runInContext(read('src/details.js'),context);
vm.runInContext(read('src/atlas.js'),context);
let checks=0,details=0,links=0;
const check=(name,fn)=>{fn();checks++;};
const solution=scenario=>atlas.solutions[scenario.solution];
const decode=value=>value.replaceAll('&amp;','&');

check('所有对象和关系详情都能沿同一情境往返，旧地图地址仍指向真实节点',()=>{
  for(const scenario of Object.values(atlas.scenarios)) {
    vm.runInContext('atlasScenario='+JSON.stringify(scenario.id),context);
    const tables={object:atlas.objects,binding:atlas.bindings,problem:atlas.problems,claim:atlas.claims,
      source:atlas.sources,relation:atlas.relations,connection:atlas.connections,criterion:atlas.criteria,
      role:Object.fromEntries(solution(scenario).roles.map(role=>[role.id,role]))};
    const outputs=[context.atlasDiagram(scenario,solution(scenario))];
    for(const [type,table] of Object.entries(tables)) for(const id of Object.keys(table)) {
      outputs.push(context.atlasDetail(type,id,scenario,solution(scenario)));details++;
    }
    for(const output of outputs) {
      assert.doesNotMatch(output,/undefined|\[object Object\]/);
      for(const [,href] of output.matchAll(/href="([^"]+)"/g)) {
        const url=decode(href);links++;
        if(url.startsWith('#node=')) {assert.ok(enriched.nodes[Number(url.slice(6))]);continue;}
        if(!url.startsWith('#atlas=')) continue;
        const params=new URLSearchParams(url.slice(1));assert.equal(params.get('atlas'),scenario.id);
        for(const [type,id] of params) if(type!=='atlas') assert.ok(tables[type]?.[id],`${type}/${id} 不存在`);
      }
    }
  }
});
check('调用成功仍显示问题结果待查，下一步直接取编译判定',()=>{
  const scenario=atlas.scenarios['photo-B'];
  const output=context.atlasScenarioResults(scenario);
  assert.match(output,/方案调用<\/dt><dd>教学假设通过/);
  assert.match(output,/问题结果<\/dt><dd>尚未检查/);
  const changed=structuredClone(scenario);changed.evaluation.next='条件发生变化后的下一步';
  assert.ok(context.atlasScenarioResults(changed).includes(changed.evaluation.next));
  assert.ok(!context.atlasScenarioResults(changed).includes(changed.next));
});
check('角色绑定读回固定版本检查；对象选择不能扩写成熟练或问题完成',()=>{
  const b=atlas.scenarios['photo-B'];
  const output=context.atlasBindingDetail(atlas.bindings['run-tv'],b,solution(b));
  assert.match(output,/方案调用：教学假设通过/);assert.match(output,/问题结果：尚未检查/);
  assert.match(output,/没有真实运行证据/);
  const a=atlas.scenarios['photo-A'];
  assert.match(context.atlasBindingDetail(atlas.bindings['explain-v15'],a,solution(a)),/已选或接入不表示已经理解/);
});
check('主张显示准确来源位置，材料显示记录版本和反向主张，不漏掉自定义练习依据',()=>{
  for(const claim of Object.values(atlas.claims)) {
    const output=context.atlasClaimDetail(claim);
    for(const evidence of claim.evidence) {
      assert.ok(output.includes(context.esc(evidence.locator)));
      const source=atlas.sources[evidence.sourceId];
      const sourceOutput=context.atlasSourceDetail(source,evidence.sourceId);
      assert.ok(sourceOutput.includes(context.esc(source.trace.version)));
      assert.ok(sourceOutput.includes(context.esc(claim.statement)));
    }
    if(claim.basisKind==='project-example') assert.ok(output.includes(context.esc(claim.projectBasis.scope)));
  }
});
console.log(`通过 ${checks} 项三树阅读边界检查；覆盖 ${details} 个情境详情、${links} 条导航引用。真实浏览器另行验收。`);
