# CS/SE 导航地图 — 从软件部件发现计算机世界与具体资源

原生 JavaScript + SVG + JSON + Node 标准库构建；交付自包含 HTML。

> L1 项目地图。当前可用入口与边界见 `README.md`；`intent.md` 保留公开历史决定，独立设计样板继续保留。

## 当前边界与目录

分支契约见 [BRANCHING.md](BRANCHING.md)：任务从 develop 开出并向 develop 提 PR；main 只接 develop 的已授权发布。`.github/workflows/` 检查 PR 方向；本地内部规划与历史分支不得进入公开提交。

当前无锚点首页为浅色介绍，四项导航进入概念地图、学习路线预览、资料导航与训练筹备；照片分类入口打开问题—方案—知识三树样例。#map 保留原可折叠树和关联图，旧 #node=N 仍直达原节点。每个非根节点由 data/entries 提供解释与来源；基础覆盖不等于全库事实审核。三种使用情境均明确虚构，不记录个人状态，未执行模型推理或取得真人理解证据。design/ 保留独立三入口样板，本地内容可离线阅读。

| 位置 | 职责 |
|---|---|
| `.github/`、`BRANCHING.md` | PR 方向检查与分支/发布契约；服务端保护生效情况另行回读。 |
| `design/` | 独立设计样板、共享内容、官方来源、贡献模板与校验；先读 `design/CLAUDE.md`。 |
| `src/` | 首访、原树/详情/关联图与三树样例源码，共用本地路由和知识；先读 src/CLAUDE.md。 |
| `data/` | 分类与组合保留数组下标；entries/ 管正文与逐主张来源，objects/problems/solutions/mappings/scenarios 五份定义引用同一正文。 |
| `drafts/` | 历史长释义草稿，合并后写回旧数据；当前页面正文以 entries/ 为准。 |
| `scripts/` | 正文和三树编译、条件/版本/公共字段校验与回归检查，以及既有维护工具。 |
| `planning/` | 公共模型、教学范围、来源依据与 B01 可复验验收包；先读 planning/CLAUDE.md。 |
| `index.html`、`build.mjs` | 既有原型的生成产物与内联构建，产物提交入库，不手改。 |
| `intent.md` | 保留此前公开的产品与共建决定；§11 是早期全景发布记录，当前首页/三树范围以 README 为准。 |
| `README.md`、`CONTRIBUTING.md` | 启动与审阅入口、公开贡献与维护者审核规则。 |
| `LICENSE`、`LICENSE-CONTENT` | 代码与原创内容的许可边界。 |

全景正文维护于 `data/entries/*.json`，通过 node/name 校验与原分类相连；显式“同一个东西”关系复用代表节点正文，其余落点的补充说明单独显示。样板内容维护于 `design/content.json`。`design/build.mjs` 读取旧库的域名称与定位生成全景入口，不向旧库写入。样板的 `#入口/storage/资源ID` 路由改变入口语境，资源详情仍由同一条目生成。以下底层技术说明仅针对既有全景。

## 命令

```bash
node design/build.mjs          # 独立生成 design/index.html
node design/build.mjs --check  # 样板结构、脚本语法及产物同步，只读
node design/checks.mjs         # 内容校验器的拒绝用例
node build.mjs            # src/ + 分类/组合 + entries/ + 三树定义 → index.html
node build.mjs --check    # 内容全覆盖、引用、脚本语法与产物同步
node scripts/content-checks.mjs
node scripts/entry-checks.mjs         # 首访/样例/旧路由与自包含边界
node scripts/atlas-checks.mjs         # 类型、条件、版本和公共字段边界
node scripts/atlas-reading-checks.mjs # 三树详情与来源往返
node scripts/reading-checks.mjs      # 阅读、语境搜索与来源合并回归
node scripts/graph-checks.mjs
python3 scripts/maintenance-checks.py
node build.mjs --watch    # 改了就重建（60ms 防抖）

# 浏览器审阅走本地 HTTP；保持进程运行，避免刷新时无法连接
python3 -m http.server 8792 --bind 127.0.0.1
# 当前首页：http://127.0.0.1:8792/index.html
# 设计样板：http://127.0.0.1:8792/design/index.html
```

聚类与图标提取平时不跑，只有调整组合 / 换图标时使用：

```bash
python3 scripts/find-bundles.py 1.4   # 只打印，看不同分辨率切出什么
python3 scripts/make-bundles.py 1.4   # 仅生成 bundles.candidate.json（要 networkx）
# 核对候选的名称、说明和成员，将 reviewed 设为 true 后才可应用：
python3 scripts/make-bundles.py --apply data/bundles.candidate.json
node scripts/extract-icons.mjs        # → src/icons.js（要本地有 lucide-react）
```

**没有 package.json 或 lint 配置。** 两个构建都只用 Node 标准库；新样板有内容校验与对应拒绝用例。产物必须自包含，不引入外部运行时依赖。

## 交付形态决定了一切约束

当前交付为根目录 `index.html`；独立设计样板为 `design/index.html`。两者各自自包含，加载页面时不请求外部资源，主动打开资料链接时才联网。
拆成 `src/` 多文件**只是为了改得动**，不是为了让浏览器分开加载。

由此推出三条硬约束：

1. **不许引 CDN、不许引 npm 运行时依赖。** 需要外部资产就内联进去——
   图标就是这么处理的（`scripts/extract-icons.mjs` 从本地 lucide-react 抠几何数据写进 `src/icons.js`）。
2. **`index.html` 是产物，不要手改。** 下一次 `node build.mjs` 会盖掉。
   `index.html` **确实提交进版本库**（要让人能直接下载），所以改完 `src/` 记得重建再提交，否则两者不同步。
3. 分类和关系改 `data/concepts.json`，全景正文和链接改 `data/entries/*.json`；设计样板内容改 `design/content.json`，分别运行对应构建。本仓库不使用 `dist/`。

## 构建：注入式，不是打包器

`src/index.html` 里埋着 `/*@inject <名字>*/` 标记，`build.mjs` 把对应内容替换进去。
少一个标记会抛错、多一个没填的标记也会抛错——**注入点和 parts 表必须一一对应**，
加新源文件时两边都要改。

注入顺序就是执行顺序，**不能乱**：

```
data → content → atlas → bundles → icons.js → tree.js → details.js → graph.js → entry.js → atlas.js → boot.js
```

## 三树编译与路由

`scripts/atlas.mjs` 的 readAtlas 读取同一 content 结果和五份公共定义，内联生成 ATLAS。正反索引保留 binding/coverage/relation 的原 ID；情境 evaluation 在编译阶段产生，浏览器只读，不另写判定算法或保存个人状态。普通资料链接在用户主动打开时才联网，样式、脚本、字体回退及页面数据均本地自包含。

`#atlas=photo-A` 打开教学样例；对象、绑定、角色、问题、主张、来源、关系、连接与判据可在同一情境内往返。`#entry-routes`、`#entry-resources`、`#entry-training` 定位首页真实区段，`#map` 和旧 `#node=N` 保持。只有当前视图可交互；隐藏地图不接收 Esc 或零尺寸布局。样例的未知条件、调用结果与问题结果独立，虚构通过不等于本项目实测。

## ⚠️ 浏览器 JS 文件共享同一个全局词法作用域

**没有模块、没有 import/export。** 它们被内联进同一个 `<script>`，靠顶层 `const`/`function`
进入全局词法环境互相看见。这意味着：

- **重名会静默覆盖或抛 redeclare**。`graph.js` 里所有标识符一律 `mg` 前缀就是为了避开
  `tree.js` 已经占掉的 `gA` / `gL` / `gN` / `k` / `tx` / `ty` / `drag` 这些短名字。**加新符号继续守这个前缀。**
- **耦合是双向的、隐式的**，grep 不出 import 来：

| 方向 | 依赖的符号 |
|---|---|
| `graph.js` → `tree.js` / `details.js` | `N` `NS` `FAM` `mc` `ease` `lerp` `crumb` `txt` `goto`；`esc` 由详情提供 |
| `details.js` → `graph.js` | `mgShow`（`paint()` 末尾调用，图谱跟随选择） |
| `tree.js` → `details.js` / `graph.js` | `paint`、`card`；`mgPop`、`mgToggleBig`（Esc 处理） |

这些是导航对后加载文件的前向引用，**靠函数声明提升 + 运行时才求值**才成立。
动 `paint()` 或 Esc 处理时留意别把它们打断。

Esc 有三个去处，按「最贴身的先响应」排：**弹层 → 放大 → 清搜索**。
这个顺序写在 `tree.js` 的 keydown 里（先 return 让给弹层），别改成别的次序。

## ⚠️ 两套下标空间：raw 与 rep

这是这个仓库最容易搞错的地方。

`data/concepts.json` 是一个**扁平数组，靠下标互指**（`p` 父、`c` 子、`r` 关联）。
但同一个东西常常散在好几个概念下——`JavaScript` 有 4 份、`Java` 4 份、`DOM 树` 3 份，
彼此用 `同一个东西` 这种关系连着。**实测：134 组等价类、覆盖 297 个节点，占全库 17%。**

所以：

| 空间 | 谁在用 | 说明 |
|---|---|---|
| **raw** | `tree.js`、详情卡、`data/*.json` | 原始下标，一个落点一个节点 |
| **rep** | `graph.js` 全部 | 并查集把 `同一个东西` 缝成一个代表 |

**`mrep(i)` 是两个空间的唯一边界。** 在 `graph.js` 里拿到任何来自外部的下标——
`n.p`、`n.c`、`BUNDLES[].members[].i`、搜索结果——**都要先过 `mrep()`**，否则会画出 4 个 JavaScript。
反过来，`MFAM.get(rep)` 给出这个代表的全部原始落点，遍历树关系时要走它（一个代表有多个父）。

`goto(i)` 收的是 raw 下标但对 rep 也成立（代表本身就是一个真实节点）。

## 关系模型

十种具体关系，按**三族**组织——族才是图例上那四个开关的粒度：

| 族 | 关系 | 色 |
|---|---|---|
| `same` | 同一个东西 · 同一类的东西 · 可以互相替代（UI 表达为可比较，替代须另核条件） | 橙 |
| `pair` | 固定搭配 | 青 |
| `dep` | 底下用的是 · 被谁当底座 · 跑在……之上 · 跑在它之上的 · 用什么语言实现 · 用于实现 | 蓝（带箭头） |
| `tree` | 罩住（不在数据里，从 `p`/`c` 现推） | 灰 |

两条要点：

- **反向标签成对存在**，`MINV` 把 `被谁当底座`→`底下用的是`、`跑在它之上的`→`跑在……之上` 折成正向，
  同一对节点的同一种关系只留一条。**加新关系要同时想清楚它的反向标签和族归属。**
- `同一个东西` 在图谱里**永远画不出来**——它已经被并查集吃掉了，改由 `×N` 徽标表达。
  它还留在 `MREL` 表里只是为了完整。

`mgOff` / `mgHide` / `mgPin` / `mgBundle` 四个状态叠加决定画哪些点，
`mgCap()`（侧栏 25 / 放大 170）决定画几个。**25 这个数是有来由的：根节点正好 1 + 24 个域铺满一圈。**

## 组合（bundle）按下标引用，下标会静默错位

`data/bundles.json` 的成员存的是 `{i, n}`——下标加名字。
**数据一增删，下标就整体错位，而且没有任何症状**：图照画，只是画错了东西。

所以每条成员都存了名字，`build.mjs` 的 `checkBundles()` 每次构建都核对一遍，
对不上直接抛错不出包。**别把这个守卫去掉，也别只改 `i` 不改 `n`。**

那 21 组不是手划的，是在关联图上跑 Louvain 模块度聚类算出来的
（边权按「这条关系有多说明两个东西在一起用」给：`固定搭配` 3 分、层叠 2 分、`可以互相替代` 0.3 分）。
**不能用连通分量代替**——整张关联图是一个 **190 点的巨块横跨 6 个域**，外加 15 个 2~4 点的碎渣，切不出东西。

组名是给的起点，**改名直接改 JSON，不用重跑脚本**。

## 图谱的布局

径向：圆心 = 选中节点，往外按跳数最多三圈。孩子按子树大小分扇区，同一支血脉留在同一个方向。
圈半径 `max(上一圈 + gap, 本圈点数 × step / 2π)`——**点多了圈会自己撑开**，不用手调。

- **标签能挂就挂**，挂不下的省掉（`mgLabels` 做 AABB 碰撞，按跳数从内往外贪心）。圆点还在，悬停出 tooltip。
- 标签描一圈底色（`paint-order:stroke`）才不会被线糊掉。
- 非径向的边（弦）控制点往圆心收一半，收成一束，否则满屏乱穿。
- 「罩住」只在**头两跳**里参与展开——它是背景板，不是探索通道。否则三跳能把半个库拽进来。

**放大/收起不要整个塞进 `requestAnimationFrame`。** 名额只取决于 `body` 上的 `mgbig` class，
同步算就是对的；只有「套进视口」要等 CSS 尺寸生效。原来整个 `mgShow` 都在 rAF 里，
会和选中节点自己那帧的动画抢，抢输了就还按旧名额画（放大后仍是 25 点）。这个坑踩过一次。

## 中文排版

- 字宽靠 canvas 实测（`mc` + `measure()`），不要估算——中文字宽约是拉丁的两倍，估算必错位。
- 路径和标签里有全角字符与空格，shell 里一律加引号。

## 许可分两半

代码（`src/`、`design/` 中的页面与脚本、`build.mjs`、`scripts/`）MIT；data/entries、旧数据与新样板中的原创解释、分类和关系说明为 CC BY-SA 4.0。第三方来源仍依其原有许可；Lucide 图标为 ISC。具体范围见 `LICENSE-CONTENT`。

## 另有一份落后的副本

本机某个研究归档目录下的 `cs-concepts-tree.html` 是这个项目拆分前的单文件，
停在早期版本（没有加减 / 组合 / 图标）。**它不是正本，不要往那边同步、也不要拿它当参考。**
正本永远是这个仓库。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
