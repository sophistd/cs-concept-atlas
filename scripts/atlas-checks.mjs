/**
 * [INPUT]: 正式 entries 与三树 JSON，经真实 content/atlas 编译器加载；反例只修改内存副本。
 * [OUTPUT]: 验证来源往返、身份保留、条件未知、分层结果、私有字段与过期检查的拒绝边界。
 * [POS]: B01 编译契约回归，不下载第三方内容，不运行模型，不代替来源审核或浏览器验收。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {readContent,compileContent} from './content.mjs';
import {compileAtlas,readAtlas,evaluateScenario} from './atlas.mjs';

const dataDirectory=fileURLToPath(new URL('../data/',import.meta.url));
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const {nodes}=json(join(dataDirectory,'concepts.json'));
const enriched=readContent(nodes,join(dataDirectory,'entries'));
const documents=Object.fromEntries(['objects','problems','solutions','scenarios','mappings'].map(k=>[k,json(join(dataDirectory,`${k}.json`))]));
const entries=readdirSync(join(dataDirectory,'entries')).filter(f=>f.endsWith('.json')).sort().map(filename=>({filename,data:json(join(dataDirectory,'entries',filename))}));
const machine=docs=>docs.find(d=>d.filename==='20-machine-learning.json').data;
const fixture=()=>({enriched:structuredClone(enriched),documents:structuredClone(documents)});
let checks=0;
function check(name,fn) { try { fn(); checks++; } catch(error) { error.message=`${name}: ${error.message}`; throw error; } }
function reject(name,mutate,message) {
  check(name,()=>{ const f=fixture(); mutate(f.documents,f.enriched); assert.throws(()=>compileAtlas(f.enriched,f.documents),message); });
}
function rejectContent(name,mutate,message) {
  check(name,()=>{ const docs=structuredClone(entries); mutate(machine(docs)); assert.throws(()=>compileContent(nodes,docs),message); });
}
const before=JSON.stringify({enriched,documents});
const atlas=compileAtlas(enriched,documents);
check('输入不变且编译可重复',()=>{
  assert.equal(JSON.stringify({enriched,documents}),before);
  assert.equal(JSON.stringify(readAtlas(enriched,dataDirectory)),JSON.stringify(atlas));
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(atlas))),JSON.stringify(atlas));
});
check('有限样例数量与自包含正文',()=>{
  const expected={objects:11,problems:5,solutions:1,conditions:3,criteria:4,scenarios:3,claims:15,sources:11,variants:1,bindings:8,coverage:4,connections:4,relations:10};
  for(const [key,count] of Object.entries(expected)) assert.equal(Object.keys(atlas[key]).length,count,key);
  for(const o of Object.values(atlas.objects)) {
    assert.ok(o.body.summary.length>=8); assert.ok(o.body.explanation.length>=24);
    o.body.sourceIds.forEach(id=>assert.ok(atlas.sources[id]));
    assert.equal(o.bodyRef,undefined);
  }
  assert.doesNotMatch(JSON.stringify(atlas),/_local\/|\/Users\/|"_contract"|"private"|"localStorage"/);
});
check('CNN 与 PyTorch 的旧落点、正文和语境保留',()=>{
  assert.deepEqual(atlas.objects['b01:cnn'].rawNodes,[1453]);
  assert.deepEqual(atlas.objects['b01:pytorch'].rawNodes,[23,1446]);
  assert.deepEqual(atlas.indexes.rawObjects[23],atlas.indexes.rawObjects[1446]);
  assert.equal(atlas.objects['b01:pytorch'].body.explanation,enriched.nodes[23].m);
  assert.equal(enriched.content.byNode[1446].canonical,23);
  assert.ok(enriched.content.byNode[1446].context.explanation);
  assert.equal(nodes.length,1739);
});
check('正文正本、局部来源命名空间与细化出处往返',()=>{
  const content=machine(entries);
  for(const body of content.objectEntries) assert.equal(atlas.objects[body.id].body.explanation,body.explanation);
  for(const c of content.claims) {
    assert.equal(atlas.claims[c.id].statement,c.statement);
    assert.equal(atlas.claims[c.id].supportScope,c.supportScope);
    assert.equal(atlas.claims[c.id].locator,c.locator);
    for(const e of atlas.claims[c.id].evidence) {
      const source=atlas.sources[e.sourceId]; assert.ok(source.trace?.version); assert.ok(source.trace?.rights);
      assert.ok(e.locator.length && e.scope.length); assert.ok(atlas.indexes.sourceClaims[e.sourceId].includes(c.id));
      assert.ok(e.sourceId.startsWith('1444:'));
    }
  }
  assert.equal(atlas.sources['1444:S07'].trace.commit,'a7026cb6d478e131b765b898c312e25f9f6dc031');
  assert.equal(atlas.claims['b01:C14'].basisKind,'project-example');
  assert.equal(atlas.claims['b01:C14'].evidence.length,0);
});
check('正反索引保留原绑定、覆盖和关系身份',()=>{
  for(const b of Object.values(atlas.bindings)) {
    assert.ok(atlas.indexes.objectUses[b.object].includes(b.id));
    assert.ok(atlas.indexes.roleBindings[`${b.variant}:${b.role}`].includes(b.id));
  }
  for(const c of Object.values(atlas.coverage)) {
    assert.ok(atlas.indexes.problemCoverage[c.problem].includes(c.id));
    for(const r of c.roles) assert.ok(atlas.indexes.roleCoverage[`${c.variant}:${r}`].includes(c.id));
  }
  for(const r of Object.values(atlas.relations)) {
    for(const o of [r.from,r.to]) assert.ok(atlas.indexes.objectRelations[o].includes(r.id));
    for(const c of r.claimIds) assert.ok(atlas.indexes.claimRelations[c].includes(r.id));
    assert.ok(r.supportScope.length); assert.equal(r.review,'source-reviewed');
  }
  for(const c of Object.values(atlas.claims)) for(const o of c.objectIds) assert.ok(atlas.indexes.objectClaims[o].includes(c.id));
});
check('A 未知、B 调用通过但结果未查、SKU 不适用',()=>{
  const a=atlas.scenarios['photo-A'].evaluation,b=atlas.scenarios['photo-B'].evaluation,s=atlas.scenarios['photo-sku'].evaluation;
  assert.equal(a.applicability,'unknown'); assert.deepEqual(a.unknownConditions,['label-fit','input-fit','runtime-fit']);
  assert.equal(b.applicability,'applicable'); assert.equal(b.callResult,'pass'); assert.equal(b.problemResult,'not-checked');
  assert.equal(s.applicability,'inapplicable'); assert.deepEqual(s.unmetConditions,['label-fit']); assert.deepEqual(s.unknownConditions,['input-fit','runtime-fit']);
  for(const scenario of Object.values(atlas.scenarios)) assert.deepEqual(evaluateScenario(atlas,scenario.id),scenario.evaluation);
  const state=a.bindingStates.find(b=>b.binding==='preprocess-v2');
  assert.equal(state.selection,'unrecorded'); assert.equal(state.activity,'unrecorded');
  assert.equal(a.bindingStates.find(b=>b.binding==='load-v2').selection,'chosen');
  assert.equal(a.next,atlas.scenarios['photo-A'].next);
});
check('缺省条件保持未知，部件失败不自动升级调用或问题',()=>{
  const f=fixture(); delete f.documents.scenarios.scenarios[0].conditionValues['input-fit'];
  const missing=compileAtlas(f.enriched,f.documents); assert.ok(missing.scenarios['photo-A'].evaluation.unknownConditions.includes('input-fit'));
  const b=f.documents.scenarios.scenarios[1]; b.usage=[];
  b.assessments=[{...b.assessments[0],scope:'component',criterion:'input-check',result:'fail',evidence:'虚构输入检查失败'}];
  const component=compileAtlas(f.enriched,f.documents).scenarios['photo-B'].evaluation;
  assert.equal(component.callResult,'not-checked'); assert.equal(component.problemResult,'not-checked');
});
check('权重保持未下载、未知许可，来源阅读不冒充权重检查',()=>{
  const a=atlas.objects['b01:tv-resnet50-v2-weights'].artifact;
  assert.equal(a.downloaded,false); assert.equal(a.sha256,null); assert.equal(a.availability,'not-checked');
  assert.equal(a.rights,'not-determined'); assert.equal(a.distribution,'excluded');
  for(const source of Object.values(atlas.sources).filter(s=>s.trace)) {
    assert.equal(source.trace.rights.originals,'excluded'); assert.equal(source.trace.rights.distribution,'metadata-and-original-only');
  }
});

reject('编译格式版本',d=>d.objects.formatVersion=2,/formatVersion/);
reject('各公共文件同一版本',d=>d.problems.version='old',/版本不一致/);
reject('未知顶层字段',d=>d.objects.private={path:'_local/private.json'},/不允许字段/);
reject('未知对象字段',d=>d.objects.objects[0].personalState='learned',/不允许字段/);
reject('对象 ID 重复',d=>d.objects.objects.push(d.objects.objects[0]),/ID 重复/);
reject('危险对象 ID',d=>d.objects.objects[0].id='__proto__',/ID 格式/);
reject('原 raw 预期名称',d=>d.objects.objects[0].rawNodes[0].name='CNN changed',/预期名称/);
reject('不制造 raw',d=>d.objects.objects[0].rawNodes[0].node=99999,/raw/);
reject('显式同物的 kind 冲突',d=>{
  d.objects.objects.push({id:'b01:bad-alias',name:'PyTorch',kind:'model-family',version:'bad',rawNodes:[{node:1446,name:'PyTorch'}],bodyRef:{node:1446},claimIds:[]});
},/同物 kind 冲突/);
reject('私有正文引用',d=>d.objects.objects[1].bodyRef.id='_local/private.json',/引用不存在/);
reject('正文引用不属于本对象 raw',d=>d.objects.objects[0].bodyRef.node=23,/正文 raw/);
reject('正文名称不符',d=>d.objects.objects[1].name='另一对象',/正文名称/);
reject('无效主张引用',d=>d.objects.objects[0].claimIds=['missing'],/引用不存在/);
reject('无效来源引用',(_,e)=>e.content.objectEntries['b01:resnet'].sourceIds=['_local/source'],/引用不存在/);
reject('权重不得伪称已下载',d=>d.objects.objects[5].artifact.downloaded=true,/只接受 false/);
reject('权重许可不得由代码许可推定',d=>d.objects.objects[5].artifact.rights='BSD-3-Clause',/not-determined/);
reject('主张缺少来源版本',(_,e)=>delete e.content.sources['1444:S01'].trace,/缺少版本/);
reject('直接编译也拒绝来源私有字段',(_,e)=>e.content.sources['1444:S01'].private='secret',/不允许字段/);
reject('直接编译也拒绝主张私有字段',(_,e)=>e.content.claims['b01:C01'].private='secret',/不允许字段/);
reject('正文扩展不透传未知字段',(_,e)=>e.content.objectEntries['b01:resnet'].private='secret',/不允许字段/);
reject('来源对象身份必须存在',(_,e)=>e.content.sources['1444:S01'].trace.objectRef='missing',/引用不存在/);
reject('问题分解循环',d=>d.problems.problems[0].allOf.push('photo-classify'),/循环/);
reject('子问题必须有判据',d=>delete d.problems.problems[1].criterion,/检查判据/);
reject('绑定不得混入其他修订',d=>d.mappings.bindings[0].variantRevision=2,/修订不匹配/);
reject('绑定角色必须存在',d=>d.mappings.bindings[0].role='unknown-role',/角色不存在/);
reject('CNN 不是运行部件',d=>d.mappings.bindings[1].use='performs',/不能冒充运行部件/);
reject('知识关系不能颠倒种类',d=>d.mappings.relations[0].type='loadable-by',/关系方向/);
reject('不能添加无审核关系',d=>d.mappings.relations[0].review='draft',/source-reviewed/);
reject('问题覆盖必须有当前判据',d=>d.mappings.coverage[0].criterion='run-one-image',/判据/);
reject('必要角色覆盖不能省略',d=>d.mappings.coverage=d.mappings.coverage.filter(c=>c.id!=='cover-useful-result'),/必要角色没有问题覆盖/);
reject('必要角色的实际部件不能省略',d=>d.mappings.bindings[0].use='explains',/实际部件/);
reject('协作连接必须完整',d=>d.mappings.connections=d.mappings.connections.filter(c=>c.id!=='X04'),/引用不存在/);
reject('同角色内的必要加载边不能省略',d=>d.mappings.connections=d.mappings.connections.filter(c=>c.id!=='X02'),/引用不存在/);
reject('角色自环不算必要协作',d=>d.mappings.connections[0].to={...d.mappings.connections[0].from},/不能是自环/);
reject('加载连接方向必须对应知识关系',d=>{
  const x=d.mappings.connections.find(x=>x.id==='X02'); [x.from,x.to]=[x.to,x.from];
},/加载连接方向/);
reject('加载连接须引用知识关系',d=>delete d.mappings.connections.find(x=>x.id==='X02').relationId,/必须引用对应对象关系/);
reject('同时删除加载边和必要边列表仍不能留下孤立权重',d=>{
  d.mappings.connections=d.mappings.connections.filter(x=>x.id!=='X02');
  d.solutions.solutions[0].connectionIds=d.solutions.solutions[0].connectionIds.filter(id=>id!=='X02');
},/缺少对应实现的加载协作/);
reject('角色协作流不能循环',d=>d.mappings.connections.find(x=>x.id==='X03').to.id='preprocess',/角色流存在循环/);
for(const kind of ['bindings','coverage']) reject(`${kind} 的额外条件必须在方案声明`,d=>{
  d.solutions.conditions.push({id:'extra-fit',statement:'测试额外必要条件',claimIds:['b01:C15']});
  d.mappings[kind].find(x=>x.id===(kind==='bindings'?'run-tv':'cover-inference')).requires.push('extra-fit');
  for(const s of d.scenarios.scenarios) {s.conditionValues['extra-fit']='false';s.usage=[];s.assessments=[];}
},/必须进入方案必要条件/);
reject('连接端点保留类型校验',d=>d.mappings.connections[0].from.kind='object',/只接受 role/);
reject('public 场景必须明确虚构',d=>d.scenarios.scenarios[0].fictional=false,/必须明确虚构/);
reject('private actor 不混入公共场景',d=>d.scenarios.scenarios[0].actorRef='actual-person',/虚构人物/);
reject('公共场景拒绝账户字段',d=>d.scenarios.scenarios[0].account='private',/不允许字段/);
reject('条件只用三值',d=>d.scenarios.scenarios[0].conditionValues['input-fit']=true,/true \/ false \/ unknown/);
reject('未知条件名',d=>d.scenarios.scenarios[0].conditionValues['private-condition']='true',/引用不存在/);
reject('情境版本不能沿用',d=>d.scenarios.scenarios[0].version='old',/情境版本/);
reject('方案修订不能沿用',d=>d.scenarios.scenarios[0].solutionRevision=2,/方案或变体修订/);
reject('使用记录绑定情境',d=>d.scenarios.scenarios[0].usage[0].scenarioRef='photo-B',/当前情境修订/);
reject('使用记录绑定角色',d=>d.scenarios.scenarios[0].usage[0].role='preprocess',/当前角色/);
reject('不添加全局学习状态',d=>d.scenarios.scenarios[0].usage[0].activity='learned',/只接受 not_started/);
reject('检查引用须存在',d=>d.scenarios.scenarios[1].usage[0].assessmentRefs=['missing'],/检查引用不存在/);
reject('检查范围不能升级',d=>d.scenarios.scenarios[1].assessments[0].scope='problem-result',/范围与判据/);
reject('检查证据不可缺',d=>delete d.scenarios.scenarios[1].assessments[0].evidence,/至少 1/);
reject('检查修订不能沿用',d=>d.scenarios.scenarios[1].assessments[0].scenarioRevision=2,/当前情境修订/);
reject('检查变体不能沿用',d=>d.scenarios.scenarios[1].assessments[0].variantRevision=2,/当前情境修订/);
reject('条件变化使原检查失效',d=>d.scenarios.scenarios[1].conditionValues['input-fit']='unknown',/条件变化/);
reject('重写条件快照也不能在未知时宣称通过',d=>{
  const s=d.scenarios.scenarios[1]; s.conditionValues['input-fit']='unknown';
  s.assessments.forEach(a=>a.conditionValues['input-fit']='unknown');
},/缺少已满足/);
reject('检查输入必须显式虚构',d=>d.scenarios.scenarios[1].assessments[0].input.fictional=false,/必须明确虚构/);
reject('检查环境必须显式虚构',d=>d.scenarios.scenarios[1].assessments[0].environment.fictional=false,/必须明确虚构/);
reject('检查输入不接受本机路径',d=>d.scenarios.scenarios[1].assessments[0].input.id='/Users/person/private.jpg',/虚构标识/);
reject('对象版本变化使原检查失效',d=>d.objects.objects[4].version='v0.24.0',/对象版本变化/);
reject('绑定变化使原检查失效',d=>d.mappings.bindings.find(b=>b.id==='run-tv').object='b01:tv-v2-preprocess',/加载连接方向或绑定/);
reject('只查一个部件不能提升整次调用',d=>d.scenarios.scenarios[1].assessments[0].bindingVersions.pop(),/完整实际绑定版本/);
reject('预处理变化使原调用检查失效',d=>d.objects.objects.find(o=>o.id==='b01:tv-v2-preprocess').version='changed',/对象版本变化/);
reject('类别映射变化使原调用检查失效',d=>d.objects.objects.find(o=>o.id==='b01:tv-v2-labels').version='changed',/对象版本变化/);
reject('问题结果不能只固定预处理版本',d=>{
  const s=d.scenarios.scenarios[1]; s.usage=[];
  const a=s.assessments.find(a=>a.scope==='problem-result');
  a.result='pass'; a.evidence='教学通过假设'; a.bindingVersions=a.bindingVersions.filter(b=>b.binding==='preprocess-v2');
},/完整实际绑定版本/);
reject('公共契约不接收私有字段',d=>d.objects._contract.private={account:'not-public'},/不允许字段/);
rejectContent('entries 契约不接收私有字段',d=>d._contract.private={account:'not-public'},/不允许字段/);
rejectContent('entries 不透传私有字段',d=>d.entries[0].private='secret',/不允许字段/);
rejectContent('独立正文不透传未知字段',d=>d.objectEntries[0].draft='secret',/不允许字段/);
rejectContent('来源不能是本机文件',d=>d.sources.find(s=>s.id==='S01').url='file:///private/paper.pdf',/只接受普通 HTTP/);
rejectContent('来源 trace 不透传正文',d=>d.sources.find(s=>s.id==='S01').trace.fullText='copied',/不允许字段/);
rejectContent('许可依据不透传未知字段',d=>d.sources.find(s=>s.id==='S01').trace.rights.originalText='copied',/不允许字段/);
rejectContent('来源核对日期有效',d=>d.sources.find(s=>s.id==='S01').checkedAt='2026-02-30',/核对日期/);
rejectContent('逐主张定位不可缺',d=>delete d.claims[0].evidence[0].locator,/缺少字段/);
rejectContent('项目依据不得引用本地资料',d=>d.claims.find(c=>c.basisKind==='project-example').projectBasis.document='_local/notes.md',/公共 planning/);
check('运行时评价拒绝其他 API 版本',()=>assert.throws(()=>evaluateScenario({...atlas,formatVersion:2},'photo-A'),/formatVersion/));
console.log(`通过 ${checks} 项三树编译检查；来源、反向索引、虚构状态与过期记录均经真实编译器核验。`);
