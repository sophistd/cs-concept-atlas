/**
 * [INPUT]: readContent 的节点/正文/来源结果及五份公共三树 JSON；依赖 validation 和 atlas-scenarios。
 * [OUTPUT]: 导出 readAtlas/compileAtlas/evaluateScenario；生成可内联的 ID 索引、出处往返和虚构情境判定。
 * [POS]: 三树的唯一编译入口；只读取白名单文件，不采集来源、不执行模型、不导出独立快照。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fail,string,shape,identity,oneOf,strings,positive,reference,references,indexRecords,validUrl,validateContract} from './validation.mjs';
import {validateScenario,evaluateScenario} from './atlas-scenarios.mjs';
import {checkedClaim,checkedSource} from './atlas-content.mjs';
export {evaluateScenario};

const documentFields={objects:'objects',problems:'problems',solutions:'solutions conditions criteria',scenarios:'scenarios',mappings:'bindings coverage connections relations'};
const kinds=['model-family','model-architecture','software-project','protocol','paper','code-implementation','model-weights','documentation'];
const relationKinds={
  'family-subtype-of':['model-family',['model-family']],
  'architecture-spec-of':['model-architecture',['model-family']],
  'variant-of':['model-architecture',['model-architecture']],
  'implements':['code-implementation',['model-architecture']],
  'loadable-by':['model-weights',['code-implementation']],
  'proposes-evaluates':['paper',['model-family','model-architecture']],
  'converted-release-of':['code-implementation',['model-architecture']],
  'preprocessing-for':['model-weights',['code-implementation']],
  'category-order-for':['model-weights',['documentation']],
};
const add=(table,key,value)=>{(table[key]??=[]).push(value);};
const unique=values=>[...new Set(values)];

function documentsVersion(documents) {
  shape(documents,'atlas documents',Object.keys(documentFields).join(' '));
  const version=documents.objects.version;
  string(version,'objects.version');
  for(const [name,fields] of Object.entries(documentFields)) {
    const d=documents[name]; shape(d,name,`_contract? formatVersion version ${fields}`);
    validateContract(d._contract,`${name}._contract`);
    if(d.formatVersion!==1) fail(name,'不支持的 formatVersion');
    if(d.version!==version) fail(name,'公共文件版本不一致');
  }
  return version;
}
function validateObjects(atlas,enriched) {
  const rawOwners=new Map();
  for(const o of Object.values(atlas.objects)) {
    const at=`objects.${o.id}`;
    shape(o,at,'id name kind version rawNodes bodyRef claimIds artifact?');
    string(o.name,at); string(o.version,at); oneOf(o.kind,kinds,at); references(o.claimIds,atlas.claims,at);
    if(!Array.isArray(o.rawNodes)) fail(at,'rawNodes 需要身份列表');
    const seen=new Set();
    for(const raw of o.rawNodes) {
      shape(raw,at,'node name');
      if(!Number.isInteger(raw.node) || !enriched.nodes[raw.node] || enriched.nodes[raw.node].n!==raw.name) fail(at,'原 raw 编号/预期名称不匹配');
      if(seen.has(raw.node)) fail(at,'raw 落点重复'); seen.add(raw.node);
      const canonical=enriched.content.byNode[raw.node]?.canonical;
      if(canonical===undefined) fail(at,'原节点没有正文索引');
      const previous=rawOwners.get(canonical);
      if(previous && previous.id!==o.id) fail(at,previous.kind!==o.kind?'显式同物 kind 冲突':'显式同物身份重复');
      rawOwners.set(canonical,o);
      add(atlas.indexes.rawObjects,raw.node,o.id);
    }
    shape(o.bodyRef,`${at}.bodyRef`,'node? id?');
    if(Object.keys(o.bodyRef).length!==1) fail(at,'正文引用须恰好指定一个 node 或 id');
    let body;
    if(o.bodyRef.node!==undefined) {
      if(!seen.has(o.bodyRef.node)) fail(at,'正文 raw 必须属于本对象落点');
      const meta=enriched.content.byNode[o.bodyRef.node],node=enriched.nodes[o.bodyRef.node];
      body={summary:node.g,explanation:node.m,sourceIds:meta.sourceIds};
    } else {
      const entry=reference(o.bodyRef.id,enriched.content.objectEntries||{},at);
      if(entry.name!==o.name) fail(at,'对象正文名称不匹配');
      body={summary:entry.summary,explanation:entry.explanation,sourceIds:entry.sourceIds};
    }
    references(body.sourceIds,enriched.content.sources,at,1);
    if(o.artifact!==undefined) {
      const a=o.artifact; shape(a,`${at}.artifact`,'url availability downloaded sha256 rights distribution'); validUrl(a.url,at);
      oneOf(a.availability,['not-checked','unavailable'],at); oneOf(a.downloaded,[false],at); oneOf(a.sha256,[null],at);
      oneOf(a.rights,['not-determined'],at); oneOf(a.distribution,['excluded'],at);
    }
    o.rawNodes=o.rawNodes.map(r=>r.node); o.body=structuredClone(body); delete o.bodyRef;
    o.body.sourceIds.forEach(id=>{atlas.sources[id]=checkedSource(enriched.content.sources[id],`sources.${id}`);});
  }
  for(const [id,body] of Object.entries(enriched.content.objectEntries||{})) {
    shape(body,`objectEntries.${id}`,'id name summary explanation sourceIds');
    if(body.id!==id) fail(id,'正文索引与 ID 不一致');
    string(body.summary,id,8); string(body.explanation,id,24);
    if(!Object.values(atlas.objects).some(o=>o.name===body.name && o.id===id)) fail(id,'独立正文没有对应对象身份');
  }
}
function validateClaims(atlas,enriched) {
  for(const claim of Object.values(atlas.claims)) {
    const at=`claims.${claim.id}`;
    references(claim.objectIds,atlas.objects,at);
    for(const e of claim.evidence) {
      const source=reference(e.sourceId,enriched.content.sources,at);
      if(!source.trace) fail(at,'主张来源缺少版本、位置和分发依据');
      atlas.sources[e.sourceId]=checkedSource(source,`sources.${e.sourceId}`);
      add(atlas.indexes.sourceClaims,e.sourceId,claim.id);
    }
    claim.objectIds.forEach(id=>add(atlas.indexes.objectClaims,id,claim.id));
  }
  for(const o of Object.values(atlas.objects)) {
    o.claimIds.forEach(id=>add(atlas.indexes.objectClaims,o.id,id));
    o.claimIds=unique(atlas.indexes.objectClaims[o.id]||[]);
  }
  for(const source of Object.values(atlas.sources)) if(source.trace?.objectRef) reference(source.trace.objectRef,atlas.objects,`source.${source.id}.objectRef`);
}
function validateProblems(atlas) {
  for(const p of Object.values(atlas.problems)) {
    const at=`problems.${p.id}`;
    shape(p,at,'id name desiredOutcome claimIds obstacle? allOf? criterion?'); string(p.name,at); string(p.desiredOutcome,at);
    if(p.obstacle!==undefined) string(p.obstacle,at);
    references(p.claimIds,atlas.claims,at,1);
    if(p.allOf!==undefined) references(p.allOf,atlas.problems,at,1);
    if(p.criterion!==undefined) reference(p.criterion,atlas.criteria,at);
    if(!p.allOf && !p.criterion) fail(at,'子问题须有检查判据');
  }
  const visited=new Set(),active=new Set();
  const visit=id=>{
    if(active.has(id)) fail(id,'问题分解存在循环'); if(visited.has(id)) return;
    active.add(id); for(const child of atlas.problems[id].allOf||[]) visit(child); active.delete(id); visited.add(id);
  };
  Object.keys(atlas.problems).forEach(visit);
}
function validateSolutions(atlas) {
  for(const c of Object.values(atlas.conditions)) {
    shape(c,`conditions.${c.id}`,'id statement claimIds'); string(c.statement,c.id); references(c.claimIds,atlas.claims,c.id,1);
  }
  for(const c of Object.values(atlas.criteria)) {
    shape(c,`criteria.${c.id}`,'id scope expected excludes? fictional? notEvidenceOf?'); string(c.expected,c.id);
    oneOf(c.scope,['component','solution-call','problem-result'],c.id);
    if(c.excludes!==undefined) references(c.excludes,atlas.problems,c.id);
    if(c.fictional!==undefined) oneOf(c.fictional,[true],c.id);
    if(c.notEvidenceOf!==undefined) string(c.notEvidenceOf,c.id);
  }
  for(const s of Object.values(atlas.solutions)) {
    const at=`solutions.${s.id}`;
    shape(s,at,'id revision name variant requires roles connectionIds excludes nextWhenUnknown claimIds');
    positive(s.revision,at); string(s.name,at); string(s.nextWhenUnknown,at); strings(s.excludes,at,1);
    references(s.requires,atlas.conditions,at,1); references(s.claimIds,atlas.claims,at,1);
    references(s.connectionIds,atlas.connections,at,1);
    shape(s.variant,`${at}.variant`,'id revision name'); identity(s.variant.id,at); positive(s.variant.revision,at); string(s.variant.name,at);
    if(Object.hasOwn(atlas.variants,s.variant.id)) fail(at,'方案变体 ID 重复');
    atlas.variants[s.variant.id]={...s.variant,solution:s.id,solutionRevision:s.revision};
    const roles=indexRecords(s.roles,`${at}.roles`);
    for(const r of Object.values(roles)) {
      shape(r,`${at}.${r.id}`,'id name purpose required scenarioInputs?'); string(r.name,at); string(r.purpose,at); oneOf(r.required,[true],at);
      if(r.scenarioInputs!==undefined) strings(r.scenarioInputs,at,1);
    }
  }
}
function variantRole(record,role,atlas,at) {
  const v=reference(record.variant,atlas.variants,at);
  if(record.variantRevision!==v.revision) fail(at,'绑定/覆盖/连接的变体修订不匹配');
  const r=atlas.solutions[v.solution].roles.find(r=>r.id===role);
  if(!r) fail(at,`方案角色不存在：${role}`);
  return r;
}
function declaredConditions(record,atlas,at) {
  const variant=reference(record.variant,atlas.variants,at);
  const required=atlas.solutions[variant.solution].requires;
  if(record.requires.some(id=>!required.includes(id))) fail(at,'绑定/覆盖条件必须进入方案必要条件');
}
function validateMappings(atlas) {
  for(const b of Object.values(atlas.bindings)) {
    const at=`bindings.${b.id}`;
    shape(b,at,'id variant variantRevision role object use requires'); variantRole(b,b.role,atlas,at);
    const o=reference(b.object,atlas.objects,at); oneOf(b.use,['explains','performs'],at); references(b.requires,atlas.conditions,at);
    declaredConditions(b,atlas,at);
    if(b.use==='performs' && ['model-family','model-architecture','paper'].includes(o.kind)) fail(at,'家族/架构/论文只能解释，不能冒充运行部件');
    add(atlas.indexes.objectUses,b.object,b.id); add(atlas.indexes.roleBindings,`${b.variant}:${b.role}`,b.id);
  }
  for(const c of Object.values(atlas.coverage)) {
    const at=`coverage.${c.id}`;
    shape(c,at,'id problem variant variantRevision roles requires criterion claimIds excludes');
    const p=reference(c.problem,atlas.problems,at); strings(c.roles,at,1); c.roles.forEach(r=>variantRole(c,r,atlas,at));
    references(c.requires,atlas.conditions,at); reference(c.criterion,atlas.criteria,at); references(c.claimIds,atlas.claims,at,1); references(c.excludes,atlas.problems,at);
    declaredConditions(c,atlas,at);
    if(p.criterion && p.criterion!==c.criterion) fail(at,'覆盖判据与问题结果不匹配');
    add(atlas.indexes.problemCoverage,c.problem,c.id); c.roles.forEach(r=>add(atlas.indexes.roleCoverage,`${c.variant}:${r}`,c.id));
  }
  for(const x of Object.values(atlas.connections)) {
    const at=`connections.${x.id}`;
    shape(x,at,'id from to meaning constraint claimIds variant variantRevision relationId?'); string(x.meaning,at); string(x.constraint,at); references(x.claimIds,atlas.claims,at,1);
    if(x.from.kind===x.to.kind && x.from.id===x.to.id) fail(at,'协作连接不能是自环');
    for(const e of [x.from,x.to]) {
      shape(e,at,'kind id'); oneOf(e.kind,['role','binding'],at);
      const r=e.kind==='role'?e.id:reference(e.id,atlas.bindings,at).role; variantRole(x,r,atlas,at);
      if(e.kind==='binding' && (atlas.bindings[e.id].variant!==x.variant || atlas.bindings[e.id].variantRevision!==x.variantRevision)) fail(at,'协作连接混入其他变体绑定');
    }
    if(x.from.kind==='binding' || x.to.kind==='binding') {
      if(x.from.kind!=='binding' || x.to.kind!=='binding' || !x.relationId) fail(at,'绑定协作必须引用对应对象关系');
      const relation=reference(x.relationId,atlas.relations,at);
      if(relation.type!=='loadable-by' || atlas.bindings[x.from.id].object!==relation.from || atlas.bindings[x.to.id].object!==relation.to) fail(at,'加载连接方向或绑定与对象关系不匹配');
    } else if(x.relationId!==undefined) fail(at,'角色数据流不直接绑定对象关系');
  }
  for(const r of Object.values(atlas.relations)) {
    const at=`relations.${r.id}`;
    shape(r,at,'id from type to claimIds supportScope review'); reference(r.from,atlas.objects,at); reference(r.to,atlas.objects,at);
    oneOf(r.type,Object.keys(relationKinds),at); references(r.claimIds,atlas.claims,at,1); string(r.supportScope,at); oneOf(r.review,['source-reviewed'],at);
    const [fromKind,toKinds]=relationKinds[r.type];
    if(r.from===r.to || atlas.objects[r.from].kind!==fromKind || !toKinds.includes(atlas.objects[r.to].kind)) fail(at,'关系方向或对象种类不匹配');
    add(atlas.indexes.objectRelations,r.from,r.id); add(atlas.indexes.objectRelations,r.to,r.id);
    r.claimIds.forEach(id=>add(atlas.indexes.claimRelations,id,r.id));
  }
  for(const s of Object.values(atlas.solutions)) for(const r of s.roles) {
    const key=`${s.variant.id}:${r.id}`;
    if(!atlas.indexes.roleCoverage[key]?.length) fail(key,'必要角色没有问题覆盖');
    if(!atlas.indexes.roleBindings[key]?.some(id=>atlas.bindings[id].use==='performs') && !r.scenarioInputs?.length) fail(key,'必要角色缺少实际部件或情境输入');
    if(!Object.values(atlas.connections).some(x=>x.variant===s.variant.id && [x.from,x.to].some(e=>e.kind==='role'?e.id===r.id:atlas.bindings[e.id].role===r.id))) fail(key,'必要角色没有协作连接');
  }
  for(const s of Object.values(atlas.solutions)) {
    const adjacency=Object.fromEntries(s.roles.map(r=>[r.id,[]]));
    const bindings=Object.values(atlas.bindings).filter(b=>b.variant===s.variant.id && b.use==='performs');
    for(const weight of bindings.filter(b=>atlas.objects[b.object].kind==='model-weights')) {
      const loading=s.connectionIds.map(id=>atlas.connections[id]).some(x=>{
        const relation=atlas.relations[x.relationId];
        return relation?.type==='loadable-by' && x.from.kind==='binding' && x.from.id===weight.id && bindings.some(b=>b.id===x.to.id && b.object===relation.to);
      });
      if(!loading) fail(weight.id,'必要权重缺少对应实现的加载协作');
    }
    for(const id of s.connectionIds) {
      const x=atlas.connections[id];
      if(x.variant!==s.variant.id || x.variantRevision!==s.variant.revision) fail(id,'必要连接不属于当前方案变体');
      const role=e=>e.kind==='role'?e.id:atlas.bindings[e.id].role;
      const from=role(x.from),to=role(x.to);
      if(from!==to) adjacency[from].push(to);
    }
    const done=new Set(),active=new Set();
    const visit=id=>{
      if(active.has(id)) fail(s.id,'方案协作角色流存在循环'); if(done.has(id)) return;
      active.add(id); adjacency[id].forEach(visit); active.delete(id); done.add(id);
    };
    Object.keys(adjacency).forEach(visit);
  }
  for(const p of Object.values(atlas.problems)) if(!p.allOf && !atlas.indexes.problemCoverage[p.id]?.length) fail(p.id,'子问题没有方案覆盖');
}

export function compileAtlas(enriched,documents) {
  const version=documentsVersion(documents);
  if(!Array.isArray(enriched?.nodes) || !enriched.content?.sources || !enriched.content.byNode) fail('enriched','需要 readContent 的节点和内容结果');
  const atlas={formatVersion:1,version,objects:indexRecords(documents.objects.objects,'objects'),problems:indexRecords(documents.problems.problems,'problems'),
    solutions:indexRecords(documents.solutions.solutions,'solutions'),conditions:indexRecords(documents.solutions.conditions,'conditions'),criteria:indexRecords(documents.solutions.criteria,'criteria'),
    scenarios:indexRecords(documents.scenarios.scenarios,'scenarios'),claims:structuredClone(enriched.content.claims||{}),sources:Object.create(null),variants:Object.create(null),
    indexes:Object.fromEntries(['rawObjects','objectUses','objectRelations','objectClaims','sourceClaims','claimRelations','problemCoverage','roleBindings','roleCoverage'].map(k=>[k,Object.create(null)]))};
  for(const key of ['bindings','coverage','connections','relations']) atlas[key]=indexRecords(documents.mappings[key],key);
  for(const [id,c] of Object.entries(atlas.claims)) {
    checkedClaim(c,`claims.${id}`); if(c.id!==id) fail(id,'主张索引与 ID 不一致');
  }
  validateObjects(atlas,enriched); validateClaims(atlas,enriched); validateProblems(atlas); validateSolutions(atlas); validateMappings(atlas);
  for(const s of Object.values(atlas.scenarios)) validateScenario(s,atlas);
  for(const table of Object.values(atlas.indexes)) for(const key of Object.keys(table)) table[key]=unique(table[key]);
  for(const s of Object.values(atlas.scenarios)) s.evaluation=evaluateScenario(atlas,s.id);
  return atlas;
}
export function readAtlas(enriched,dataDirectory) {
  const documents=Object.fromEntries(Object.keys(documentFields).map(name=>[name,JSON.parse(readFileSync(join(dataDirectory,`${name}.json`),'utf8'))]));
  return compileAtlas(enriched,documents);
}
