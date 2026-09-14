/**
 * [INPUT]: 同一编译结果 ATLAS、既有详情的 esc/detailParagraphs、entry 可见性控制与 URLSearchParams。
 * [OUTPUT]: atlasRestore/atlasHide 与问题—角色—知识图、情境条件、材料/主张/关系往返详情。
 * [POS]: 照片分类有限样例的阅读层；只消费编译索引，不复制正文或持久化个人使用记录。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const atlasView = document.getElementById('atlas-view');
const atlasKindNames = {'model-family':'模型家族','model-architecture':'模型架构','code-implementation':'代码实现','model-weights':'模型权重',documentation:'资料与使用约定',paper:'研究论文','software-project':'软件项目'};
const atlasRelationNames = {'family-subtype-of':'家族细分于','architecture-spec-of':'架构规格属于','variant-of':'架构变体于',implements:'实现','loadable-by':'适配加载于','proposes-evaluates':'提出并评估','converted-release-of':'转换发布','preprocessing-for':'配套预处理','category-order-for':'配套类别顺序'};
const atlasRelationName = relation => atlasRelationNames[relation.type] || relation.meaning || relation.type;
const atlasValueNames = {true:'满足',false:'不满足',unknown:'未知'};
const atlasUseNames = {explains:'解释结构',performs:'实际承担'};
const atlasSelectionNames = {undecided:'未定',chosen:'已选',not_chosen:'本次不选'};
const atlasActivityNames = {not_started:'未开始',in_progress:'接入中',awaiting_check:'待检查'};
const atlasResultNames = {'not-checked':'尚未检查',pass:'教学假设通过',fail:'教学假设未通过'};
const atlasScopeNames = {component:'部件检查','solution-call':'方案调用','problem-result':'问题结果'};
const atlasApplicabilityNames = {inapplicable:'此变体不适用于当前目标',unknown:'先确认条件，再开始尝试',applicable:'具备尝试条件，结果仍要检查'};
let atlasScenario = 'photo-A';
let atlasScenarioChanged = false;
let atlasFrame;
function atlasRecord(table,id) { return Object.hasOwn(table,id) ? table[id] : null; }
function atlasUrl(type, id, scenario = atlasScenario) {
  const params = new URLSearchParams({atlas:scenario});
  if (type && id) params.set(type,id);
  return '#'+params.toString();
}
function atlasLink(type, id, label, className = '') {
  return '<a class="'+esc(className)+'" href="'+esc(atlasUrl(type,id))+'">'+esc(label)+'</a>';
}
function atlasList(items, render) { return items.length ? '<ul>'+items.map(item=>'<li>'+render(item)+'</li>').join('')+'</ul>' : '<p class="atlas-muted">本样例尚未建立这类连接。</p>'; }
function atlasConditionList(ids, scenario) {
  if(!ids.length) return '<p class="atlas-condition-note">本项没有额外条件；整个方案仍须满足上方列出的适用条件。</p>';
  return '<ul class="atlas-conditions">'+ids.map(id=>{
    const value=scenario.conditionValues[id] || 'unknown';
    return '<li data-value="'+esc(value)+'"><span>'+esc(atlasValueNames[value] || '未知')+'</span>'+esc(ATLAS.conditions[id].statement)+'</li>';
  }).join('')+'</ul>';
}
function atlasScenarioResults(scenario) {
  const evaluation=scenario.evaluation;
  return '<section class="atlas-progress" aria-label="当前检查与下一步"><dl><div><dt>方案调用</dt><dd>'+esc(atlasResultNames[evaluation.callResult])+'</dd></div><div><dt>问题结果</dt><dd>'+esc(atlasResultNames[evaluation.problemResult])+'</dd></div></dl><p><strong>下一步</strong> '+esc(evaluation.next)+'</p></section>';
}
function atlasClaimLinks(ids) { return ids?.length ? '<p class="atlas-evidence-links">依据：'+ids.map(id=>atlasLink('claim',id,'主张 '+id)).join(' · ')+'</p>' : ''; }
function atlasRole(solution,id) { return Array.isArray(solution.roles) ? solution.roles.find(role=>role.id===id) : solution.roles[id]; }
function atlasCoverageSummary(coverage,scenario,solution) {
  return atlasLink('problem',coverage.problem,ATLAS.problems[coverage.problem].name)+' ← '+coverage.roles.map(id=>atlasLink('role',id,atlasRole(solution,id).name)).join('、')+atlasConditionList(coverage.requires,scenario)+'<p>'+atlasLink('criterion',coverage.criterion,ATLAS.criteria[coverage.criterion].expected)+'</p>'+atlasClaimLinks(coverage.claimIds);
}
function atlasSourceName(id) { return ATLAS.sources[id]?.title || id; }
function atlasObjectName(id) { return ATLAS.objects[id]?.name || id; }
function atlasRelationsFor(id) {
  return (ATLAS.indexes.objectRelations[id] || []).map(r=>typeof r==='string'?ATLAS.relations[r]:r);
}
function atlasBody(object) {
  const body=object.body;
  return '<p class="atlas-summary">'+esc(body.summary)+'</p><div class="atlas-prose">'+detailParagraphs(body.explanation)+'</div>';
}
function atlasHeader(title, kind, subtitle='') {
  return '<p class="atlas-eyebrow">'+esc(kind)+'</p><h2 id="atlas-detail-title" tabindex="-1">'+esc(title)+'</h2>'+(subtitle?'<p class="atlas-muted">'+esc(subtitle)+'</p>':'');
}
function atlasObjectDetail(object, scenario, solution) {
  const uses=(ATLAS.indexes.objectUses[object.id] || []).map(id=>ATLAS.bindings[id]).filter(binding=>binding.variant===scenario.variant);
  let html=atlasHeader(object.name,atlasKindNames[object.kind] || object.kind,object.version || '')+atlasBody(object);
  if(object.rawNodes?.length) html+='<p class="atlas-evidence-links">地图位置：'+object.rawNodes.map(ref=>{
    const raw=typeof ref==='number'?ref:ref.raw ?? ref.node;
    return '<a href="#node='+raw+'">'+esc(N[raw]?.n || '#'+raw)+' #'+raw+'</a>';
  }).join(' · ')+'</p>';
  html+='<h3>在这个方案里做什么</h3>'+atlasList(uses,binding=>atlasLink('binding',binding.id,atlasRole(solution,binding.role)?.name+' · '+atlasUseNames[binding.use]));
  html+='<h3>与哪些知识或资料相连</h3>'+atlasList(atlasRelationsFor(object.id),r=>atlasLink('relation',r.id,atlasObjectName(r.from)+' → '+atlasRelationName(r)+' → '+atlasObjectName(r.to)));
  const claimIds=ATLAS.indexes.objectClaims[object.id] || object.claimIds || [];
  html+='<h3>解释依据</h3>'+atlasList(claimIds,id=>atlasLink('claim',id,ATLAS.claims[id].statement));
  html+='<h3>资料入口</h3>'+atlasList(object.body.sourceIds || [],id=>atlasLink('source',id,atlasSourceName(id)));
  return html;
}
function atlasBindingDetail(binding,scenario,solution) {
  const role=atlasRole(solution,binding.role), object=ATLAS.objects[binding.object];
  const usage=(scenario.usage || []).find(record=>record.binding===binding.id && record.role===binding.role);
  let html=atlasHeader(object.name+' · '+role.name,'方案中的角色绑定',atlasUseNames[binding.use])+
    '<p>'+esc(role.purpose)+'</p><p>'+atlasLink('object',object.id,'认识 '+object.name)+' · '+atlasLink('role',role.id,'返回这个角色')+'</p>'+
    '<h3>当前条件</h3>'+atlasConditionList(binding.requires || [],scenario);
  html+='<h3>这个虚构情境里的使用情况</h3>'+(usage?'<p>选择：'+esc(atlasSelectionNames[usage.selection] || usage.selection)+'；接入：'+esc(atlasActivityNames[usage.activity] || usage.activity)+'</p>'+(usage.blocker?'<p>当前阻碍：'+esc(usage.blocker)+'</p>':''):'<p>尚未记录该绑定的使用情况。</p>');
  html+='<p class="atlas-muted">这是情境 '+esc(scenario.name)+' 的角色记录。已选或接入不表示已经理解，也不表示问题已经解决。</p>';
  const records=(scenario.assessments || []).filter(a=>a.bindingVersions.some(v=>v.binding===binding.id));
  html+='<h3>与它相关的检查</h3>'+atlasList(records,a=>'<strong>'+esc(atlasScopeNames[a.scope])+'：'+esc(atlasResultNames[a.result])+'</strong><br>'+esc(a.evidence || '本例没有实际结果证据')+' · '+atlasLink('criterion',a.criterion,'查看判据'));
  return html;
}
function atlasRoleDetail(role,scenario,solution) {
  const bindings=(ATLAS.indexes.roleBindings[scenario.variant+':'+role.id] || []).map(id=>ATLAS.bindings[id]);
  const coverage=(ATLAS.indexes.roleCoverage[scenario.variant+':'+role.id] || []).map(id=>ATLAS.coverage[id]);
  let html=atlasHeader(role.name,'方案角色',role.required?'本方案必需':'按条件需要')+'<p>'+esc(role.purpose)+'</p>';
  html+='<h3>覆盖什么问题</h3>'+atlasList(coverage,c=>atlasCoverageSummary(c,scenario,solution));
  html+='<h3>由哪些对象解释或承担</h3>'+atlasList(bindings,b=>atlasLink('binding',b.id,atlasUseNames[b.use]+' · '+atlasObjectName(b.object)));
  if(role.scenarioInputs?.length) html+='<p>还需要当前项目的目标照片、人工标签和事先约定的评估标准；知识对象不能替你提供这些输入。</p>';
  const connections=Object.values(ATLAS.connections).filter(x=>x.variant===scenario.variant && [x.from,x.to].some(endpoint=>endpoint.kind==='role'?endpoint.id===role.id:bindings.some(b=>b.id===endpoint.id)));
  html+='<h3>怎样和其他部件协作</h3>'+atlasList(connections,x=>atlasLink('connection',x.id,x.meaning));
  return html;
}
function atlasProblemDetail(problem,scenario,solution) {
  const coverage=(ATLAS.indexes.problemCoverage[problem.id] || []).map(id=>ATLAS.coverage[id]);
  let html=atlasHeader(problem.name,'问题 · 想改变什么')+'<p>'+esc(problem.obstacle || problem.desiredOutcome)+'</p>';
  html+=atlasClaimLinks(problem.claimIds);
  if(problem.allOf?.length) html+='<h3>这些子问题都要处理</h3>'+atlasList(problem.allOf,id=>atlasLink('problem',id,ATLAS.problems[id].name));
  html+=atlasList(coverage,c=>atlasCoverageSummary(c,scenario,solution));
  return html;
}
function atlasClaimEvidence(claim) {
  return claim.evidence || [];
}
function atlasClaimDetail(claim) {
  let html=atlasHeader(claim.statement,'主张与依据',claim.id);
  html+='<h3>支撑这一说法的具体位置</h3>'+atlasList(atlasClaimEvidence(claim),e=>atlasLink('source',e.sourceId,atlasSourceName(e.sourceId))+'<p>'+esc(e.locator)+'</p><p>'+esc(e.scope || claim.scope || '')+'</p>');
  if(claim.supportScope || claim.boundary) html+='<h3>支撑范围与限制</h3><p>'+esc(claim.supportScope || claim.boundary)+'</p>';
  if(claim.basisKind==='project-example') html+='<p class="atlas-muted">此项是本项目的解释或虚构情境约定，不能当作文献标准或实测结果。</p><p>'+esc(claim.projectBasis.scope)+' · '+esc(claim.projectBasis.document)+' / '+esc(claim.projectBasis.locator)+'</p>';
  const objects=Object.values(ATLAS.objects).filter(o=>(ATLAS.indexes.objectClaims[o.id] || o.claimIds || []).includes(claim.id));
  html+='<h3>这条主张影响哪些对象</h3>'+atlasList(objects,o=>atlasLink('object',o.id,o.name));
  html+='<h3>支撑哪些关系</h3>'+atlasList(ATLAS.indexes.claimRelations[claim.id] || [],id=>atlasLink('relation',id,atlasRelationName(ATLAS.relations[id])));
  const scenario=atlasRecord(ATLAS.scenarios,atlasScenario);
  const coverage=Object.values(ATLAS.coverage).filter(c=>c.variant===scenario.variant && c.claimIds.includes(claim.id));
  const connections=Object.values(ATLAS.connections).filter(c=>c.variant===scenario.variant && c.claimIds.includes(claim.id));
  if(coverage.length || connections.length) html+='<h3>这条依据如何进入方案</h3>'+atlasList(coverage,c=>atlasLink('problem',c.problem,'覆盖问题：'+ATLAS.problems[c.problem].name))+atlasList(connections,c=>atlasLink('connection',c.id,c.meaning));
  return html;
}
function atlasSourceDetail(source,id) {
  const trace=source.trace || {},rights=trace.rights || {};
  let html=atlasHeader(source.title,'来源材料',trace.publisher || '')+'<dl class="atlas-meta"><dt>版本</dt><dd>'+esc(trace.version || '未记录版本')+'</dd><dt>核对位置</dt><dd>'+esc(trace.locator || source.scope || '未记录具体位置')+'</dd><dt>本次查看</dt><dd>'+esc(source.checkedAt || '未核对')+'</dd></dl>';
  html+='<p><a class="atlas-external" href="'+esc(trace.permalink || source.url)+'" target="_blank" rel="noopener noreferrer">打开所核资料 ↗</a></p>';
  html+='<h3>这份资料支持什么</h3>'+atlasList(ATLAS.indexes.sourceClaims[id] || [],claim=>atlasLink('claim',claim,ATLAS.claims[claim].statement));
  html+='<details class="atlas-rights"><summary>来源使用范围</summary><p>'+esc(rights.retainedForm || '仅保留出处与原创解释，不包含第三方原件。')+'</p><p>'+esc(rights.basis || '原件再分发依据未核定')+'</p><p>'+esc(rights.attribution || '')+'</p></details>';
  html+='<p class="atlas-muted">日期与位置描述已记录的查看范围；没有在本项目安装模型、下载权重或执行推理。打开外部资料需要联网。</p>';
  return html;
}
function atlasDetail(type,id,scenario,solution) {
  if(type==='object' && atlasRecord(ATLAS.objects,id)) return atlasObjectDetail(ATLAS.objects[id],scenario,solution);
  if(type==='binding' && atlasRecord(ATLAS.bindings,id)) return atlasBindingDetail(ATLAS.bindings[id],scenario,solution);
  if(type==='role' && atlasRole(solution,id)) return atlasRoleDetail(atlasRole(solution,id),scenario,solution);
  if(type==='problem' && atlasRecord(ATLAS.problems,id)) return atlasProblemDetail(ATLAS.problems[id],scenario,solution);
  if(type==='claim' && atlasRecord(ATLAS.claims,id)) return atlasClaimDetail(ATLAS.claims[id]);
  if(type==='source' && atlasRecord(ATLAS.sources,id)) return atlasSourceDetail(ATLAS.sources[id],id);
  if(type==='criterion' && atlasRecord(ATLAS.criteria,id)) {
    const criterion=ATLAS.criteria[id],coverage=Object.values(ATLAS.coverage).filter(c=>c.variant===scenario.variant && c.criterion===id);
    let html=atlasHeader('怎样判断这一项完成','结果判据',atlasScopeNames[criterion.scope])+'<p>'+esc(criterion.expected)+'</p><p class="atlas-muted">'+esc(criterion.notEvidenceOf?'这是本样例的练习约定，不代表'+criterion.notEvidenceOf+'。':'本页没有实际执行记录，判据存在不等于已经通过。')+'</p>';
    html+='<h3>用在什么问题与角色上</h3>'+atlasList(coverage,c=>atlasCoverageSummary(c,scenario,solution));
    const bindings=[...new Set(scenario.assessments.filter(a=>a.criterion===id).flatMap(a=>a.bindingVersions.map(v=>v.binding)))];
    if(bindings.length) html+='<h3>本情境检查了哪些部件</h3>'+atlasList(bindings,b=>atlasLink('binding',b,atlasObjectName(ATLAS.bindings[b].object)));
    return html;
  }
  if(type==='relation' && atlasRecord(ATLAS.relations,id)) {
    const relation=ATLAS.relations[id];return atlasHeader(atlasRelationName(relation),'有条件的知识关系',id)+'<p>'+atlasLink('object',relation.from,atlasObjectName(relation.from))+' → '+esc(atlasRelationName(relation))+' → '+atlasLink('object',relation.to,atlasObjectName(relation.to))+'</p><p>'+esc(relation.constraint || relation.scope || relation.qualifier || relation.supportScope || '')+'</p>'+atlasClaimLinks(relation.claimIds);
  }
  if(type==='connection' && atlasRecord(ATLAS.connections,id)) {
    const connection=ATLAS.connections[id],endpoint=value=>value.kind==='binding'?atlasLink('binding',value.id,atlasObjectName(ATLAS.bindings[value.id].object)):atlasLink('role',value.id,atlasRole(solution,value.id).name);
    return atlasHeader(connection.meaning,'方案部件怎样协作',id)+'<p>'+endpoint(connection.from)+' → '+endpoint(connection.to)+'</p><p>'+esc(connection.constraint)+'</p>'+(connection.relationId?'<p>'+atlasLink('relation',connection.relationId,'核对对象之间的适配关系')+'</p>':'')+atlasClaimLinks(connection.claimIds);
  }
  if(type) return atlasHeader('未找到这个样例入口','引用未解析')+'<p>当前版本没有这条 '+esc(type)+' 引用。'+atlasLink(null,null,'返回完整样例')+'</p>';
  return atlasHeader(solution.name,'方案 · '+solution.variant.name)+'<p>'+esc(scenario.provided)+'</p><h3>现在先做什么</h3><p>'+esc(scenario.evaluation.next)+'</p><h3>这套方案没有覆盖</h3>'+atlasList(solution.excludes,x=>esc(x))+'<p>'+atlasLink('object','b01:resnet-paper','从论文与实现继续探索')+'</p>';
}
function atlasDiagram(scenario,solution) {
  const problems=ATLAS.problems[scenario.problem].allOf || [];
  return '<section class="atlas-diagram" aria-label="问题、方案与知识的对应图"><div class="atlas-lane-head"><span>问题 · 哪些事都要完成</span><span>方案 · 哪个角色覆盖它</span><span>知识 · 用什么解释或执行</span></div>'+problems.map(id=>{
    const problem=ATLAS.problems[id],covers=(ATLAS.indexes.problemCoverage[id] || []).map(c=>ATLAS.coverage[c]).filter(c=>c.variant===scenario.variant);
    return covers.map(cover=>cover.roles.map(roleId=>{
      const role=atlasRole(solution,roleId),bindings=Object.values(ATLAS.bindings).filter(b=>b.role===roleId && b.variant===scenario.variant);
      return '<div class="atlas-map-row"><div class="atlas-map-node">'+atlasLink('problem',id,problem.name)+'<small>需要达成 →</small></div><div class="atlas-map-node atlas-role-node">'+atlasLink('role',role.id,role.name)+'<small>'+esc(role.purpose)+'</small><small class="atlas-edge-label">由此角色覆盖 · '+atlasLink('criterion',cover.criterion,'按判据检查')+'</small></div><div class="atlas-bindings">'+(bindings.length?bindings.map(b=>'<div><span class="atlas-edge-label">'+esc(atlasUseNames[b.use])+' →</span>'+atlasLink('object',b.object,atlasObjectName(b.object))+' '+atlasLink('binding',b.id,'角色情况','atlas-binding-link')+'</div>').join(''):'<div><span class="atlas-edge-label">需要情境输入 →</span>'+atlasLink('role',role.id,'目标照片、人工标签与评估判据')+'</div>')+'</div></div>';
    }).join('')).join('');
  }).join('')+'<p class="atlas-map-note">四个子问题都需要处理。箭头说明对应与职责，条件满足也不代表已经解决。点击对象后可反查同一角色与条件。</p></section>';
}
function atlasHide() { cancelAnimationFrame(atlasFrame);atlasView.hidden=true;atlasView.inert=true;document.body.classList.remove('atlas-mode'); }
function atlasRestore() {
  if(!location.hash.startsWith('#atlas=')) return false;
  cancelAnimationFrame(atlasFrame);
  entrySetView(false);
  entryCloseMapOverlays();
  document.documentElement.classList.toggle('entry-document',true);
  for(const part of entryMapParts){part.hidden=true;part.inert=true;}
  atlasView.hidden=false;atlasView.inert=false;document.body.classList.add('atlas-mode');
  const params=new URLSearchParams(location.hash.slice(1));atlasScenario=params.get('atlas');
  const scenario=atlasRecord(ATLAS.scenarios,atlasScenario);
  if(!scenario){
    document.title='未找到情境 · CS Atlas';
    atlasView.innerHTML='<main><h1 id="atlas-missing" tabindex="-1">未找到这个情境</h1><p><a href="#atlas=photo-A">打开照片分类样例</a> · <a href="#map">回到地图</a></p></main>';
    document.getElementById('atlas-missing').focus({preventScroll:true});window.scrollTo(0,0);return true;
  }
  const solution=ATLAS.solutions[scenario.solution];
  const type=['object','binding','role','problem','claim','source','relation','connection','criterion'].find(key=>params.has(key));
  const status=atlasApplicabilityNames[scenario.evaluation.applicability];
  document.title='照片分类样例 · 计算机世界';
  atlasView.innerHTML='<header class="atlas-top"><a href="#map">← 返回地图</a><span>计算机世界 / 照片分类样例</span><a href="#intro">网站介绍</a></header><main aria-labelledby="atlas-heading"><div class="atlas-title-row"><div><p class="atlas-eyebrow">从一件想做的事，认识它用到的知识</p><h1 id="atlas-heading" tabindex="-1">让程序给照片分类，需要哪些东西？</h1></div><a class="atlas-old-node" href="#node=1453">CNN 在全域地图的位置 ↗</a></div><section class="atlas-scenario"><label for="atlas-scenario-select">换个处境看看<select id="atlas-scenario-select">'+Object.values(ATLAS.scenarios).map(s=>'<option value="'+esc(s.id)+'"'+(s.id===scenario.id?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label><div><strong>'+esc(status)+'</strong><p>'+esc(scenario.provided)+'</p><small>虚构教学情境 · 没有记录你的个人使用状态</small></div></section>'+atlasConditionList(solution.requires,scenario)+atlasScenarioResults(scenario)+atlasDiagram(scenario,solution)+'<section class="atlas-reading" id="atlas-detail" aria-label="选中项的解释与依据">'+(type?'<p class="atlas-current-context">当前：'+esc(scenario.name)+' · '+esc(status)+' · '+atlasLink(null,null,'查看条件与下一步')+'</p>':'')+atlasDetail(type,params.get(type),scenario,solution)+'</section><footer class="atlas-bottom"><span>本地内容可离线阅读 · 样例版本 '+esc(ATLAS.version)+'</span>'+atlasLink(null,null,'回到完整样例')+'</footer></main>';
  const select=document.getElementById('atlas-scenario-select');
  select.addEventListener('change',()=>{atlasScenarioChanged=true;location.hash=atlasUrl(type,params.get(type),select.value);});
  const focusDetail=Boolean(type) && !atlasScenarioChanged;
  atlasScenarioChanged=false;
  const route=location.hash;
  atlasFrame=requestAnimationFrame(()=>{
    if(location.hash!==route || atlasView.hidden) return;
    const target=document.getElementById(focusDetail?'atlas-detail-title':'atlas-heading');
    target?.focus({preventScroll:true});
    if(focusDetail) document.getElementById('atlas-detail')?.scrollIntoView({block:'start'});
    else window.scrollTo(0,0);
  });
  return true;
}
