/**
 * [INPUT]: Paper v2 首访区段/地图 DOM、旧树选中状态和本地地址；内容不从网络取得。
 * [OUTPUT]: entrySetView/entryFocus 管理介绍与地图可见性、区段定位和焦点，供 boot 恢复路由。
 * [POS]: 首访入口控制层；不另存节点选择，不记录个人使用或学习状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const entryIntro = document.getElementById('intro');
const entrySections = new Set(['#entry-routes','#entry-resources','#entry-training']);
const entryMapParts = ['top','stage','side','legend','mgtip'].map(id => document.getElementById(id));
let entryStarted = false;
let entryFrame;
function entryCloseMapOverlays() {
  mgClosePop();
  if (document.body.classList.contains('mgbig')) mgToggleBig();
}
function entrySetView(intro) {
  cancelAnimationFrame(entryFrame);
  document.body.classList.toggle('intro', intro);
  document.documentElement.classList.toggle('entry-document', intro);
  entryIntro.hidden = !intro;
  entryIntro.inert = !intro;
  for (const part of entryMapParts) { part.hidden = intro; part.inert = intro; }
  if (intro) entryCloseMapOverlays();
  document.getElementById('entry-error').hidden = true;
  document.title = intro ? 'CS Atlas · 从看懂概念到做成事情' : '计算机世界 · 概念 · 实体 · 关联';
}
function entryFocus(intro, node, section) {
  const target = intro ? document.getElementById(section || 'entry-heading') : node ? card : qEl;
  if (entryStarted || !intro || section) target.focus({preventScroll:true});
  const route=location.hash;
  if (intro) entryFrame=requestAnimationFrame(()=>{
    if(location.hash!==route || !document.body.classList.contains('intro')) return;
    if(section) target.scrollIntoView({block:'start'});else window.scrollTo(0,0);
  });
  entryStarted = true;
}
