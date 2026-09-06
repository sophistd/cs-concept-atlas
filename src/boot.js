/**
 * [INPUT]: 已加载的树导航、节点详情、关联图定义，以及地址中的 node 编号。
 * [OUTPUT]: 首屏、节点深链恢复与容器尺寸适应。
 * [POS]: 内联脚本的最后一步，确保所有依赖就绪才启动浏览器界面。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
function restoreNode() {
  const match = /^#node=(\d+)$/.exec(location.hash);
  const node = match ? N[Number(match[1])] : null;
  if (node) { goto(node.i); return; }
  paint(N[0]); render(N[0], true); fit();
}
restoreNode();
addEventListener('hashchange', restoreNode);
let layoutFrame, initialLayout=true;
new ResizeObserver(() => {
  if(initialLayout){initialLayout=false;return;} // 首次布局已由 restoreNode 定位，不能再缩回全图。
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => {
    if(sel) centerNode(sel); else fit();
    if (mgPos && mgWrap.clientWidth && mgWrap.clientHeight) mgFit(mgPos);
  });
}).observe(stage);
