# 第四期详细设计计划

## 目标
在不修改业务代码、配置、依赖、数据库、测试或原型的前提下，承接既有调研并完成第四期权威详细设计文档 `docs/design/04-phase4-visual-polish.md`。

## 阶段
- [completed] 1. 前置调研：概要、foundation、前三期、原型、代码与测试基线
- [completed] 2. 针对性复核：权威范围、视觉数值、7 页/组件/API/工程缺口
- [completed] 3. 设计推演：token、组件、页面、反馈、Markdown、工程收尾与 P0～P6
- [completed] 4. 撰写 `docs/design/04-phase4-visual-polish.md`
- [completed] 5. 自审：范围、一致性、占位词、单一组件体系、批次可验收性
- [completed] 6. 交付报告与下一步实施计划入口

## 边界
- 仅允许修改本规划目录和 `docs/design/04-phase4-visual-polish.md`。
- 不修改业务代码、配置、依赖、数据库 schema/migration、测试或原型。初稿调研阶段禁止修改 `AGENTS.md`；第四期设计确认后，已按用户授权完成阶段说明更新。
- 不提交 Git commit。

## 已冻结决议
- 批次固定为 P0～P6；只迁移 Home/Search/PostDetail/Compose/Chat/Mine/Login 七页。
- 个人中心扩展、浏览量自增、评论时间、游戏专区/详情、多会话 AI、预设头像、正文 embedding、改帖均不进入第四期。
- 保持前三期业务、路由、状态、接口语义与 App Shell 结构。
