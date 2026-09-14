# scripts/ · 构建与内容维护工具
> L2 | 父级: ../CLAUDE.md

本目录维护既有全景的数据和产物边界。释义按正文变化保留或重开审核；组合先生成候选，人工确认后显式应用；检查脚本不写正式内容。新导航样板的内容校验位于 `design/`。

## 成员清单

- `merge-drafts.py`: 将 Markdown 三段释义合入旧库；未变正文保留审核结果，首次或变更正文标草稿，`--approve` 确认本次正文，`--check` 只读。
- `make-bundles.py`: Louvain 组合候选生成与显式应用；完整成员匹配才沿用人工名称，来源摘要阻止过期候选覆盖新工作。
- `find-bundles.py`: 只打印不同分辨率的聚类结果，供探索组合划分，不写组合文件。
- `extract-icons.mjs`: 从本地 Lucide 提取域图标几何数据和署名头，生成 `src/icons.js`。
- `entry-checks.mjs`: 真实路由/搜索/Esc 与 favicon 反例检查，保护首访往返和旧地址。
- `offline.mjs`: 根交付自包含守卫，只允许无引用的内联 SVG favicon，拒绝主动外部资源。
- `content.mjs`: 加载并核验正文覆盖、身份及来源；compileContent/readContent 保留旧节点与领域语境，并编译可选对象正文和主张。
- `validation.mjs`: 内容与三树共用的字段白名单、类型、日期、URL 和引用守卫，不改输入或推断事实。
- `atlas-content.mjs`: entries 的对象正文与逐主张扩展边界；来源保留固定版本和分发依据，无扩展旧文件仍可编译。
- `atlas.mjs`: readAtlas/compileAtlas 读取五份公共定义，解析单一正文，校验必要条件/连接和加载方向，并派生 ID 正反索引供根构建内联。
- `atlas-scenarios.mjs`: 校验虚构情境及检查作用域；调用/结果记录固定所有实际部件版本，evaluateScenario 保留三值条件与独立结果。
- `atlas-checks.mjs`: 正式数据的编译、身份/出处往返及错误反例回归；只改内存副本，不执行模型或替代来源审核。
- `atlas-reading-checks.mjs`: 三树阅读往返、来源定位和结果分层回归；实际浏览器验收另行。
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
node scripts/atlas-checks.mjs
node scripts/atlas-reading-checks.mjs
node scripts/reading-checks.mjs
```

`make-bundles.py` 默认只创建 `data/bundles.candidate.json`，已有候选拒绝覆盖。新组合的 `name` 留空；确认名称、说明和成员后，将整份候选的 `reviewed` 改为 `true`，再用 `--apply` 明确应用。候选生成后若节点或正式组合有变化，应用会拒绝，须重新生成并审阅。应用只写组合 JSON，随后由根构建生成页面。

`readAtlas(readContent(...), dataDirectory)` 是三树唯一生产入口；`compileAtlas(enriched, documents)` 接收相同数据的内存副本供校验。输出可 JSON 串行化，来源与正文自包含，索引值保留 binding/coverage/relation 原 ID。虚构情境附预编译 evaluation，浏览器直接消费；evaluateScenario 可在内存重算并拒绝过期版本/条件快照。该接口不提供 CLI、独立公开快照或私人记录存储。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
