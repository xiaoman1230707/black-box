# 第四期 P4：Markdown、安全渲染、统一反馈与状态施工方案

## 目标

依据已确认的 04、foundation、实施主计划及 P1～P3 真实实现，形成 Markdown、安全渲染、Toaster、AlertDialog、PageState、Skeleton 与页面反馈接线的可执行施工方案；本轮只调研和写文档，不实施 P4。

## 阶段

- [completed] 1. 同步 P3 整批人工验收通过并切换活动计划
- [completed] 2. 核对依赖、现有 primitive/portal/ErrorBoundary、页面状态槽与反馈路径
- [completed] 3. 明确 Markdown/sanitize/链接图片安全契约和旧帖兼容
- [completed] 4. 明确统一反馈与状态组件契约、页面接线及布局冻结边界
- [completed] 5. 回填实施主计划、设计差异、验证门禁并完成自审

## 实施

- [completed] P4.1 依赖、Vitest、反馈/状态 primitives 与 dev-only gallery
- [completed] P4.2 Markdown policy、sanitize、URL 策略与唯一 Renderer
- [completed] P4.3 Home/Search/Chat 真实状态接线
- [completed] P4.4 Compose 编辑/预览与动作反馈
- [completed] P4.5 PostDetail Markdown/Dialog、Mine/Login 反馈与整批门禁
- [completed] 用户人工验收 P4；允许进入 P5 施工方案阶段

## 范围红线

- 只规划 P4：Markdown 编辑/预览与安全渲染、单一 Toaster、AlertDialog、PageState、Skeleton 及已批准反馈接线。
- 不改路由、接口、DTO、schema/migration、JWT/SSE/AI、Search/Home 语义、后端、原型或 P5 工程项。
- 本轮不安装依赖、不修改业务源码/测试、不新增 e2e、不提交 Git。

## 当前门禁

- P3 已人工验收通过；P4 方案已获用户确认，成功删除焦点 fallback 已补正，允许按 P4.1～P4.5 实施。
- P4 实施后仍需 P4 范围 lint 0/0、全量 lint不高于 4/0、build、现有 7/41 Playwright 与四视口人工验收。
- P4 已于 2026-07-16 通过用户人工验收；当前无未关闭的 P4 范围、安全或业务语义问题。

## 错误记录

| 时间 | 问题 | 处理 |
|---|---|---|
