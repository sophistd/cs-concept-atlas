/**
 * [INPUT]: build.mjs 内联的 CATALOG，template.html 的页面与首页模板。
 * [OUTPUT]: 软件职责、知识领域、产品用途三个入口，以及共享概念和资源详情。
 * [POS]: design 的交互协调层；哈希只记录入口/主题/资源身份，正文始终从同一对象读取。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
(() => {
  'use strict';
  const {content, panorama} = CATALOG;
  const concepts = new Map(content.concepts.map(c => [c.id, c]));
  const resources = new Map(content.resources.map(r => [r.id, r]));
  const sources = new Map(content.sources.map(s => [s.id, s]));
  const routes = new Map(content.routes.map(r => [r.id, r]));
  const main = document.getElementById('main');
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const url = (route, id) => `#${route}/storage${id ? '/' + encodeURIComponent(id) : ''}`;
  const external = (href, label, className = '') => `<a class="${className}" href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;
  const status = ready => `<span class="status${ready ? ' ready' : ''}">${ready ? '已核对来源' : '只有定位 · 待整理'}</span>`;

  // --- 首页部件描述是设计语境，不是项目资源的另一份正文 ---
  const roles = {
    storage: {name:'保存和查找信息',question:'点下保存后，记录去哪里？',summary:'页面关闭后，记录可能还需要留下来。程序要有办法保存它，也要能在需要时找回来。',example:'从这一个部件出发，认识两种数据库，以及它们不同的运行方式。'},
    interface: {name:'界面与入口',question:'人怎样告诉软件要做什么？',summary:'按钮、页面、命令行，都是进入软件的方式。入口接收操作，再把处理结果呈现给人。',example:'手机应用、命令行脚本和网页，可以采用不同的入口。'},
    logic: {name:'程序逻辑',question:'收到一个操作，接着做什么？',summary:'检查输入、计算结果、安排动作，这些规则决定软件的行为。它们可以在本机运行，也可以由远端程序处理。',example:'“保存记录”可能先检查内容，再调用存储部件。'},
    network: {name:'与其他系统协作',question:'有些事情，交给谁来做？',summary:'软件可以通过接口请求另一个系统的能力，也可能完全独立工作。需要协作时，再认识协议、接口和数据交换。',example:'调用地图、邮件服务或模型接口，是不同的协作场景。'},
    runtime: {name:'运行环境',question:'代码在哪里真正执行？',summary:'操作系统、语言运行时和托管环境，为软件提供执行代码与访问资源的条件。不同软件需要的组合不同。',example:'脚本在你的电脑上运行，也可以被部署到另一台机器。'},
    agent: {name:'人与 Coding Agent',question:'谁来表达目标，谁来检查结果？',summary:'人说明希望解决的问题，Agent 协助生成和修改代码。软件运行后是否符合目标，还需要观察与验证。',example:'这是制作软件的一种方式。用 AI 写代码，并不意味着成品必须带 AI 功能。'},
    editor: {name:'开发工具',question:'怎样看见并修改正在做的东西？',summary:'编辑器、调试器等工具帮助查看代码、定位问题和观察运行。它们与最终交付的软件承担不同职责。',example:'工具的具体种类、代表项目和适用环境将在后续整理。'},
    testing: {name:'测试工具',question:'怎样知道改动是否符合预期？',summary:'把需要检查的行为变成可以重复运行的验证。工具执行检查，人仍需决定哪些结果才是正确的。',example:'检查能不能保存、能不能再次读出，是数据功能的具体问题。'},
    delivery: {name:'版本与发布工具',question:'怎样记录变化，让别人也能使用？',summary:'版本工具记录改动，构建与发布工具帮助准备和交付软件。部署方式取决于软件准备在哪里运行。',example:'交付一个本地文件与运行一个在线服务，需要的安排不同。'}
  };
  const products = [
    {name:'需要保存记录的网页应用',desc:'从待办、笔记等记录出发，认识信息如何留下来。',sample:true},
    {name:'自动化脚本',desc:'把重复操作交给程序，可能从文件或命令行进入。',detail:'脚本可以处理文件、调用接口，也可能完全不需要网页界面或数据库。'},
    {name:'手机应用',desc:'围绕手机上的交互、本地数据与设备能力探索。',detail:'应用可能只用本地数据，也可能与远端系统同步。具体资源与组合仍待整理。'},
    {name:'桌面应用',desc:'从电脑上的窗口、文件和操作系统能力进入。',detail:'桌面应用的运行环境、数据位置与交付方式需要一起考虑，本轮尚未整理完整资源。'},
    {name:'带 AI 能力的应用',desc:'把模型作为一种能力，接入具体的软件用途。',detail:'模型能力只是其中一部分；界面、数据和运行安排仍由产品需求决定。本轮尚未整理完整资源。'}
  ];
  function rolePanel(id) {
    const role = roles[id];
    const panel = document.getElementById('role-inspector');
    if (!panel || !role) return;
    panel.innerHTML = `<p class="eyebrow">${escape(role.question)}</p><h2>${escape(role.name)}</h2>${status(id === 'storage')}
      <p>${escape(role.summary)}</p><p class="role-example">${escape(role.example)}</p>
      ${id === 'storage' ? `<a class="action" href="${url('home')}">走进数据存储方案 <span aria-hidden="true">→</span></a>` : '<p class="incomplete">这一部分先保留位置，具体资源还在整理。可回到「保存和查找信息」体验完整样板。</p>'}`;
    document.querySelectorAll('[data-role]').forEach(button => {
      const selected = button.dataset.role === id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function heading(eyebrow, title, intro) {
    return `<section class="page-heading"><p class="eyebrow">${escape(eyebrow)}</p><h1>${escape(title)}</h1><p class="intro">${escape(intro)}</p></section>`;
  }
  function renderHome() {
    main.append(document.getElementById('home-template').content.cloneNode(true));
    rolePanel('storage');
    main.insertAdjacentHTML('beforeend', sharedRoutes('home'));
  }
  function renderDomains() {
    main.innerHTML = heading('按知识领域找位置', '把视野拉远一点。', '这里保留原有的 24 个域。数据库与存储已接入本轮样板，其余领域继续作为待整理的探索底稿。') +
      `<div class="overview-layout"><section><div class="domain-list">${panorama.map((domain, index) => {
        const selected = domain.name === '数据库与存储';
        const inside = `<span class="ordinal">${String(index + 1).padStart(2,'0')}</span><strong>${escape(domain.name)}</strong>${selected ? '<span class="status ready">含已核对样板</span>' : status(false)}`;
        return selected ? `<a class="domain-row featured" href="${url('domains')}">${inside}</a>` : `<button class="domain-row" data-domain="${index}">${inside}</button>`;
      }).join('')}</div><p class="overview-note">“只有定位”表示保留了原型中的名称和一句说明；不代表该领域的全部内容已经核实。</p></section>
      <aside id="domain-inspector" class="role-inspector" aria-live="polite"><p class="eyebrow">本轮可走通的分支</p><h2>数据库与存储</h2><p>先理解保存和查找信息的职责，再看 SQLite、PostgreSQL 两个具体项目。</p><p class="role-example">你将从领域归属出发，抵达与首页相同的资源。</p><a class="action" href="${url('domains')}">进入存储样板 <span aria-hidden="true">→</span></a></aside></div>` + sharedRoutes('domains');
  }
  function renderProducts() {
    main.innerHTML = heading('按想做的东西找线索', '从一个产品，认识它的部件。', '这些入口帮助你发现可能用到的技术。具体组成随需求而变，本轮先展开有记录保存需求的网页应用。') +
      `<div class="overview-layout"><section class="product-list">${products.map((product, index) => {
        const inner = `<span class="ordinal">${String(index + 1).padStart(2,'0')}</span><div><strong>${escape(product.name)}</strong><small>${escape(product.desc)}</small></div><span class="go" aria-hidden="true">${product.sample ? '→' : '+'}</span>`;
        return product.sample ? `<a class="product-row featured" href="${url('products')}">${inner}</a>` : `<button class="product-row" data-product="${index}">${inner}</button>`;
      }).join('')}</section><aside id="product-inspector" class="role-inspector" aria-live="polite"><p class="eyebrow">以记录待办为例</p><h2>关掉页面，记录还在。</h2><p>从这个需求进入，看看“保存与查询”部件可以由什么实现。</p><p class="role-example">这里先展开持久化数据，不承诺已经覆盖一个网页应用的全部组成。</p><a class="action" href="${url('products')}">发现相关方案 <span aria-hidden="true">→</span></a></aside></div>` + sharedRoutes('products');
  }
  function breadcrumbs(route, resource) {
    return `<nav class="breadcrumbs" aria-label="当前位置"><a href="#${route.id}">${escape(route.steps[0])}</a><span aria-hidden="true">/</span><span>${escape(route.steps[1])}</span><span aria-hidden="true">/</span>
      ${resource ? `<a href="${url(route.id)}">${escape(route.steps[2])}</a><span aria-hidden="true">/</span><b>${escape(resource.name)}</b>` : `<b>${escape(route.steps[2])}</b>`}</nav>`;
  }
  function sharedRoutes(current, resourceId) {
    return `<section class="shared-routes" aria-labelledby="route-title"><h2 id="route-title">从哪里进入，都能找到它。</h2><p>职责、领域、产品用途是三种找法。切换入口，内容仍是同一份。</p>
      <div class="route-diagram">${content.routes.map(route => `<a class="route-branch" href="${url(route.id, resourceId)}" ${route.id === current ? 'aria-current="page"' : ''}><strong>${escape(route.title)}</strong><span>${escape(route.steps[1])} ↓</span></a>`).join('')}</div>
      <div class="converge"><span>${resourceId ? escape(resources.get(resourceId).name) : content.routes[0].resourceIds.map(id => escape(resources.get(id).name)).join(' / ')} · 同一份资源说明</span></div></section>`;
  }
  function conceptNote(concept, relation) {
    return `<details class="concept-note" data-concept-id="${escape(concept.id)}"><summary>${escape(concept.name)}${relation ? ` · ${escape(relation.label)}` : ''}</summary>
      <p><strong>为什么需要它：</strong>${escape(concept.why)}</p><p><strong>怎样运作：</strong>${escape(concept.mechanism)}</p><p><strong>边界：</strong>${escape(concept.boundary)}</p>
      ${relation ? `<p><strong>这条关系的条件：</strong>${escape(relation.condition)}</p>` : ''}
      <p>依据：${sourceLinks([...new Set([...concept.sourceIds, ...(relation?.sourceIds || [])])])}</p></details>`;
  }
  function sourceLinks(ids) {
    return ids.map(id => { const source = sources.get(id); return external(source.url, source.title); }).join(' · ');
  }
  function renderTopic(route) {
    const concept = concepts.get(route.conceptId);
    main.innerHTML = breadcrumbs(route) + `<div class="topic-layout"><section>
      <div class="topic-intro"><p class="eyebrow">${escape(route.steps[1])}</p><h1>${escape(concept.name)}</h1><p>${escape(concept.summary)}</p>
      <div class="explain-grid"><div><h2>从一个需求开始</h2><p>${escape(concept.why)}</p></div><div><h2>它在软件里的分工</h2><p>${escape(concept.mechanism)}</p></div></div></div>
      <div class="resource-list"><h2>沿着关系型数据库这条路，认识两个项目</h2>${route.resourceIds.map(id => {
        const resource = resources.get(id);
        return `<a class="resource-option" href="${url(route.id, id)}" data-resource-id="${escape(id)}"><div><strong>${escape(resource.name)}</strong><small>${escape(resource.kind)}</small><p>${escape(resource.summary)}</p></div><span class="go" aria-hidden="true">→</span></a>`;
      }).join('')}</div>${conceptNote(concepts.get('relational-database'))}</section>
      <aside class="topic-aside"><p class="eyebrow">先辨清边界</p><h2>保存数据，有多种做法。</h2><p>${escape(concept.boundary)}</p>
      <div class="decision-row"><strong>先问怎样调用数据库</strong><p>由应用进程直接调用引擎，还是连接独立数据库服务？独立服务也可以运行在同一台机器。</p></div>
      <div class="decision-row"><strong>再问怎样读写</strong><p>同时写入的要求、访问位置和维护安排，都需要与具体需求一起考虑。</p></div>
      <div class="decision-row"><strong>本轮范围</strong><p>两个资源已核对官方资料。文件、对象存储、缓存等其他分支尚未在样板里展开。</p></div>
      <div class="decision-row"><strong>查证与继续了解</strong>${sourceLinks(concept.sourceIds)}</div></aside></div>` + sharedRoutes(route.id);
  }
  function renderResource(route, resource) {
    const relations = content.relations.filter(relation => relation.from === resource.id && relation.type === 'implements');
    const comparison = content.relations.find(relation => relation.type === 'comparable' && [relation.from, relation.to].includes(resource.id));
    const other = comparison && resources.get(comparison.from === resource.id ? comparison.to : comparison.from);
    const list = items => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
    main.innerHTML = breadcrumbs(route, resource) + `<div class="resource-layout"><article data-object-id="${escape(resource.id)}">
      <div class="resource-head"><div><p class="eyebrow">具体项目 / 资源</p><h1>${escape(resource.name)}</h1><p class="kind">${escape(resource.kind)}</p></div>${status(true)}</div>
      <p class="resource-summary">${escape(resource.summary)}</p>
      <section class="resource-section"><h2>它解决什么问题</h2><p>${escape(resource.purpose)}</p></section>
      <section class="resource-section"><h2>它在哪里运行</h2><p>${escape(resource.environment)}</p></section>
      <section class="resource-section"><h2>使用它，需要什么</h2>${list(resource.requirements)}</section>
      <section class="resource-section"><h2>这些边界值得先知道</h2>${list(resource.limits)}</section>
      <section class="resource-section"><h2>它在地图里的位置</h2><p>展开一条关系，查看概念解释、适用条件与依据。</p>${relations.map(relation => conceptNote(concepts.get(relation.to), relation)).join('')}</section>
      </article><aside class="resource-aside"><p class="eyebrow">从地图走向具体项目</p>${external(resource.officialUrl, '打开 ' + resource.name + ' 官方网站', 'action')}<p>地图内容可以离线阅读；外部资料需要联网。</p>
      <h2>查证依据</h2><ul class="sources-list">${resource.sourceIds.map(id => { const source = sources.get(id); return `<li>${external(source.url, source.title)}</li>`; }).join('')}</ul><p class="source-date">核对日期 ${escape(resource.verifiedAt)} · 官方资料</p>
      ${other ? `<section class="comparison"><h3>${escape(comparison.label)}</h3><p>${escape(comparison.condition)}</p><a href="${url(route.id, other.id)}">再看看 ${escape(other.name)} →</a><details><summary>比较依据</summary><p>${sourceLinks(comparison.sourceIds)}</p></details></section>` : ''}</aside></div>` + sharedRoutes(route.id, resource.id);
  }
  function locationState() {
    try {
      const parts = (location.hash.slice(1) || 'home').split('/').map(decodeURIComponent);
      const [entry, topic, id] = parts;
      if (!routes.has(entry) || parts.length > 3 || (topic && topic !== 'storage') || (parts.length > 1 && !topic) || (parts.length > 2 && !id)) return null;
      if (id && !routes.get(entry).resourceIds.includes(id)) return null;
      return {route:routes.get(entry), topic, id};
    } catch { return null; }
  }
  function render(moveFocus = true) {
    const state = locationState();
    main.replaceChildren();
    document.querySelectorAll('[data-entry]').forEach(link => {
      if (link.dataset.entry === state?.route.id) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if (!state) {
      main.innerHTML = '<section class="not-found"><p class="eyebrow">这个位置还没有内容</p><h1>先回到地图入口。</h1><p>链接中的位置不在本轮样板里。你仍可从三个入口找到已整理的存储资源。</p><a class="action" href="#home">回到软件组成 →</a></section>';
      document.title = '位置未找到 · 计算机世界';
    } else {
      const {route, topic, id} = state;
      if (id) renderResource(route, resources.get(id));
      else if (topic) renderTopic(route);
      else if (route.id === 'home') renderHome();
      else if (route.id === 'domains') renderDomains();
      else renderProducts();
      document.title = `${id ? resources.get(id).name : topic ? '数据存储方案' : route.title} · 计算机世界`;
    }
    if (moveFocus) { main.focus({preventScroll:true}); window.scrollTo(0,0); }
  }
  // --- 一个委托入口管理首页/全域/产品的局部选择，不残留跨面板处理器 ---
  main.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    let panel;
    if (button.dataset.role) { rolePanel(button.dataset.role); panel = document.getElementById('role-inspector'); }
    else if (button.dataset.domain) {
      const domain = panorama[Number(button.dataset.domain)];
      panel = document.getElementById('domain-inspector');
      panel.innerHTML = `<p class="eyebrow">全景中的一个领域</p><h2>${escape(domain.name)}</h2>${status(false)}<p>${escape(domain.summary)}</p><p class="role-example">这段定位沿用原有原型。具体资源、使用条件与来源还需要整理。</p><a class="action secondary" href="../index.html">打开原有全景原型 ↗</a>`;
      main.querySelectorAll('[data-domain]').forEach(item => { const selected = item === button; item.classList.toggle('selected',selected); item.setAttribute('aria-pressed',String(selected)); });
    } else if (button.dataset.product) {
      const product = products[Number(button.dataset.product)];
      panel = document.getElementById('product-inspector');
      panel.innerHTML = `<p class="eyebrow">按产品找线索</p><h2>${escape(product.name)}</h2>${status(false)}<p>${escape(product.detail)}</p><p class="role-example">这条路线尚未整理完整。先从有保存需求的网页应用体验本轮样板。</p><a class="action secondary" href="${url('products')}">进入已整理的样板 →</a>`;
      main.querySelectorAll('[data-product]').forEach(item => { const selected = item === button; item.classList.toggle('selected',selected); item.setAttribute('aria-pressed',String(selected)); });
    }
    if (panel && window.matchMedia('(max-width:800px)').matches) { panel.tabIndex = -1; panel.focus(); }
  });
  // --- 跳转到正文只移动焦点，不把元素锚点当成内容路由 ---
  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    main.focus();
  });
  window.addEventListener('hashchange', () => render());
  render(false);
})();
