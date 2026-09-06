/**
 * [INPUT]: content.mjs 的真实内容编译器；用微型分类与条目模拟有效输入和常见坏数据。
 * [OUTPUT]: 验证身份、完整覆盖、链接协议、来源引用与同一对象复用的回归结果。
 * [POS]: 内容边界的独立测试，不依赖网络、不修改正式条目，避免空说明静默进入首页。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {compileContent} from './content.mjs';

const nodes = [
  {i:0,n:'根',d:0,t:'root',p:null,c:[1]},
  {i:1,n:'领域',d:1,t:'group',p:0,c:[2,3,4]},
  {i:2,n:'原对象',d:2,t:'item',p:1,c:[],r:[[3,'同一个东西']]},
  {i:3,n:'另一落点',d:2,t:'item',p:1,c:[],r:[[2,'同一个东西']]},
  {i:4,n:'同类对象',d:2,t:'item',p:1,c:[],r:[[2,'同一类的东西']]},
];
const documents = [{filename:'01-fixture.json',data:{domain:1,name:'领域',sources:[{
  id:'manual', title:'官方手册',url:'https://example.org/manual',scope:'对象的基础用法',checkedAt:'2026-09-04',
}],entries:nodes.slice(1).map(node => ({node:node.i,name:node.n,summary:`${node.n}的独立定位说明文字。`,
  explanation:`关于${node.n}的具体运作过程，以及读者在实际使用时需要辨认的边界。`,sourceIds:['manual']}))}}];
const fixture = () => ({nodes:structuredClone(nodes),documents:structuredClone(documents)});
let checks = 0;
function reject(name, mutate, message) {
  const input = fixture(); mutate(input);
  assert.throws(() => compileContent(input.nodes,input.documents),message,name); checks++;
}
const before = JSON.stringify({nodes,documents});
const result = compileContent(nodes,documents);
assert.equal(result.content.byNode[3].canonical,2);
assert.equal(result.nodes[2].m,result.nodes[3].m);
assert.equal(result.content.byNode[3].context.explanation,documents[0].data.entries[2].explanation);
assert.equal(result.content.byNode[4].canonical,4);
assert.notEqual(result.nodes[2].m,result.nodes[4].m);
assert.equal(JSON.stringify({nodes,documents}),before);
assert.equal(result.content.coverage.entries,4); checks++;
const sameBody=fixture();
sameBody.documents[0].data.entries[2].explanation=sameBody.documents[0].data.entries[1].explanation;
const withLocalPosition=compileContent(sameBody.nodes,sameBody.documents);
assert.equal(withLocalPosition.content.byNode[3].context.summary,sameBody.documents[0].data.entries[2].summary);
checks++;
const sourceOnly=fixture(), local=sourceOnly.documents[0].data.entries[2], primary=sourceOnly.documents[0].data.entries[1];
sourceOnly.documents[0].data.sources.push({id:'local',title:'本地案例',url:'https://example.org/local',scope:'另一落点的适用情境'});
local.summary=primary.summary; local.explanation=primary.explanation; local.sourceIds=['local'];
assert.deepEqual(compileContent(sourceOnly.nodes,sourceOnly.documents).content.byNode[3].context.sourceIds,['1:local']);
checks++;
reject('遗漏最底层内容', input => input.documents[0].data.entries.pop(),/还缺 1 个节点/);
reject('同一节点重复', input => input.documents[0].data.entries.push(input.documents[0].data.entries[0]),/条目重复/);
reject('节点改名却沿用旧内容', input => input.nodes[2].n='新名称',/编号\/名称/);
reject('错挂领域', input => input.documents[0].data.name='另一个域',/领域身份/);
reject('空壳解释', input => input.documents[0].data.entries[1].explanation='这是一个东西',/至少 24/);
reject('遗漏来源', input => input.documents[0].data.entries[1].sourceIds=[],/至少需要一个/);
reject('不存在的来源', input => input.documents[0].data.entries[1].sourceIds=['missing'],/来源不存在/);
reject('重复来源身份', input => input.documents[0].data.sources.push(input.documents[0].data.sources[0]),/来源 ID 重复/);
reject('非网页资料链接', input => input.documents[0].data.sources[0].url='javascript:alert(1)',/只接受普通 HTTP/);
reject('错误核对日期', input => input.documents[0].data.sources[0].checkedAt='2026-02-30',/核对日期/);
reject('孤立子节点', input => input.nodes[1].c.pop(),/缺少反向子引用/);
reject('不存在的关系端点', input => input.nodes[2].r=[[99,'同一个东西']],/关联端点不存在/);
const unreviewed=fixture(); delete unreviewed.documents[0].data.sources[0].checkedAt;
assert.equal(compileContent(unreviewed.nodes,unreviewed.documents).content.coverage.checkedSources,0); checks++;
console.log(`通过 ${checks} 项内容编译检查；输入未修改，同类对象不会合并。`);
