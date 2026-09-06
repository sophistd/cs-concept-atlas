# 内容样板 · 来源与事实边界

> 核对日期：2026-09-04。内容正本为 `content.json`；本文解释来源能支撑哪些主张，以及哪些是编辑设计。

[INPUT]: SQLite 与 PostgreSQL 官方公开介绍和技术手册，以及本轮批准的导航目标。
[OUTPUT]: 供维护者复核样板内容的主张与来源对应表。
[POS]: `design/` 的内容审阅依据；与 JSON 中的 `sourceIds` 对齐，不维护第二份资源正文。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

## 核实范围

本次只核对 SQLite、PostgreSQL 两条资源与支撑它们的四个概念。采用官方资料的简短中文转述，没有复制长段原文。PostgreSQL 手册链接固定到已核对的第 18 版，避免 `current` 换版后读者不知依据发生变化；核对日期不等于源文档发布日期。

没有在本次安装、运行或压测数据库，也没有审校原型全库。对来源的核对不等于读者已经理解：三入口与资源卡能否帮助初学者定位，仍须通过实际阅读验证。

## 主张与来源

| 主张范围 | 内容中的对应位置 | 支持来源 |
|---|---|---|
| SQLite 是进程内 SQL 引擎，能够直接管理数据库文件 | `sqlite`、`sqlite-storage`、`sqlite-relational` | [sqlite-about · 官方介绍](https://www.sqlite.org/about.html) |
| SQLite 无独立数据库服务；此处的 serverless 与云服务代管不同 | `embedded-database`、`sqlite` 使用条件、`sqlite-embedded` | [sqlite-serverless · 运行方式](https://www.sqlite.org/serverless.html) |
| SQLite 可用于设备、桌面应用及合适的网站；一个数据库同时只有一个写入者；网络共享文件直接多机访问有边界 | `sqlite` 用途与限制、两资源比较条件 | [sqlite-uses · 适用场景](https://www.sqlite.org/whentouse.html) |
| 关系型数据库用表组织记录；表含行与列 | `relational-database`、`postgresql-relational` | [pg-concepts · 关系与表](https://www.postgresql.org/docs/18/tutorial-concepts.html) |
| PostgreSQL 是开源对象关系型数据库，有数据类型与扩展能力 | `postgresql` 类型与用途、`postgresql-relational` | [pg-about · 官方介绍](https://www.postgresql.org/about/) |
| PostgreSQL 由客户端与服务协作；服务管理文件；可同机或异机；网页服务器也可成为数据库客户端 | `client-server-database`、`postgresql` 环境与服务条件 | [pg-architecture · 架构教程](https://www.postgresql.org/docs/18/tutorial-arch.html) |
| PostgreSQL 可以自行安装，也可以连接已经配置的实例 | `postgresql` 安装条件 | [pg-install · 安装教程](https://www.postgresql.org/docs/18/tutorial-install.html) |
| 官方提供 Linux、macOS、Windows 等平台的安装入口 | `postgresql` 运行环境 | [pg-download · 下载页](https://www.postgresql.org/download/) |
| 数据库连接通过角色建立，权限受角色与认证设置约束；数据库角色与系统用户是不同概念 | `postgresql` 账号条件、`client-server-database` | [pg-roles · 数据库角色](https://www.postgresql.org/docs/18/database-roles.html) |
| PostgreSQL 的有价值数据需要定期备份，备份方式有各自前提 | `postgresql` 维护限制 | [pg-backup · 备份与恢复](https://www.postgresql.org/docs/18/backup.html) |

## 编辑设计与推论

- “关掉待办页面后仍能找回记录”是解释持久保存的教学情境，不是引用某个产品的实际行为。`data-storage` 是本样板的职责入口，不穷举内存、文件、对象存储等全部方案。
- 四个概念名称与三条路线是本项目的导航设计。SQLite/PostgreSQL 官方文档支持相关机制，不为这套首页或知识分类背书。
- SQLite 无需注册云账号、PostgreSQL 可自装而不必购买云服务，是根据其公开运行和安装方式作出的直接推论。第三方托管服务的账号、价格、配额和运行特性未在本次逐项核对，因此页面只提示另查所选服务。
- `comparable` 的含义是“可围绕同一个存储需求考察”，不是认定二者设计目标相同。数据位置、写入并发和维护安排来自官方架构及适用场景；迁移前检查语法、类型、扩展与代码是维护者的工程建议。
- `implements` 是本样板用于表达“具体项目提供某种能力或采用某种运行方式”的关系；它不是完整本体模型。若下一轮需要区分能力实现与类别归属，应在真实内容需求出现后修订接口。
- 不以网站访问次数给出容量承诺，不将 SQLite 定位为玩具，不把 PostgreSQL 描述成必须付费或必须部署到云端。具体选型仍要回到产品负载和运行条件。

## 审核边界

`sourceIds` 证明存在可回溯依据，不代表每句话都被自动判断为正确。机械校验只能核对字段、标识、关系引用及链接格式。维护者需人工核对来源是否支持当前表述，并检查遗漏条件与读者可能产生的误解。

内容修改涉及用途、限制或关系时，应重读相应来源并更新条目的核对日期；只改标点不应伪造一次重新核实。原型其他条目不会因此获得“已核实”状态。
