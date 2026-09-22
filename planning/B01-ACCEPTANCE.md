# B01 可复验验收包 v1

<!--
[INPUT]: 固定公开源码、许可声明、限定检查与公开页面浏览器观察。
[OUTPUT]: 无需内部文件的候选取得、版本核对、路径复验与真人试读程序。
[POS]: 公开验收索引；产品正文归 data/entries，状态分层记录，不替代读者证据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

核实日期：2026-09-22（UTC）；attempt 1。此包只记录公开候选及复验方法，不改变产品行为。可直接把本文交给另一台设备的检查者；不需要任何内部 planning 文件、私人研究或原始读者记录。

## 1. 固定对象与成功标准

| 对象 | 固定值 |
| --- | --- |
| 公开源码 | https://github.com/sophistd/cs-concept-atlas |
| 产品提交 | `1b9908b003cffdfd9a574a750b6f81b57b276277` |
| 教学样例版本 | `b01-2026-09-13-r2` |
| 根 HTML SHA256 | `d412a4d5abe82f24121ebf09be095bb55dd1a007deab69099f80bc35426b381d` |
| 根 HTML 字节数 | `1033755` |
| 动态公开页面 | https://sophistd.github.io/cs-concept-atlas/ |
| 固定 HTML 下载 | https://raw.githubusercontent.com/sophistd/cs-concept-atlas/1b9908b003cffdfd9a574a750b6f81b57b276277/index.html |
| 本次执行环境 | macOS 27.0；Node v22.22.3；Python 3.14.3；Git |
| 浏览器范围 | Codex 内置浏览器，截图 533 × 923 像素；引擎版本未取得；不是第二台设备或手机真机实测 |

本轮远端 main、干净检出与上述提交相符。公开页面下载字节与固定根 HTML 同 SHA256。在线 URL 会变化；仅 URL 相同不足以证明同版。后续若哈希不符，保留两个哈希与时间，并停止将在线观察归入这个候选。

目标是让检查者独立取得同版、重跑限定检查、核对路径与许可，并准确记录未验证项。编译通过、浏览器可走通、读者理解、真实模型推理是不同证据。

## 2. 在全新目录取得并检查

先安装 Git、Node（本次验证为 v22.22.3）及可选 Python 3。下面为 macOS/Linux 的 POSIX shell 命令；Windows 可在 WSL 执行。不要复用有未提交工作的目录。全程不需要 `npm install`。

```sh
set -eu
git clone --no-checkout https://github.com/sophistd/cs-concept-atlas.git cs-atlas-b01-verification
cd cs-atlas-b01-verification
git checkout --detach 1b9908b003cffdfd9a574a750b6f81b57b276277
git status --short
git rev-parse HEAD
node --version
node build.mjs --check
node scripts/entry-checks.mjs
node scripts/atlas-reading-checks.mjs
node --input-type=module -e 'import fs from "node:fs"; import crypto from "node:crypto"; const b=fs.readFileSync("index.html"); const h=crypto.createHash("sha256").update(b).digest("hex"); console.log(h,b.length); if(h!=="d412a4d5abe82f24121ebf09be095bb55dd1a007deab69099f80bc35426b381d" || b.length!==1033755) process.exit(1);'
git status --short
```

任一命令失败即停止依赖步骤。两次 status 预期均为空；记录真实 Node 版本，不把未测版本称为兼容。`--check` 已从源码编译并比对提交产物，无需覆盖 index.html。先读固定提交的 [CLAUDE.md](https://github.com/sophistd/cs-concept-atlas/blob/1b9908b003cffdfd9a574a750b6f81b57b276277/CLAUDE.md) 与 [README.md](https://github.com/sophistd/cs-concept-atlas/blob/1b9908b003cffdfd9a574a750b6f81b57b276277/README.md)；此验收包本身不在该历史提交里，不要在那里寻找它。

### 本次实际输出

所有下列命令退出码为 0：

```text
git status --short（前/后）：空
git rev-parse HEAD：1b9908b003cffdfd9a574a750b6f81b57b276277
node --version：v22.22.3
python3 --version：Python 3.14.3
node build.mjs --check：全景内容、引用、脚本语法与产物同步检查通过。
  domains: 24, entries: 1738, leaves: 1434, sources: 1130, checkedSources: 157
node scripts/entry-checks.mjs：通过 11 项首访路由与自包含反例检查；实际浏览器另行验收。
node scripts/atlas-reading-checks.mjs：通过 4 项三树阅读边界检查；覆盖 216 个情境详情、1192 条导航引用。真实浏览器另行验收。
shasum -a 256 index.html：d412a4d5abe82f24121ebf09be095bb55dd1a007deab69099f80bc35426b381d
```

Node 检查同时输出 `UNDICI-EHPA` / `EnvHttpProxyAgent is experimental` 环境警告，未导致失败。`checkedSources: 157` 是内容记录中的既有核对数量，不是本轮逐页打开 157 个来源。历史“127 项回归”未在本轮重跑，不计入本轮结果。

### 核对当前公网

在同一目录执行；下载失败或 hash 不同不应继续宣称线上同版：

```sh
curl --fail --location --silent --show-error https://sophistd.github.io/cs-concept-atlas/ -o ../b01-live.html
node --input-type=module -e 'import fs from "node:fs"; import crypto from "node:crypto"; const b=fs.readFileSync("../b01-live.html"); const h=crypto.createHash("sha256").update(b).digest("hex"); console.log(h,b.length); if(h!=="d412a4d5abe82f24121ebf09be095bb55dd1a007deab69099f80bc35426b381d" || b.length!==1033755) process.exit(1);'
```

本轮 GET 成功；结果为固定 SHA256、1033755 字节。本轮未执行部署、合并或发布。

## 3. 浏览器逐项复验

下表路径接在 `https://sophistd.github.io/cs-concept-atlas/` 后。也可以在干净目录执行 `python3 -m http.server 8792 --bind 127.0.0.1`，以 `http://127.0.0.1:8792/index.html` 为基址；端口占用时换空闲端口并记录，结束后 Ctrl+C 关闭自己启动的服务。本轮走查公网，未启动临时服务。

| ID | 入口与操作 | 期望 | 本次实际证据 / 状态 |
| --- | --- | --- | --- |
| B01 | 无 hash 首页；点击“看一条学习路径” | 首页介绍可见，进入 photo-A | 已实测：显示“从看懂一个概念，到做成一件事情”，进入 A；路径与界面观察 |
| B02 | `#atlas=photo-A`，也单独直接打开此地址 | 四个子问题、角色和对象可见；三个必要条件未知 | 已实测：三个未知，方案调用/问题结果均尚未检查；photo-a 截图及状态 |
| B03 | A 的“换个处境看看”选择 B → `#atlas=photo-B` | 条件满足，调用仅为教学假设通过，问题结果仍尚未检查 | 已实测与期望一致；photo-b 状态 |
| B04 | B 选择“反例：改为自家商品 SKU” → `#atlas=photo-sku` | 标签不满足，方案不适用，不暗示自动训练 | 已实测：显示不适用及先明确标签/数据/评估的下一步；photo-sku 截图及状态 |
| B05 | SKU 刷新，然后浏览器后退、前进 | 刷新保留 SKU，后退到 B，前进回 SKU，状态与 URL 一致 | 已实测：SKU → B → SKU；工具观察记录 |
| B06 | 点击“CNN 在全域地图的位置”；再单独打开 `#node=1453` 并刷新 | 旧地址恢复 CNN 节点、说明与来源 | 已实测：卷积网络 CNN、模型结构位置和三份来源可见；cnn-node 截图及状态 |
| B07 | CNN 节点点“卷积网络 CNN怎样用于照片分类” | 返回同一知识对象，非复制正文 | 已实测：`#atlas=photo-A&object=b01%3Acnn`，展示模型家族及角色/关系/主张；cnn-object 状态 |
| B08 | CNN 对象 → 家族细分关系 R01 → 主张 C02 → 论文来源 | 同一关系可追到主张和固定资料位置 | 已实测：`#atlas=photo-A&source=1444%3AS01` 显示 arXiv:1512.03385v1、§3.1—3.3/Table 1/§4.1；source 截图及状态。仅核对页面记录和链接，本轮未重新审阅论文事实 |
| B09 | 从旧节点点击品牌返回介绍 | 返回首页，恢复介绍和导航 | 已实测：`#intro`，首页标题及四导航可见；home 截图及状态 |
| B10 | 下载固定 HTML、验 hash、断网后用浏览器打开文件，重复 B01—B07 | 本地正文、交互、hash 路由可用；外部资料需联网 | 下载及自包含程序守卫通过；`file://` 被本轮浏览器 URL 安全策略拒绝。离线浏览器行为未验证，未绕过策略 |

本轮浏览器证据来自自动化代理，无真人回答。截图和界面状态是补充凭据；上表已给出跨设备所需入口、动作和实际观察，不依赖本地截图才能重新执行。并未完成多浏览器、手机真机、断网或全量布局验证。

### 固定 HTML 的下载与离线复验

```sh
curl --fail --location --silent --show-error https://raw.githubusercontent.com/sophistd/cs-concept-atlas/1b9908b003cffdfd9a574a750b6f81b57b276277/index.html -o ../b01-fixed.html
node --input-type=module -e 'import fs from "node:fs"; import crypto from "node:crypto"; const b=fs.readFileSync("../b01-fixed.html"); const h=crypto.createHash("sha256").update(b).digest("hex"); console.log(h,b.length); if(h!=="d412a4d5abe82f24121ebf09be095bb55dd1a007deab69099f80bc35426b381d") process.exit(1);'
```

由复验者在其可正常打开本地 HTML 的浏览器中断网、双击该文件；记设备/浏览器版本和视口、实际路径、是否成功及错误。不要把 `src/index.html` 模板当交付，也不要把在线浏览器通过等同离线通过。若客户端禁止本地文件，记录未验证并交给具备能力的检查者。

## 4. 许可与再分发边界

以下是固定提交的声明索引；不是对第三方权利的重新授权：

| 部分 | 固定依据 | 处理方式 |
| --- | --- | --- |
| 页面模板、样式、交互、构建/校验脚本 | [LICENSE](https://github.com/sophistd/cs-concept-atlas/blob/1b9908b003cffdfd9a574a750b6f81b57b276277/LICENSE)：MIT | 分发副本或实质部分时保留版权和许可声明 |
| 原创中文释义、分类判据、关系标注、设计说明和贡献模板，以及 HTML 对应文本 | [LICENSE-CONTENT](https://github.com/sophistd/cs-concept-atlas/blob/1b9908b003cffdfd9a574a750b6f81b57b276277/LICENSE-CONTENT)：CC BY-SA 4.0 | 保留来源、署名、许可链接；修改时标明变更，按适用相同方式共享要求处理，完整范围以 [CC 官方条款摘要](https://creativecommons.org/licenses/by-sa/4.0/) 及其链接的法律文本为准 |
| Lucide 图标 | [src/icons.js](https://github.com/sophistd/cs-concept-atlas/blob/1b9908b003cffdfd9a574a750b6f81b57b276277/src/icons.js) 标注 1.23.0、ISC；README 标明 ISC | 不能仅以根 MIT 概括；另核对并保留上游适用声明。本轮未做完整第三方 notice 合规审计 |
| 链接/引用的论文、框架、权重、外部网站与商标 | LICENSE-CONTENT 及 [来源索引](https://github.com/sophistd/cs-concept-atlas/blob/1b9908b003cffdfd9a574a750b6f81b57b276277/planning/B01-SOURCES.md) | 保持原许可；项目许可不授权下载、重新打包或重新许可第三方全文、模型权重和商标 |

根 `index.html` 同时含代码和原创文本，不能因为是一个 HTML 就将全部内容视为 MIT。分享本验收说明无需复制第三方全文。本包不包含个人回答、内部绝对路径、私人研究原文、凭据或内部原始执行记录；公共版权署名依法保留，不作为需要删除的私人回答。

## 5. 真人试读的最小程序（尚未执行）

先记候选 commit、HTML SHA256、日期、设备、浏览器/视口、匿名代号、编程背景及是否接触过项目。首访任务必须先做，主持人不先解释用途或提示入口。发起人自测需标已有背景，不能冒称新访客。

1. 首访：打开无 hash 首页，请读者自行说明能帮谁做什么、不能做什么；自己找起点进入地图并返回；选一个具体节点说明位置，打开一份核对资料；指出最停顿处与最想改的一处。记录第一点击、路径、耗时、原话、额外提示和实际外链。需独立完成用途解释、进出地图、节点与来源定位；提示后复述不算独立通过。
2. 三树：从照片分类情境开始，请读者说明问题/子问题、开始前待确认条件和下一步；区分 CNN、ResNet、实现与权重及角色；找一条关系的原始依据/版本，说明页面未实测事项；将目标改为类别表不含的自家 SKU，判断方案是否适用；解释为何“实现已选”仍不证明理解、跑通或达成目标。结束后主持人再对照事实基准，不提前教答案。
3. 关键误解记录候选版本、题目、提示和卡点，区分语义/来源与交互/导航。必要修订后重测受影响题目；既有完成任务不因复验自动重开。一次通过仅支持该参与者、路径与候选，不能外推全体读者或学习效果。

原始回答仅存经授权的私有证据位置；公开反馈只保留去标识结论与版本索引。没有真实参与者/记录时保持未验证，不生成假回答。

空白记录：`候选 commit / HTML SHA256 / 日期 / 匿名代号与背景 / 设备与浏览器 / 题目 / 实际路径与耗时 / 是否提示 / 去标识卡点 / 判定及依据 / 复测版本与结果 / 私有证据引用（不公开原文）`。

## 6. 证据分层与下一动作

| 层次 | 本轮结论 | 下一最小动作 |
| --- | --- | --- |
| 固定公开源码与生成物 | 已取得；限定检查通过；前后干净 | 另一设备执行第 2 节并记录自己的环境和输出 |
| 公开页面字节关系 | 本次 GET 与固定候选一致 | 每次后续在线验收重新核对 SHA256 |
| 浏览器 | 公网 B01—B09 有界走查通过；B10 本地文件未验证 | 具备本地 HTML 能力的检查者完成 B10；不绕过客户端策略 |
| 来源/许可 | 固定声明和来源入口已索引 | 按需核对具体第三方用途与上游许可；不是全库事实或合规审计 |
| 真人 | 未执行；没有读者理解证据 | 招募真实目标读者，按第 5 节无诱导试读并私有留证 |
| 最终发布/产品效果 | 本轮未变更和发布；未宣告完整 B01 验收 | 对最终候选汇总真人试读、必要修订及受影响复验 |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
