# 分支与发布流程

<!--
[INPUT]: main 的公开基线、develop 集成线及各任务的明确范围和验证证据。
[OUTPUT]: 创建分支、提交审阅、集成与发布时的一致流程。
[POS]: 仓库级协作契约；不替代具体任务授权、许可或产品验收。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

2026-09-22 确认：`main` 只发布，`develop` 集成，任务分支从 `develop` 开出。

```text
develop → 任务分支 → PR 到 develop → 集成验证 → 发布 PR 到 main
```

| 分支 | 职责 | 进入方式 |
| --- | --- | --- |
| `main` | 已发布候选；GitHub Pages 继续沿用 main / 根目录 | 仅由 develop 的发布 PR 进入，发布前核对授权和候选证据 |
| `develop` | 已审任务的共同集成基线 | 任务 PR；日常任务不直接提交到此分支 |
| `codex/<任务>` 或任务指定名称 | 一个有界任务，使用独立工作树 | 从最新 origin/develop 开出；PR 明确指定 base=develop |

分支名沿用任务给出的建议（例如 `ronin/cic-75-…`）；没有指定时采用 `codex/` 前缀。分支存在于临时独立 clone 并不等于主仓库已登记；正式任务须能从主仓库的 `git branch` / `git worktree list` 找到。

## 开工

先确认根目录、分支、工作区和远端。原目录有未提交工作时保留它们，使用独立工作树。不要全量暂存、强制覆盖、reset 或 clean。

```sh
git status --short
git fetch origin
# 把任务名和目录替换为本次实际值；目录必须不存在。
git worktree add -b codex/task-name ../cs-atlas-task-name origin/develop
```

只提交本任务允许的文件。提交前检查 diff 和相关 L3/L2/L1 文档；源码/内容变更还需构建根 index.html，并完成相关检查。公开候选不可包含内部原始记录、个人回答、凭据或未获授权的私人材料。

## 审阅、集成与发布

1. 推送时显式写出任务分支，禁止 `--all`、`--mirror`、强制推送或顺带推送历史分支。
2. 任务 PR 的目标固定为 `develop`，即使 GitHub 默认分支仍为 main，也必须显式指定目标；相关检查通过后集成。保持提交历史可追溯，不改写已共享分支。
3. 发布前从 develop 准备最终候选及验收证据，再创建 `develop → main` PR。合入 main 会影响公开版本，必须属于该次已授权发布范围。
4. 将合并、部署、在线字节核对、浏览器检查和真人验收分别记录。进入 develop 不代表发布，进入 main 不代替产品验收。

若 develop 前进，在任务工作树中先检查干净状态，再显式合并 origin/develop、解决冲突并重验受影响范围；不要静默重写已共享提交。

## 本地内部材料与历史分支

`_local/` 保持忽略。`codex/local-planning` 仅用于容纳当前本机的内部规划工作，不是公开集成线，也不向 origin 推送；需要进入产品的内容必须经过明确选取和去标识审阅，从任务分支交付。

`pre-public` 和 `feat/curate-bundles-icons` 属于发布前的本地历史，不能推送或合并进公开分支。旧工作树即使分支已被合并，也可能仍有未提交内容；删除前必须分别核对提交和文件，不能仅凭 branch --merged 判断可删。

## 护栏与能力边界

本仓库的 `Branch policy / branch-policy` 工作流验证 PR 方向：任务 → develop、develop → main。它本身不授予发布权限，不替代源码检查，也不会自动合并。

服务端应为 main/develop 要求 PR，禁止强推与删除，并要求该检查通过。管理员可将默认分支设为 develop，GitHub Pages 发布源仍保持 main / 根目录。默认分支与发布源是两个独立设置。

本地 hooks 可以防误操作，但不会自动传播到其他 clone，也不能替代 GitHub 保护规则。服务端配置是否实际生效，必须通过 API 或设置页面另行回读，不能因为文档写了就称为已启用。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
