/**
 * [INPUT]: 各领域 sources 及可选 objectEntries/claims；依赖 validation 的共用守卫。
 * [OUTPUT]: 校验并编译独立对象正文和逐主张依据，来源继续使用原领域命名空间。
 * [POS]: entries 的扩展边界；旧文档没有扩展时产出空索引，不改变 raw 节点身份。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {fail,string,shape,identity,strings,validUrl,validDate,oneOf} from './validation.mjs';

export function checkedSource(source, path) {
  shape(source,path,'id title url scope checkedAt? trace?');
  identity(source.id,`${path}.id`); string(source.title,`${path}.title`); string(source.scope,`${path}.scope`);
  validUrl(source.url,`${path}.url`); validDate(source.checkedAt,`${path}.checkedAt`);
  if (source.trace!==undefined) {
    const t=source.trace;
    shape(t,`${path}.trace`,'version publisher kind locator availability rights commit? permalink? gitBlob? objectRef?');
    for (const key of ['version','publisher','kind','locator']) string(t[key],`${path}.trace.${key}`);
    oneOf(t.availability,['page-read','not-checked','unavailable'],`${path}.trace.availability`);
    for (const key of ['commit','gitBlob']) if(t[key]!==undefined && !/^[0-9a-f]{40}$/.test(t[key])) fail(path,`${key} 需要 Git 对象 SHA`);
    if(t.permalink!==undefined) validUrl(t.permalink,`${path}.trace.permalink`);
    if(t.objectRef!==undefined) identity(t.objectRef,`${path}.trace.objectRef`);
    const r=t.rights;
    shape(r,`${path}.trace.rights`,'retainedForm basis evidence attribution distribution originals');
    strings(r.retainedForm,`${path}.rights.retainedForm`,1);
    r.retainedForm.forEach(value=>oneOf(value,['link','factual-metadata','original-explanation'],`${path}.rights.retainedForm`));
    string(r.basis,`${path}.rights.basis`); string(r.attribution,`${path}.rights.attribution`);
    oneOf(r.distribution,['metadata-and-original-only'],`${path}.rights.distribution`);
    oneOf(r.originals,['excluded'],`${path}.rights.originals`);
    shape(r.evidence,`${path}.rights.evidence`,'url checkedAt gitBlob?');
    validUrl(r.evidence.url,`${path}.rights.evidence.url`); validDate(r.evidence.checkedAt,`${path}.rights.evidence.checkedAt`);
    if(r.evidence.gitBlob!==undefined && !/^[0-9a-f]{40}$/.test(r.evidence.gitBlob)) fail(path,'许可 Git blob 格式无效');
  }
  return structuredClone(source);
}

export function checkedClaim(claim,at) {
  shape(claim,at,'id statement locator supportScope basisKind objectIds evidence checkedAt projectBasis?'); identity(claim.id,`${at}.id`);
  string(claim.statement,`${at}.statement`); strings(claim.objectIds,`${at}.objectIds`);
  string(claim.locator,`${at}.locator`); string(claim.supportScope,`${at}.supportScope`);
  string(claim.checkedAt,`${at}.checkedAt`); validDate(claim.checkedAt,`${at}.checkedAt`);
  oneOf(claim.basisKind,['source-supported','project-example'],`${at}.basisKind`);
  if(!Array.isArray(claim.evidence)) fail(at,'evidence 需要数组');
  if(claim.basisKind==='source-supported' && (!claim.evidence.length || claim.projectBasis!==undefined)) fail(at,'来源主张须有外部依据，不能混入项目情境');
  if(claim.basisKind==='project-example' && (claim.evidence.length || !claim.projectBasis)) fail(at,'项目情境须保留本地定义依据，不伪造外部来源');
  if(claim.projectBasis) {
    shape(claim.projectBasis,`${at}.projectBasis`,'document locator scope');
    if(!/^planning\/[A-Z0-9-]+\.md$/.test(claim.projectBasis.document)) fail(at,'项目依据必须指向公共 planning 文档');
    string(claim.projectBasis.locator,at); string(claim.projectBasis.scope,at);
  }
  for(const e of claim.evidence) {
    shape(e,`${at}.evidence`,'sourceId locator scope'); string(e.sourceId,at); string(e.locator,at); string(e.scope,at);
  }
  return structuredClone(claim);
}

export function compileContentExtensions(data, domain, filename, localSources, output) {
  const sourceRefs=(ids,at)=>{
    strings(ids,at,1);
    for(const id of ids) if(!localSources.has(id)) fail(at,`来源不存在：${id}`);
    return ids.map(id=>`${domain}:${id}`);
  };
  for (const entry of data.objectEntries || []) {
    const at=`${filename}.objectEntries.${entry.id}`;
    shape(entry,at,'id name summary explanation sourceIds'); identity(entry.id,`${at}.id`);
    if(Object.hasOwn(output.objectEntries,entry.id)) fail(at,'对象正文重复');
    string(entry.name,`${at}.name`); string(entry.summary,`${at}.summary`,8); string(entry.explanation,`${at}.explanation`,24);
    output.objectEntries[entry.id]={...entry,sourceIds:sourceRefs(entry.sourceIds,`${at}.sourceIds`)};
  }
  for (const claim of data.claims || []) {
    const at=`${filename}.claims.${claim.id}`;
    checkedClaim(claim,at);
    if(Object.hasOwn(output.claims,claim.id)) fail(at,'主张重复');
    const evidence=claim.evidence.map(e=>{
      shape(e,`${at}.evidence`,'sourceId locator scope'); string(e.locator,at); string(e.scope,at);
      return {...e,sourceId:sourceRefs([e.sourceId],`${at}.evidence.sourceId`)[0]};
    });
    output.claims[claim.id]={...structuredClone(claim),evidence};
  }
}
