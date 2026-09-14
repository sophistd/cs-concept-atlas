/**
 * [INPUT]: 原分类节点与各领域条目文件；依赖 validation 和 atlas-content 核验可选三树正文与来源。
 * [OUTPUT]: 导出 compileContent/readContent，产生浏览器节点、来源、可选 objectEntries/claims 与覆盖统计。
 * [POS]: 构建前的内容边界；核对节点身份、所属领域、引用与完整覆盖，同一对象在浏览器复用正文。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fail,string,array,object,validDate,validUrl,shape,validateContract} from './validation.mjs';
import {checkedSource,compileContentExtensions} from './atlas-content.mjs';

// --- 分类先过身份与父子关系检查，避免正文挂到错误的节点 ---
export function validateNodes(nodes) {
  array(nodes, 'nodes');
  nodes.forEach((node, index) => {
    if (node.i !== index) fail(`nodes[${index}]`, '节点编号与数组位置不符');
    string(node.n, `nodes[${index}].n`);
    array(node.c, `nodes[${index}].c`);
    if (new Set(node.c).size !== node.c.length) fail(`nodes[${index}].c`, '重复子节点');
    if (index === 0 && node.p !== null) fail('nodes[0].p', '根节点不能有父节点');
    if (index > 0 && (!nodes[node.p] || !nodes[node.p].c.includes(index))) fail(`nodes[${index}].p`, '父节点不存在或缺少反向子引用');
    for (const child of node.c) if (!nodes[child] || nodes[child].p !== index) fail(`nodes[${index}].c`, '父子引用不一致');
    for (const [target] of node.r || []) if (!Number.isInteger(target) || !nodes[target]) fail(`nodes[${index}].r`, '关联端点不存在');
    const seen = new Set([index]);
    let parent = node.p;
    while (parent !== null) {
      if (seen.has(parent)) fail(`nodes[${index}].p`, '分类父链存在循环');
      seen.add(parent); parent = nodes[parent]?.p ?? null;
    }
  });
}

export function compileContent(nodes, documents) {
  validateNodes(nodes);
  const entries = new Map(), sources = {}, domains = new Set();
  const extensions={objectEntries:Object.create(null),claims:Object.create(null)};
  for (const {filename, data} of documents) {
    shape(data, filename, 'domain name sources entries objectEntries? claims? _contract?');
    validateContract(data._contract,`${filename}._contract`);
    const domain = nodes[data.domain];
    if (!domain || domain.t !== 'group' || domain.n !== data.name) fail(filename, '领域身份与分类库不符');
    if (domains.has(domain.i)) fail(filename, '领域重复');
    domains.add(domain.i);
    array(data.sources, `${filename}.sources`);
    array(data.entries, `${filename}.entries`);
    const localSources = new Set();
    for (const source of data.sources) {
      object(source, `${filename}.sources`);
      string(source.id, `${filename}.source.id`);
      if (localSources.has(source.id)) fail(filename, `来源 ID 重复：${source.id}`);
      localSources.add(source.id);
      string(source.title, `${filename}.${source.id}.title`);
      string(source.scope, `${filename}.${source.id}.scope`);
      validUrl(source.url, `${filename}.${source.id}.url`);
      validDate(source.checkedAt, `${filename}.${source.id}.checkedAt`);
      sources[`${domain.i}:${source.id}`] = checkedSource(source,`${filename}.${source.id}`);
    }
    if(data.objectEntries!==undefined) array(data.objectEntries,`${filename}.objectEntries`);
    if(data.claims!==undefined) array(data.claims,`${filename}.claims`);
    compileContentExtensions(data,domain.i,filename,localSources,extensions);
    for (const entry of data.entries) {
      const at = `${filename} #${entry.node}`;
      shape(entry, at, 'node name summary explanation sourceIds');
      const node = nodes[entry.node];
      if (!Number.isInteger(entry.node) || !node || node.n !== entry.name) fail(at, '条目编号/名称与分类库不符');
      let owner = node;
      while (owner.p !== null && owner.d > 1) owner = nodes[owner.p];
      if (owner.i !== domain.i) fail(at, '条目不属于此领域');
      if (entries.has(entry.node)) fail(at, '条目重复');
      string(entry.summary, `${at}.summary`, 8);
      string(entry.explanation, `${at}.explanation`, 24);
      array(entry.sourceIds, `${at}.sourceIds`);
      if (!entry.sourceIds.length) fail(at, '至少需要一个相关资料入口');
      if (new Set(entry.sourceIds).size !== entry.sourceIds.length) fail(at, '来源引用重复');
      for (const id of entry.sourceIds) if (!localSources.has(id)) fail(at, `来源不存在：${id}`);
      entries.set(entry.node, {...entry, sourceIds:entry.sourceIds.map(id => `${domain.i}:${id}`)});
    }
  }
  const missing = nodes.filter(node => node.i > 0 && !entries.has(node.i));
  if (missing.length) fail('内容覆盖', `还缺 ${missing.length} 个节点：${missing.slice(0, 8).map(node => `#${node.i} ${node.n}`).join('、')}`);

  // --- 只合并显式“同一个东西”关系，不能把同名、同类或可比较当同一对象 ---
  const parents = nodes.map(node => node.i);
  const find = value => {
    while (parents[value] !== value) { parents[value] = parents[parents[value]]; value = parents[value]; }
    return value;
  };
  for (const node of nodes) for (const [target, label] of node.r || []) {
    if (label === '同一个东西') {
      const a = find(node.i), b = find(target);
      parents[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const families = new Map();
  for (const node of nodes) {
    const id = find(node.i);
    if (!families.has(id)) families.set(id, []);
    families.get(id).push(node.i);
  }
  const byNode = {}, enriched = nodes.map(node => ({...node}));
  for (const members of families.values()) {
    const canonical = members.find(id => entries.has(id));
    if (canonical === undefined) continue;
    const entry = entries.get(canonical);
    for (const id of members) {
      enriched[id].g = entry.summary;
      enriched[id].m = entry.explanation;
      delete enriched[id].draft;
      const local = entries.get(id);
      const differs = local && (local.summary !== entry.summary || local.explanation !== entry.explanation ||
        local.sourceIds.length !== entry.sourceIds.length || local.sourceIds.some(source => !entry.sourceIds.includes(source)));
      const context = id !== canonical && differs
        ? {summary:local.summary, explanation:local.explanation, sourceIds:local.sourceIds} : null;
      byNode[id] = {canonical, sourceIds:entry.sourceIds, locations:members, ...(context ? {context} : {})};
    }
  }
  return {nodes:enriched, content:{sources, byNode, ...extensions, coverage:{
    domains:domains.size, entries:entries.size,
    leaves:nodes.filter(node => !node.c.length).length,
    sources:Object.keys(sources).length,
    checkedSources:Object.values(sources).filter(source => source.checkedAt).length,
  }}};
}

export function readContent(nodes, directory) {
  const documents = readdirSync(directory).filter(name => name.endsWith('.json')).sort().map(filename => ({
    filename, data:JSON.parse(readFileSync(join(directory, filename), 'utf8')),
  }));
  return compileContent(nodes, documents);
}
