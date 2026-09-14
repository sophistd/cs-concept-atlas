/**
 * [INPUT]: 树导航、CONTENT 正文与来源、graph 的 mgShow，以及 ATLAS 的可选旧节点映射。
 * [OUTPUT]: paint/esc 与来源、上层概念、子节点、跨领域关系组成的唯一详情面板。
 * [POS]: 选择节点后的阅读入口；同网址合并支撑范围与核对日期，外链仅在点击时访问。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const card = document.getElementById('card');
const detailKinds = {root:'全景导航', group:'知识领域', concept:'概念与部件', item:'具体条目', contrast:'概念辨析'};
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function detailParagraphs(value) {
  return String(value || '').split(/\n+/).filter(Boolean).map(line => '<p>'+esc(line)+'</p>').join('');
}
function detailLink(node, subtitle) {
  return '<button type="button" class="ri" data-go="'+node.i+'"><span class="rn">'+esc(node.n)+'</span>'+
    '<span class="rp">'+esc(subtitle ?? node.g)+'</span></button>';
}
function detailSources(node) {
  const entry = CONTENT.byNode[node.i];
  if (!entry) return '';
  const byUrl = new Map();
  for (const id of new Set([...entry.sourceIds, ...(entry.context?.sourceIds || [])])) {
    const source = CONTENT.sources[id], prior = byUrl.get(source.url);
    if (!prior) byUrl.set(source.url, {...source, scopes:new Set([source.scope])});
    else {
      prior.scopes.add(source.scope);
      if (source.checkedAt && (!prior.checkedAt || source.checkedAt > prior.checkedAt)) prior.checkedAt = source.checkedAt;
    }
  }
  return '<section class="detail-sources"><h3>资料与继续阅读 <span>'+byUrl.size+'</span></h3>'+
    [...byUrl.values()].map(source => {
      return '<a class="source-link" href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">'+
        '<strong>'+esc(source.title)+' <span aria-hidden="true">↗</span></strong><span>'+esc([...source.scopes].join('；'))+'</span>'+
        '<small>'+(source.checkedAt ? '页面核对 '+esc(source.checkedAt) : '参考链接 · 尚待逐页核验')+'</small></a>';
    }).join('')+'<p class="source-note">资料用于核查与延伸阅读；列出链接不等于每条解释都已完成审阅。打开外部资料需要联网。</p></section>';
}
function detailAtlasEntries(node) {
  if(typeof ATLAS==='undefined') return '';
  const objects=ATLAS.indexes.rawObjects[node.i] || [];
  if(!objects.length) return '';
  return '<section class="atlas-node-entry"><h3>放进一个具体问题里看</h3>'+objects.map(id=>'<a href="#atlas=photo-A&amp;object='+encodeURIComponent(id)+'">'+esc(ATLAS.objects[id].name)+'怎样用于照片分类 ↗</a>').join('')+'<p>从同一对象查看方案角色、必要条件与依据；教学情境不代表真实项目已经完成。</p></section>';
}
function paint(node) {
  const entry = CONTENT.byNode[node.i];
  const ancestors = [];
  let parent = node.p == null ? null : N[node.p];
  while (parent) { ancestors.unshift(parent); parent = parent.p == null ? null : N[parent.p]; }
  let html = '<nav class="crumb" aria-label="当前节点位置">'+ancestors.map(item =>
    '<button type="button" data-go="'+item.i+'">'+esc(item.n)+'</button>').join('<span aria-hidden="true"> › </span>')+'</nav>';
  html += '<div class="detail-title"><div><span class="entry-kind">'+esc(detailKinds[node.t] || '知识条目')+'</span>'+
    '<h1 class="nm">'+esc(node.n)+'</h1></div><div class="detail-actions"><button class="gb read-toggle" type="button" data-read aria-expanded="'+document.body.classList.contains('reading')+'">'+(document.body.classList.contains('reading')?'显示关联图':'展开阅读')+'</button><a class="node-anchor" href="#node='+node.i+'" aria-label="此节点的固定地址">#'+node.i+'</a></div></div>';
  if (node.e) html += '<div class="en2">'+esc(node.e)+'</div>';
  html += '<div class="rule"></div><div class="gl">'+esc(node.g)+'</div>';
  if (node.i === 0) {
    html += '<div class="detail-copy"><p>从左边点开一个领域，再沿概念找到具体项目、算法或例子。点名称看说明，点圆点展开下一层。</p><p>右上方的关联图把同一对象在不同领域的落点连起来。每条具体说明下方都有相关资料入口，可以继续查证。</p></div>';
  } else {
    html += '<section class="detail-copy"><h3>怎样理解</h3>'+detailParagraphs(node.m)+'</section>';
    if (entry?.context) {
      const local = entry.context;
      const extra = (local.summary !== node.g ? '<p>'+esc(local.summary)+'</p>' : '')+
        (local.explanation !== node.m ? detailParagraphs(local.explanation) : '');
      if (extra) html += '<section class="detail-copy"><h3>在这个位置的用法</h3>'+extra+'</section>';
    }
    html += detailSources(node);
    html += detailAtlasEntries(node);
    const concept = node.d > 1 ? N[node.p] : null;
    if (concept) html += '<details class="detail-context"><summary>上层'+(concept.t==='group'?'领域':'概念')+'：'+esc(concept.n)+'</summary><p>'+esc(concept.g)+'</p>'+detailParagraphs(concept.m)+detailLink(concept, '回到上层，查看其他组成或例子')+'</details>';
    if (entry?.locations.length > 1) html += '<details class="detail-context"><summary>同一对象在 '+entry.locations.length+' 个位置出现</summary><p>各处共享基础说明，并补充它在当前领域的用法。位置和相邻关系随领域变化。</p>'+entry.locations.filter(id => id !== node.i).map(id => detailLink(N[id], crumb(N[id]))).join('')+'</details>';
  }
  if (node.c.length) {
    const children = node.c.map(id => N[id]);
    html += '<section class="child-list"><h3>'+(node.d===0?'从一个领域开始':node.d===1?'继续看概念':'具体例子与组成')+' <span>'+children.length+'</span></h3>'+children.map(child => detailLink(child)).join('')+'</section>';
  }
  if (node.r?.length) {
    const grouped = {};
    node.r.forEach(([id,label]) => { if (label !== '同一个东西') (grouped[label] ||= []).push(id); });
    html += '<section class="related-list"><h3>跨领域关系</h3>';
    for (const [label, ids] of Object.entries(grouped)) {
      const heading = label === '可以互相替代' ? '可比较的方案' : label === '固定搭配' ? '常见配合' : label;
      html += '<h4>'+esc(heading)+'</h4>';
      if (label === '可以互相替代') html += '<p class="source-note">这是原有关系中的比较线索。是否能替换，仍需核对接口、运行环境和具体需求。</p>';
      html += [...new Set(ids)].map(id => detailLink(N[id], crumb(N[id]))).join('');
    }
    html += '</section>';
  }
  card.innerHTML = html;
  card.dataset.node = String(node.i);
  card.scrollTop = 0;
  mgShow(node);
}
card.addEventListener('click', event => {
  const read = event.target.closest('[data-read]');
  if (read) {
    const expanded = document.body.classList.toggle('reading');
    read.textContent = expanded ? '显示关联图' : '展开阅读';
    read.setAttribute('aria-expanded', String(expanded));
    if (!expanded) requestAnimationFrame(() => mgShow(N[Number(card.dataset.node)]));
    return;
  }
  const link = event.target.closest('[data-go]');
  if (link) goto(Number(link.dataset.go));
});
