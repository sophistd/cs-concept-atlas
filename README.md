# CS/SE 导航地图

为通过 AI、Coding Agent、Vibe Coding 进入编程领域的人，提供一张计算机与软件工程地图：**发现原本不知道的东西，看清位置、分工和关系，再找到具体项目与资料。**

当前首页沿用原有的**可折叠树＋关联图**。点击领域、概念或最底层条目，右侧可查看定位、解释、相关资料与相邻概念。三入口设计保存在独立样板中，继续作为讨论材料。

| 入口 | 用途 |
|---|---|
| **[地图首页 · index.html](index.html)** | 按领域逐层探索，阅读节点解释与来源，查看跨领域关联。 |
| [三入口设计样板 · design/index.html](design/index.html) | 审阅软件组成、全域、产品三条路径；“保存和查找信息”是完整样板。 |

**[在线打开地图](https://sophistd.github.io/cs-concept-atlas/)**，或下载根目录 HTML 离线阅读。网站由 GitHub Pages 从 `main` 分支根目录发布；本地构建不代表已发布到线上。本次发布范围与验收见 [intent.md 第 11 节](intent.md#11-现有全景新版公开更新2026-09-06)，模块与构建地图见 [CLAUDE.md](CLAUDE.md)。

## 打开项目

**直接双击根目录 `index.html` 即可。** 正文、来源记录、样式和脚本都内联在 HTML 里，离线可读；点击外部资料才需要联网。`src/index.html` 是模板，不能直接打开。

开发或浏览器验收时，在仓库目录运行：

```bash
python3 -m http.server 8792 --bind 127.0.0.1
```

打开 [当前地图首页](http://127.0.0.1:8792/index.html)。终端保持运行；按 `Ctrl+C` 停止服务后，刷新将无法连接。如果已有这个项目的服务，直接访问即可。

修改源码或内容后先构建，再刷新：

```bash
node build.mjs          # 生成根目录 index.html
node build.mjs --watch  # 监视 src/、data/ 与 data/entries/；浏览器手动刷新
```

不需要 `npm install`，没有后端、数据库、CDN 或浏览器运行时依赖。两个构建脚本只用 Node 标准库。

## 首页怎么读

- 点圆点展开或收起，点名称查看说明。键盘聚焦节点后，Enter 看说明，左右方向键展开或收起。
- 搜索概念或项目，按 Enter 定位同名节点；没有同名节点时定位第一个命中。地址中的 `#node=编号` 可保存和分享。
- 右侧“怎样理解”讲机制、情境或边界；“资料与继续阅读”进入官方文档或相关资料。“展开阅读”让说明占满侧栏，“显示关联图”恢复图谱。
- 图谱的 `1 / 2 / 3` 控制关系跳数，`⤢` 放大。`×N` 表示同一对象在多个位置出现；详情也能跳到其他位置。
- 点击图例开关关系；`⌥` / `Alt` 加点击摘除单点；`＋` 钉入节点；“还原”恢复筛选。“组合”展示已有的 21 组主题成员。
- Esc 按顺序关闭弹层、退出图谱放大、清空主搜索。树图与图谱可拖动平移、滚轮缩放；窄屏的说明排在树图下方，可正常滚动阅读。

分类、组合和旧关系是持续整理的内容。“同类”不等于能直接替换；图谱中的比较线索仍需核对接口、环境和需求。没有画出关系也不等于现实中不存在关系。

## 内容完成到什么程度

`data/entries/` 为每个非根节点提供定位、解释与相关资料，包括最底层条目。构建要求全覆盖，缺失节点、错位编号、重复条目或失效引用会阻止生成。

**基础解释覆盖与事实审核是两件事。** 来源上的“页面核对”只记录确实打开核对过的页面；未核对的来源显示“参考链接 · 尚待逐页核验”。HTTP 可访问不证明页面支撑某个结论。维护者还需审阅解释、概念边界与旧关系。

源文件职责：

| 位置 | 正本与职责 |
|---|---|
| `src/index.html`、`src/style.css` | 页面结构与布局。 |
| `src/tree.js`、`src/graph.js` | 分类导航与跨领域关联。 |
| `src/details.js` | 唯一详情渲染器：正文、来源、所在位置与关系。 |
| `src/icons.js`、`src/boot.js` | 内联图标、启动与尺寸变化处理。 |
| `data/concepts.json` | 分类与原关系身份，节点通过数组下标互指；旧 g/m 保留作沿革。 |
| `data/entries/*.json` | 当前首页的逐节点正文和来源；node/name 双重核对归属。 |
| `data/bundles.json` | 已采用组合与人工名称，成员以编号和名称引用。 |
| `scripts/content.mjs` | 内容完整性、身份、引用校验与浏览器快照编译。 |
| `drafts/` | 历史长释义，合并回旧库；不会覆盖当前 entries 正文。 |
| `design/` | 独立设计样板及其内容、来源与验证；不作为当前首页正文正本。 |

相同名称不自动合并。只有原关系明确标为“同一个东西”的节点共享代表节点的基础说明，其他位置的解释作为领域语境补充保留。详情列出其他落点和两类说明所用的资料。

## 检查与维护

```bash
node build.mjs --check               # 全覆盖、引用、内联脚本语法、生成物同步
node scripts/content-checks.mjs      # 内容守卫拒绝坏数据及正文复用边界
node scripts/reading-checks.mjs      # 阅读、语境搜索与来源合并回归
node scripts/graph-checks.mjs        # 交互事件状态回归
python3 scripts/maintenance-checks.py # 临时目录执行真实维护 CLI，不改正式数据
```

图形尺寸、浏览器原生行为与触屏还需在真实页面验收，脚本检查不能替代。

历史草稿合并：

```bash
python3 scripts/merge-drafts.py --check
python3 scripts/merge-drafts.py
python3 scripts/merge-drafts.py --approve 53 209  # 明确审核后批准指定正文
```

未变的正文保留审核状态；新正文或修改过的正文重新标为草稿。当前可见正文请修改 `data/entries/`。

调整组合先生成候选，避免覆盖人工命名：

```bash
python3 scripts/find-bundles.py 1.4  # 只打印聚类结果
python3 scripts/make-bundles.py 1.4  # 仅生成 data/bundles.candidate.json
# 核对候选名称、说明和成员，将 reviewed 改为 true，再明确应用：
python3 scripts/make-bundles.py --apply data/bundles.candidate.json
node build.mjs
```

已有候选拒绝覆盖；只有完整成员匹配才保留已有名称，新组合留空待命名。候选生成后若原数据已变化，应用会拒绝。聚类工具需 Python `networkx`，浏览地图无需它。图标更新使用 `node scripts/extract-icons.mjs`，需本地 `lucide-react`，平时不用运行。

## 三入口设计与参考

[设计样板](design/index.html)仍保留原有的三条验证路径：软件组成、数据库领域、需要保存记录的网页应用，最后进入同一 SQLite 或 PostgreSQL 资源卡。相关结构和读者验收见 [design/review.md](design/review.md)。

```bash
node design/build.mjs
node design/build.mjs --check
node design/checks.mjs
```

本轮参考这些项目的组织方法，未复制其内容库：

| 项目 | 借鉴的做法 |
|---|---|
| [OSINT Framework / Mission Intelligence](https://github.com/JeanDevenish/OSINT_Framework_Mission_Intelligence) | 逐层探索并走向具体资源，领域与用途可有不同入口。 |
| [roadmap.sh](https://roadmap.sh/computer-science) | 节点可继续阅读，地图与学习资料连接。 |
| [MDN Curriculum](https://developer.mozilla.org/en-US/curriculum/) | 分层整理主题与相关资料，交代知识范围。 |
| [CS 自学指南](https://csdiy.wiki/) | 对课程、工具和资料给出定位，帮助决定从哪里继续了解。 |

## 参与共建与许可

欢迎补资源、修分类、改解释、补关系与纠错。先看 [CONTRIBUTING.md](CONTRIBUTING.md)，提交 PR 由维护者审核。定位或对象模型变化先讨论；普通内容修正可以直接提交。

代码采用 [MIT](LICENSE)，原创解释、分类与关系采用 [CC BY-SA 4.0](LICENSE-CONTENT)。[Lucide](https://lucide.dev) 图标采用 ISC。第三方资料仍依其自身许可。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
