/**
 * [INPUT]: 经引用校验的三树索引与显式虚构情境；依赖 validation 的字段守卫。
 * [OUTPUT]: 校验情境/检查修订、完整实际绑定和条件快照，导出 evaluateScenario 的三值条件与分层结果。
 * [POS]: 公共教学情境边界；状态属于场景和绑定，不传播为知识熟练度或真实运行证据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {fail,string,shape,oneOf,strings,positive,reference,references} from './validation.mjs';

const truth=['true','false','unknown'];
const sameValues=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
function conditionValues(values,atlas,at) {
  if(!values || typeof values!=='object' || Array.isArray(values)) fail(at,'需要条件取值对象');
  for(const [key,value] of Object.entries(values)) { reference(key,atlas.conditions,at); oneOf(value,truth,`${at}.${key}`); }
}
function fictional(value,at) { if(value!==true) fail(at,'公共情境与检查材料必须明确虚构'); }
function scope(record,scenario,at) {
  for(const key of ['scenarioRef','scenarioRevision','solution','solutionRevision','variant','variantRevision']) {
    const expected=key==='scenarioRef'?scenario.id:key==='scenarioRevision'?scenario.revision:scenario[key];
    if(record[key]!==expected) fail(at,`检查或使用记录的 ${key} 与当前情境修订不匹配`);
  }
}
function fictionalMaterial(value,at) {
  shape(value,at,'id? fictional description'); fictional(value.fictional,at); string(value.description,at);
  if(value.id!==undefined && !value.id.startsWith('fictional-')) fail(at,'检查输入必须为虚构标识');
}
function checkBinding(bindingId,role,scenario,atlas,at) {
  const b=reference(bindingId,atlas.bindings,at);
  if(b.variant!==scenario.variant || b.variantRevision!==scenario.variantRevision || (role && b.role!==role)) fail(at,'绑定不属于当前角色/方案修订');
  return b;
}

export function validateScenario(s,atlas) {
  const at=`scenarios.${s.id}`;
  shape(s,at,'id version revision fictional name problem solution solutionRevision variant variantRevision conditionValues provided usage assessments next actorRef');
  fictional(s.fictional,at); string(s.name,at); string(s.provided,at); string(s.next,at); positive(s.revision,at);
  if(s.version!==atlas.version) fail(at,'情境版本与样例版本不匹配');
  if(typeof s.actorRef!=='string' || !s.actorRef.startsWith('fictional-')) fail(at,'公共 actorRef 必须为虚构人物');
  const solution=reference(s.solution,atlas.solutions,at);
  const variant=reference(s.variant,atlas.variants,at);
  if(solution.revision!==s.solutionRevision || variant.revision!==s.variantRevision || variant.solution!==s.solution) fail(at,'方案或变体修订不匹配');
  reference(s.problem,atlas.problems,at); conditionValues(s.conditionValues,atlas,`${at}.conditionValues`);
  if(!Array.isArray(s.usage) || !Array.isArray(s.assessments)) fail(at,'使用与检查需要数组');
  const assessmentIds=new Set(), usageIds=new Set();
  for(const a of s.assessments) {
    const where=`${at}.assessments.${a.id}`;
    shape(a,where,'id scope criterion result fictional evidence? scenarioRef scenarioRevision solution solutionRevision variant variantRevision input environment conditionValues bindingVersions');
    string(a.id,where); if(assessmentIds.has(a.id)) fail(where,'检查 ID 重复'); assessmentIds.add(a.id);
    fictional(a.fictional,where); scope(a,s,where);
    const criterion=reference(a.criterion,atlas.criteria,where);
    if(a.scope!==criterion.scope) fail(where,'检查范围与判据不一致');
    const coverage=Object.values(atlas.coverage).filter(c=>c.variant===s.variant && c.criterion===a.criterion);
    if(!coverage.length) fail(where,'检查判据没有当前变体的问题覆盖');
    oneOf(a.result,['not-checked','pass','fail'],where);
    if(a.result!=='not-checked') string(a.evidence,`${where}.evidence`);
    fictionalMaterial(a.input,`${where}.input`); fictionalMaterial(a.environment,`${where}.environment`);
    conditionValues(a.conditionValues,atlas,`${where}.conditionValues`);
    if(!sameValues(a.conditionValues,s.conditionValues)) fail(where,'条件变化后不能沿用旧检查');
    if(!Array.isArray(a.bindingVersions) || !a.bindingVersions.length) fail(where,'检查缺少固定绑定版本');
    const seen=new Set();
    for(const v of a.bindingVersions) {
      shape(v,where,'binding object objectVersion');
      if(seen.has(v.binding)) fail(where,'检查绑定重复'); seen.add(v.binding);
      const binding=checkBinding(v.binding,null,s,atlas,where);
      if(v.object!==binding.object || v.objectVersion!==atlas.objects[binding.object].version) fail(where,'绑定或对象版本变化后不能沿用旧检查');
    }
    const roles=coverage.flatMap(c=>c.roles);
    const performed=Object.values(atlas.bindings).filter(b=>b.variant===s.variant && b.use==='performs' && (a.scope!=='component' || roles.includes(b.role)));
    if(performed.some(b=>!seen.has(b.id))) fail(where,'检查缺少当前范围所需的完整实际绑定版本');
    if(a.result==='pass') {
      const requirements=a.scope==='problem-result'?solution.requires:coverage.flatMap(c=>c.requires);
      if(requirements.some(id=>s.conditionValues[id]!=='true')) fail(where,'检查通过缺少已满足的适用条件');
    }
  }
  for(const u of s.usage) {
    const where=`${at}.usage.${u.binding}`;
    shape(u,where,'role binding selection activity blocker? assessmentRefs? scenarioRef scenarioRevision solution solutionRevision variant variantRevision');
    scope(u,s,where); checkBinding(u.binding,u.role,s,atlas,where);
    if(usageIds.has(u.binding)) fail(where,'同一绑定的使用记录重复'); usageIds.add(u.binding);
    oneOf(u.selection,['undecided','chosen','not_chosen'],where);
    oneOf(u.activity,['not_started','in_progress','awaiting_check'],where);
    if(u.blocker!==undefined) string(u.blocker,where);
    if(u.assessmentRefs!==undefined) {
      strings(u.assessmentRefs,where);
      for(const id of u.assessmentRefs) {
        if(!assessmentIds.has(id)) fail(where,'使用记录的检查引用不存在');
        if(!s.assessments.find(a=>a.id===id).bindingVersions.some(b=>b.binding===u.binding)) fail(where,'引用的检查未覆盖此绑定');
      }
    }
  }
}

export function evaluateScenario(atlas,scenarioId) {
  if(atlas.formatVersion!==1) fail('atlas','不支持的 formatVersion');
  const source=reference(scenarioId,atlas.scenarios,'scenario');
  const {evaluation:ignored,...s}=source;
  validateScenario(s,atlas);
  const solution=atlas.solutions[s.solution];
  const unmetConditions=solution.requires.filter(id=>s.conditionValues[id]==='false');
  const unknownConditions=solution.requires.filter(id=>!s.conditionValues[id] || s.conditionValues[id]==='unknown');
  const applicability=unmetConditions.length?'inapplicable':unknownConditions.length?'unknown':'applicable';
  const results=scopeName=>{
    const checked=s.assessments.filter(a=>a.scope===scopeName && a.result!=='not-checked');
    if(checked.some(a=>a.result==='fail')) return 'fail';
    return checked.some(a=>a.result==='pass')?'pass':'not-checked';
  };
  return {
    scenarioId:s.id,revision:s.revision,fictional:true,applicability,unmetConditions,unknownConditions,
    next:s.next,callResult:results('solution-call'),problemResult:results('problem-result'),
    bindingStates:Object.values(atlas.bindings).filter(b=>b.variant===s.variant).map(b=>{
      const u=s.usage.find(u=>u.binding===b.id);
      return {binding:b.id,role:b.role,object:b.object,selection:u?.selection??'unrecorded',activity:u?.activity??'unrecorded',blocker:u?.blocker??null};
    }),
  };
}
