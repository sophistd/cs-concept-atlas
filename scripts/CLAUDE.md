# scripts/ · 构建与内容维护工具
> L2 | 父级: ../CLAUDE.md

本目录维护既有全景的数据和产物边界。释义按正文变化保留或重开审核；组合先生成候选，人工确认后显式应用；检查脚本不写正式内容。新导航样板的内容校验位于 `design/`。

## 成员清单

- `merge-drafts.py`: 将 Markdown 三段释义合入旧库；未变正文保留审核结果，首次或变更正文标草稿，`--approve` 确认本次正文，`--check` 只读。
- `make-bundles.py`: Louvain 组合候选生成与显式应用；完整成员匹配才沿用人工名称，来源摘要阻止过期候选覆盖新工作。
- `find-bundles.py`: 只打印不同分辨率的聚类结果，供探索组合划分，不写组合文件。
- `extract-icons.mjs`: 从本地 Lucide 提取域图标几何数据和署名头，生成 `src/icons.js`。
- `content.mjs`: 加载并核验内容拆分完整性和链接字段，为根构建提供经过检查的数据。
- `content-checks.mjs`: 内容加载与完整性守卫的回归检查，不改正式内容。
- `reading-checks.mjs`: 执行真实详情与搜索函数，验证本地语境、同网址来源记录合并、仅来源差异不重复正文。
- `maintenance-checks.py`: 临时目录中的真实 CLI 回归，验证释义审批幂等、人工命名保护及候选应用边界。
- `graph-checks.mjs`: Node VM 中执行真实图谱和树 Esc 处理器，验证共享弹层、原生搜索清空与指针状态；不替代浏览器验收。

## 命令与写入边界

```bash
python3 scripts/merge-drafts.py --check
python3 scripts/merge-drafts.py
python3 scripts/merge-drafts.py --approve 53 209
python3 scripts/find-bundles.py 1.4
python3 scripts/make-bundles.py 1.4
python3 scripts/make-bundles.py 1.4 --output /tmp/bundles-review.json
python3 scripts/make-bundles.py --apply /tmp/bundles-review.json
python3 scripts/maintenance-checks.py
node scripts/graph-checks.mjs
node scripts/content-checks.mjs
node scripts/reading-checks.mjs
```

`make-bundles.py` 默认只创建 `data/bundles.candidate.json`，已有候选拒绝覆盖。新组合的 `name` 留空；确认名称、说明和成员后，将整份候选的 `reviewed` 改为 `true`，再用 `--apply` 明确应用。候选生成后若节点或正式组合有变化，应用会拒绝，须重新生成并审阅。应用只写组合 JSON，随后由根构建生成页面。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
