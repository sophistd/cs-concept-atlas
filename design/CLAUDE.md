# design/ · CS/SE 导航地图设计样板
> L2 | 父级: ../CLAUDE.md

本模块保留首轮导航与内容样板供讨论。三个入口表达软件职责、知识领域、产品用途，共享概念与资源；本模块构建不改写根目录首页及分类库。审阅后的主入口仍为原有树图，当前全景解释由 data/entries 维护。

## 成员清单

- `index.html`: 自包含的可点击设计样板，由本目录构建脚本生成，正式原型仍是根目录入口。
- `template.html`: 语义页面骨架、首页软件构成图、三个入口与详情容器。
- `style.css`: 沿用暖灰与橙色的视觉系统，布局、焦点、响应式与打印样式。
- `view.js`: 入口导航与共享详情渲染，只消费内联内容，不发网络请求。
- `content.json`: 核实后的概念、SQLite/PostgreSQL 资源、关系、三条导航路径与来源正本。
- `sources.md`: 样板内容的来源核对与事实边界，不承诺全库已审。
- `build.mjs`: 校验后内联 HTML/CSS/JS/内容，生成独立样板；不运行旧原型构建。
- `validate.mjs`: 内容字段、唯一标识、跨入口引用、实现关联的双向清单与关系一致性、来源和链接格式的机械校验。
- `checks.mjs`: 在内存副本中构造坏数据，验证校验器拒绝重复标识、断裂引用和跨入口不一致。
- `review.md`: 设计范围、ASCII 结构、交互契约、阅读验收与已知边界。
- `contribution-template.md`: 新增资源、补关系和改解释的提交模板，以样板中的真实标识演示审核。
- `previous-intent.md`: 本轮定位替换前的历史设计说明，保留沿革，不作为现行约束。

命令：`node design/build.mjs` 构建；`node design/build.mjs --check` 检查内容、语法及产物同步，不写文件；`node design/checks.mjs` 验证内容校验器。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
