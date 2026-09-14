/**
 * [INPUT]: 树/详情/图谱定义、entry 首访与 atlas 样例视图、本地 hash 地址。
 * [OUTPUT]: 首访区段、样例、地图与旧节点地址恢复，隐藏视图不参与布局或键盘。
 * [POS]: 最后的启动步骤；地图显示后才计算布局，不把隐藏容器的零尺寸当有效位置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
function restoreNode() {
  atlasHide();
  if (atlasRestore()) return;
  const section = entrySections.has(location.hash) ? location.hash.slice(1) : null;
  const intro = !location.hash || location.hash === '#intro' || Boolean(section);
  entrySetView(intro);
  if (intro) { entryFocus(true,false,section); return; }
  const match = /^#node=(\d+)$/.exec(location.hash);
  const node = match ? N[Number(match[1])] : null;
  if (node) goto(node.i);
  else {
    const current = sel || N[0];
    paint(current); render(current, true); centerNode(current);
    document.getElementById('entry-error').hidden = location.hash === '#map';
  }
  entryFocus(false, Boolean(node));
}
restoreNode();
addEventListener('hashchange', restoreNode);
let layoutFrame;
new ResizeObserver(() => {
  if (document.body.classList.contains('intro') || !stage.clientWidth || !stage.clientHeight) return;
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    if(sel) centerNode(sel); else fit();
    if (mgPos && mgWrap.clientWidth && mgWrap.clientHeight) mgFit(mgPos);
  });
}).observe(stage);
