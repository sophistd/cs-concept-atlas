/**
 * [INPUT]: 已内联的 HTML 字符串。
 * [OUTPUT]: assertOfflineHtml 拒绝主动外部资源，仅允许无脚本/引用的内联 SVG favicon。
 * [POS]: 自包含构建守卫，由根构建和反例检查共用；普通资料链接仍按内容校验管理。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export function assertOfflineHtml(html) {
  const stripped = html.replace(/<link\b[^>]*>/gi, tag => {
    const match = /^<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="data:image\/svg\+xml,([^"<>]+)"\s*\/?>$/i.exec(tag);
    if (!match) throw new Error('首页只允许内联 SVG favicon，不允许外部 link 资源。');
    let svg;
    try { svg = decodeURIComponent(match[1]); } catch { throw new Error('favicon 编码无效。'); }
    if (!/^<svg\b[^>]*>[\s\S]*<\/svg>$/.test(svg) || /<(?:script|foreignObject|image|use|style|animate|set)\b|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(/i.test(svg)) {
      throw new Error('favicon 只接受没有脚本或外部引用的静态 SVG。');
    }
    return '';
  });
  for (const [, , target] of stripped.matchAll(/\burl\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!target.trim().startsWith('#')) throw new Error('CSS/SVG 资源只能引用文档内片段。');
  }
  for (const match of stripped.matchAll(/<(?:image|use)\b[^>]*\b(?:xlink:)?href\s*=\s*["']?([^"'\s>]+)/gi)) {
    if (!match[1].startsWith('#')) throw new Error('SVG 引用只能指向文档内片段。');
  }
  if (/<(?:script|img|iframe|object|embed|source|video|audio)\b[^>]*\b(?:src|srcset|data|poster)\s*=|@import\b|url\(\s*["']?(?:https?:|\/\/)/i.test(stripped)) {
    throw new Error('首页必须自包含；资料地址请使用普通链接。');
  }
}
