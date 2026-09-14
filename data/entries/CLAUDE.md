# entries/ · 逐节点解释与继续阅读
> L2 | 父级: ../CLAUDE.md

各 JSON 对应一个原有知识领域，保存领域身份、局部 sources 和 entries。正文叠加到分类库生成浏览器快照，不改动原下标、关系和组合。首次补齐的是基础说明，事实审阅仍需维护者逐项判断。

## 字段与复用边界

- 文档的 domain/name 对应原 group 身份；entries 中的 node/name 必须与原库匹配且属于本领域。
- summary 帮助定位，explanation 讲起因、具体过程或边界；核心主题可分段加深，不用父类名称拼占位文字。
- sourceIds 引用本文件 sources 中的局部唯一 id。来源 title/url/scope 指向具体资料并说明支撑范围。
- checkedAt 只记录实际打开核对页面的日期，省略表示待核验。HTTP 可用不证明资料支持解释；日期也不等于整条内容已获审核。
- 只有显式“同一个东西”关系共用基础说明，代表为最小原节点编号。其余位置的不同正文和来源作为领域语境补充保留，不能当重复垃圾删掉。
- 根构建检查每个非根节点都存在正文与来源、引用有效、身份匹配。同名或同类不会自动合并。
- 可选 objectEntries 是没有新 raw 落点的对象正文正本，以独立 id/name/summary/explanation/sourceIds 维护；data/objects.json 只引用正文，不另写一份解释。
- 可选 claims 逐项记录 statement、objectIds、原审核 locator/supportScope 和 evidence 的逐来源 sourceId/locator/scope；总限定与单一来源支持范围同时保留。来源支持与项目教学定义用 basisKind 分开，后者只引用公共 planning 定义，不伪造外部证据。
- 新来源的 trace 保留 version/publisher/kind/locator/availability 与 rights；固定 Git 位置使用 commit/permalink/gitBlob。rights 只授权当前保留的链接、事实元数据和原创解释，原件排除；代码许可不能自动用于权重。
- 编译对扩展和来源逐层使用字段白名单，拒绝私有或未知字段；来源 ID 编译为“领域编号:局部 ID”。旧文件缺省扩展产生空索引，仍由同一 compileContent 入口处理。

## 成员清单

- `01-software-units.json`: 软件的构成单位的解释与资料，领域编号 1，覆盖 156 个原节点。
- `02-data-structures.json`: 数据结构的解释与资料，领域编号 157，覆盖 96 个原节点。
- `03-algorithms.json`: 算法的解释与资料，领域编号 253，覆盖 88 个原节点。
- `04-design-patterns.json`: 设计模式的解释与资料，领域编号 341，覆盖 82 个原节点。
- `05-architecture-styles.json`: 架构风格的解释与资料，领域编号 423，覆盖 68 个原节点。
- `06-paradigms.json`: 编程范式的解释与资料，领域编号 491，覆盖 62 个原节点。
- `07-language-families.json`: 编程语言家族的解释与资料，领域编号 553，覆盖 67 个原节点。
- `08-language-parts.json`: 语言的构成部件的解释与资料，领域编号 620，覆盖 98 个原节点。
- `09-type-systems.json`: 类型系统的解释与资料，领域编号 718，覆盖 66 个原节点。
- `10-operating-systems.json`: 操作系统的解释与资料，领域编号 784，覆盖 85 个原节点。
- `11-network-protocols.json`: 网络与协议的解释与资料，领域编号 869，覆盖 73 个原节点。
- `12-databases.json`: 数据库与存储的解释与资料，领域编号 942，覆盖 90 个原节点。
- `13-concurrency.json`: 并发与并行的解释与资料，领域编号 1032，覆盖 46 个原节点。
- `14-compilation.json`: 从源码到运行的解释与资料，领域编号 1078，覆盖 57 个原节点。
- `15-frontend.json`: 前端的解释与资料，领域编号 1135，覆盖 68 个原节点。
- `16-backend.json`: 后端的解释与资料，领域编号 1203，覆盖 64 个原节点。
- `17-delivery.json`: 交付与基础设施的解释与资料，领域编号 1267，覆盖 56 个原节点。
- `18-testing.json`: 测试的解释与资料，领域编号 1323，覆盖 60 个原节点。
- `19-security.json`: 安全的解释与资料，领域编号 1383，覆盖 61 个原节点。
- `20-machine-learning.json`: 人工智能与机器学习的解释与资料，领域编号 1444，覆盖 81 个原节点；B01 修订 CNN，新增 9 份独立正文、10 个固定来源、15 条主张。
- `21-formats.json`: 数据的表示与格式的解释与资料，领域编号 1525，覆盖 66 个原节点。
- `22-collaboration.json`: 版本控制与协作的解释与资料，领域编号 1591，覆盖 47 个原节点。
- `23-hardware.json`: 计算机体系结构的解释与资料，领域编号 1638，覆盖 52 个原节点。
- `24-theory.json`: 理论计算机科学的解释与资料，领域编号 1690，覆盖 49 个原节点。

内容修订后由集成者运行 `node build.mjs` 与 `node build.mjs --check`；字段守卫的回归入口为 `node scripts/content-checks.mjs` 与 `node scripts/atlas-checks.mjs`。JSON 只含数据，契约与归属记录在本文件；B01 扩展文件另带 _contract，不进入公共编译结果。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
