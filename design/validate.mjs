/**
 * [INPUT]: 接收 content.json 的概念、资源、关系、来源与入口数据，不读取文件或访问网络。
 * [OUTPUT]: 导出 validateContent，合法数据返回各类数量，非法数据抛出带字段路径的 Error。
 * [POS]: design 的内容边界，由构建与机械检查共用；核对导航形状与关联投影一致性，不裁定知识内容。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// --- 基础字段：错误始终定位到内容中的具体路径 ---
function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(path, '必须是对象');
  }
}

function text(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path, '必须是非空字符串');
}

function identity(value, path) {
  text(value, path);
  if (/\s/.test(value)) fail(path, '标识不能包含空白');
}

function list(value, path) {
  if (!Array.isArray(value)) fail(path, '必须是数组');
}

function textList(value, path) {
  list(value, path);
  value.forEach((entry, index) => text(entry, `${path}[${index}]`));
}

function date(value, path) {
  text(value, path);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value) {
    fail(path, '必须是有效的 YYYY-MM-DD 日期');
  }
}

function url(value, path) {
  text(value, path);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(path, '必须是完整的 HTTP 或 HTTPS 链接');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    fail(path, '只允许 HTTP 或 HTTPS 链接');
  }
}

function indexRecords(entries, path, identities = new Map()) {
  list(entries, path);
  const index = new Map();
  entries.forEach((entry, position) => {
    const at = `${path}[${position}]`;
    record(entry, at);
    identity(entry.id, `${at}.id`);
    if (identities.has(entry.id)) {
      fail(`${at}.id`, `标识 ${entry.id} 重复，已用于 ${identities.get(entry.id)}`);
    }
    identities.set(entry.id, `${at}.id`);
    index.set(entry.id, entry);
  });
  return index;
}

function reference(value, path, index, kind) {
  identity(value, path);
  if (!index.has(value)) fail(path, `引用的${kind} ${value} 不存在`);
}

function references(values, path, index, kind, required = false) {
  list(values, path);
  if (required && !values.length) fail(path, `至少需要一个${kind}引用`);
  const seen = new Set();
  values.forEach((value, position) => {
    const at = `${path}[${position}]`;
    reference(value, at, index, kind);
    if (seen.has(value)) fail(at, `重复引用 ${value}`);
    seen.add(value);
  });
}

function fields(entry, path, names) {
  names.forEach(name => text(entry[name], `${path}.${name}`));
}

// --- 内容身份：概念与资源共享关系端点，其余集合各自管理标识 ---
export function validateContent(content) {
  record(content, 'content');
  if (content.schemaVersion !== 1) fail('content.schemaVersion', '当前版本必须是 1');
  date(content.verifiedAt, 'content.verifiedAt');

  const identities = new Map();
  const concepts = indexRecords(content.concepts, 'content.concepts', identities);
  const resources = indexRecords(content.resources, 'content.resources', identities);
  const sources = indexRecords(content.sources, 'content.sources');
  indexRecords(content.relations, 'content.relations');
  const routes = indexRecords(content.routes, 'content.routes');

  content.sources.forEach((source, index) => {
    const at = `content.sources[${index}]`;
    text(source.title, `${at}.title`);
    url(source.url, `${at}.url`);
    date(source.checkedAt, `${at}.checkedAt`);
  });

  content.concepts.forEach((concept, index) => {
    const at = `content.concepts[${index}]`;
    fields(concept, at, ['name', 'summary', 'why', 'mechanism', 'boundary']);
    references(concept.resourceIds, `${at}.resourceIds`, resources, '资源');
    references(concept.sourceIds, `${at}.sourceIds`, sources, '来源', true);
  });

  content.resources.forEach((resource, index) => {
    const at = `content.resources[${index}]`;
    fields(resource, at, ['name', 'kind', 'summary', 'purpose', 'environment']);
    textList(resource.requirements, `${at}.requirements`);
    textList(resource.limits, `${at}.limits`);
    url(resource.officialUrl, `${at}.officialUrl`);
    date(resource.verifiedAt, `${at}.verifiedAt`);
    references(resource.sourceIds, `${at}.sourceIds`, sources, '来源', true);
    references(resource.conceptIds, `${at}.conceptIds`, concepts, '概念');
  });

  // --- 关系语义：实现连接资源与概念；比较连接资源，并写明比较条件 ---
  const implementations = new Set();
  const pairKey = (resourceId, conceptId) => JSON.stringify([resourceId, conceptId]);
  content.relations.forEach((relation, index) => {
    const at = `content.relations[${index}]`;
    if (!['implements', 'comparable'].includes(relation.type)) {
      fail(`${at}.type`, '只允许 implements 或 comparable');
    }
    text(relation.label, `${at}.label`);
    reference(relation.from, `${at}.from`, resources, '资源');
    if (relation.type === 'implements') {
      reference(relation.to, `${at}.to`, concepts, '概念');
      implementations.add(pairKey(relation.from, relation.to));
    } else {
      reference(relation.to, `${at}.to`, resources, '资源');
      if (relation.from === relation.to) fail(`${at}.to`, '比较必须连接两个不同资源');
    }
    text(relation.condition, `${at}.condition`);
    references(relation.sourceIds, `${at}.sourceIds`, sources, '来源', true);
  });

  // --- 一份关联的三个投影：双向清单与 implements 必须表达同一组连接 ---
  content.concepts.forEach((concept, index) => {
    concept.resourceIds.forEach((resourceId, position) => {
      const at = `content.concepts[${index}].resourceIds[${position}]`;
      if (!resources.get(resourceId).conceptIds.includes(concept.id)) {
        fail(at, `资源 ${resourceId} 的 conceptIds 缺少概念 ${concept.id}`);
      }
      if (!implementations.has(pairKey(resourceId, concept.id))) {
        fail(at, `缺少 ${resourceId} 指向 ${concept.id} 的 implements 关系`);
      }
    });
  });
  content.resources.forEach((resource, index) => {
    resource.conceptIds.forEach((conceptId, position) => {
      if (!concepts.get(conceptId).resourceIds.includes(resource.id)) {
        fail(`content.resources[${index}].conceptIds[${position}]`,
          `概念 ${conceptId} 的 resourceIds 缺少资源 ${resource.id}`);
      }
    });
  });
  content.relations.forEach((relation, index) => {
    if (relation.type === 'implements' && !resources.get(relation.from).conceptIds.includes(relation.to)) {
      fail(`content.relations[${index}].to`, 'implements 关系未记录在概念与资源的双向清单中');
    }
  });

  // --- 三个入口只保存路径和引用，不复制详情正文 ---
  const routeTypes = {home: 'role', domains: 'domain', products: 'product'};
  const routeFields = new Set(['id', 'title', 'relation', 'steps', 'conceptId', 'resourceIds']);
  if (routes.size !== 3 || Object.keys(routeTypes).some(id => !routes.has(id))) {
    fail('content.routes', '必须各有一个 home、domains、products 入口');
  }
  let sharedConcept, sharedResources;
  content.routes.forEach((route, index) => {
    const at = `content.routes[${index}]`;
    for (const key of Object.keys(route)) {
      if (!routeFields.has(key)) fail(`${at}.${key}`, '入口只保存导航字段与引用，不嵌入详情正文');
    }
    text(route.title, `${at}.title`);
    if (route.relation !== routeTypes[route.id]) {
      fail(`${at}.relation`, `${route.id} 入口必须使用 ${routeTypes[route.id]} 关系`);
    }
    textList(route.steps, `${at}.steps`);
    if (route.steps.length !== 3) fail(`${at}.steps`, '导航路径必须恰好有三层');
    reference(route.conceptId, `${at}.conceptId`, concepts, '概念');
    references(route.resourceIds, `${at}.resourceIds`, resources, '资源', true);
    const resourceSet = new Set(route.resourceIds);
    if (index === 0) {
      sharedConcept = route.conceptId;
      sharedResources = resourceSet;
    } else {
      if (route.conceptId !== sharedConcept) fail(`${at}.conceptId`, '三个入口必须指向同一概念');
      if (resourceSet.size !== sharedResources.size || [...resourceSet].some(id => !sharedResources.has(id))) {
        fail(`${at}.resourceIds`, '三个入口必须指向同一资源集合');
      }
    }
  });

  return {
    concepts: concepts.size,
    resources: resources.size,
    relations: content.relations.length,
    sources: sources.size,
    routes: routes.size,
  };
}
