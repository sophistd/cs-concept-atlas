# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> L2 | 父级: `~/Code/CLAUDE.md` | 交付形态是**一个自包含的 HTML 文件**

## 命令

```bash
node build.mjs            # src/ + data/ → index.html
node build.mjs --watch    # 改了就重建（60ms 防抖）

# 语法自检（没有 lint，这是唯一的静态检查）
node --check <(sed -n '/^<script>$/,/^<\/script>$/p' index.html | sed '1d;$d')

# 看效果：file:// 会被 Chrome 扩展拒绝，走本地 http
python3 -m http.server 8792   # 然后开 http://localhost:8792/index.html
```

`scripts/` 下两个脚本产出的都是**已提交的产物**，平时不跑，只有重切组合 / 换图标时才跑：

```bash
python3 scripts/find-bundles.py 1.4   # 只打印，看不同分辨率切出什么
python3 scripts/make-bundles.py 1.4   # 定稿 → data/bundles.json（要 networkx）
node scripts/extract-icons.mjs        # → src/icons.js（要本地有 lucide-react）
```

**没有测试、没有 lint、没有 package.json。** `build.mjs` 只用 node 标准库，别为了一个功能引依赖——
产物必须能离线双击打开，任何运行时依赖都会破坏这一点。

## 交付形态决定了一切约束

产物是**一个文件**：`index.html`，274KB，双击就能开，不联网、不请求任何外部资源。
拆成 `src/` 多文件**只是为了改得动**，不是为了让浏览器分开加载。

由此推出三条硬约束：

1. **不许引 CDN、不许引 npm 运行时依赖。** 需要外部资产就内联进去——
   图标就是这么处理的（`scripts/extract-icons.mjs` 从本地 lucide-react 抠几何数据写进 `src/icons.js`）。
2. **`index.html` 是产物，不要手改。** 下一次 `node build.mjs` 会盖掉。
   `index.html` **确实提交进版本库**（要让人能直接下载），所以改完 `src/` 记得重建再提交，否则两者不同步。
3. 改数据改 `data/concepts.json`，不改 dist。

## 构建：注入式，不是打包器

`src/index.html` 里埋着 `/*@inject <名字>*/` 标记，`build.mjs` 把对应内容替换进去。
少一个标记会抛错、多一个没填的标记也会抛错——**注入点和 parts 表必须一一对应**，
加新源文件时两边都要改。

注入顺序就是执行顺序，**不能乱**：

```
data → bundles → icons.js → tree.js → graph.js → boot.js
```

## ⚠️ 四个 JS 文件共享同一个全局词法作用域

**没有模块、没有 import/export。** 它们被内联进同一个 `<script>`，靠顶层 `const`/`function`
进入全局词法环境互相看见。这意味着：

- **重名会静默覆盖或抛 redeclare**。`graph.js` 里所有标识符一律 `mg` 前缀就是为了避开
  `tree.js` 已经占掉的 `gA` / `gL` / `gN` / `k` / `tx` / `ty` / `drag` 这些短名字。**加新符号继续守这个前缀。**
- **耦合是双向的、隐式的**，grep 不出 import 来：

| 方向 | 依赖的符号 |
|---|---|
| `graph.js` → `tree.js` | `N` `NS` `FAM` `mc` `ease` `lerp` `crumb` `esc` `txt` `goto` |
| `tree.js` → `graph.js` | `mgShow`（`paint()` 末尾调用，图谱靠它跟着选中节点走）· `mgPop` `mgToggleBig`（Esc 处理里） |

反向那三个是 `tree.js` 对后加载文件的前向引用，**靠函数声明提升 + 运行时才求值**才成立。
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

八种关系，但**只有三族**——族才是图例上那四个开关的粒度：

| 族 | 关系 | 色 |
|---|---|---|
| `same` | 同一个东西 · 同一类的东西 · 可以互相替代 | 橙 |
| `pair` | 固定搭配 | 青 |
| `dep` | 底下用的是 · 被谁当底座 · 跑在……之上 · 跑在它之上的 | 蓝（带箭头） |
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

代码（`src/` `build.mjs` `scripts/`）MIT；`data/concepts.json` 里那 1739 条中文释义是创作内容，
CC BY-SA 4.0；图标来自 Lucide（ISC）。**加新内容时想清楚它属于哪一半。**

## 另有一份落后的副本

本机某个研究归档目录下的 `cs-concepts-tree.html` 是这个项目拆分前的单文件，
停在早期版本（没有加减 / 组合 / 图标）。**它不是正本，不要往那边同步、也不要拿它当参考。**
正本永远是这个仓库。
