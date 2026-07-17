# 第四期 P3：七个现有页面一次性视觉迁移施工方案

## 目标

依据 04、foundation、实施主计划与 P0～P2 真实落地，形成 Home、Search、PostDetail、Compose、Chat、Mine、Login 七页可顺序实施、逐页验收的 P3 施工方案；本轮只调研和写文档，不修改业务代码。

## 阶段

- [completed] 1. 同步 P2 人工复验通过并切换活动计划
- [completed] 2. 核对权威设计、七页真实代码、store/API/路由与现有测试
- [completed] 3. 建立页面/文件职责矩阵和 P1/P2 复用关系
- [completed] 4. 明确七页施工顺序、状态、响应式、风险与验证门禁
- [completed] 5. 回填实施主计划并完成范围、差异、占位词与一致性自审

## 当前门禁

- P3.1～P3.7 已完成页面级施工、自动验证、28 张终态截图和整批人工串验。
- Search 过期去重标记缺口已修正并复验；7 个文件、41 条 Playwright 与批准 lint 基线均保持。
- 用户已确认 P3 整批人工验收通过，活动计划已切换至 P4 施工方案；P3 不新增 e2e、不提交 Git。

## P3.1 Home

- [completed] 冻结 Home 行为、testid 与迁移前测试基线（8/8 passed）
- [completed] 使用 P1/P2 组件完成 Home 一次性视觉迁移
- [completed] 定向 lint、build、Home/game-filter Playwright 验证
- [completed] 生成并人工检查 Home 四视口截图与交互契约
- [completed] 回填 QA、实施主计划、04 实现状态并停在人工门禁

## P3.2～P3.7

- [completed] 冻结六页现有行为、testid、lint 与对应 Playwright 基线
- [completed] P3.2 Search 页面级施工与验证
- [completed] P3.3 PostDetail 页面级施工与验证
- [completed] P3.4 Compose 页面级施工与验证
- [completed] P3.5 Chat 页面级施工与验证
- [completed] P3.6 Mine 页面级施工与验证
- [completed] P3.7 Login 页面级施工与验证
- [completed] P3 全量 build/lint/41 Playwright/28 截图/执行者人工串验与文档回填

## 整批人工门禁

- [completed] 修复首轮整批评审发现的 Search 过期去重标记，并完成一次性行为 QA、lint、build 与 41 条回归
- [completed] 用户确认 P3 七页整批人工验收通过；允许切换到 P4 施工方案，不新增 P3 e2e、不提交 Git。

## 范围红线

- 只规划七个现有页面的视觉迁移及 Search 消费现有 `q` 的已批准接线。
- 不改路由、接口字段、store 业务结构、数据库、后端、原型、Markdown/Toast/Dialog/PageState 或 P5 工程项。
- 保持 Home 筛选/滚动恢复、Chat SSE/JWT/单会话、Login 独立布局等前三期语义。

## 错误记录

| 时间 | 问题 | 处理 |
|---|---|---|
| 2026-07-15 | `pnpm exec playwright` 在当前 PowerShell 未解析本地 CLI；改用 `.\\node_modules\\.bin\\playwright.cmd` 后，自动启动 Vite 又因读取本地 Inter 包触发 `EPERM`，8 条用例未进入断言 | 与 P2 已登记环境问题一致；不改代码/配置，改为沙箱外显式启动同一 Vite，再由 Playwright `reuseExistingServer` 复用 |
| 2026-07-15 | 首轮一次性 QA 用 `getByText('首页基线帖子 1')` 同时匹配帖子 1/10 | 临时脚本定位改为 `exact: true` 后复跑；产品代码与既有 e2e 未改 |
| 2026-07-15 | 最终静态扫描的首条 PowerShell 组合命令嵌套引号解析失败 | 拆分为定向 lint、全量 lint、`rg` 三条独立命令，均取得明确结果 |
| 2026-07-15 | 截图子集计数误用 PowerShell 只读变量 `$HOME` | 改用 `$homeFiles` 复跑，确认总计 28 PNG、Home 4 PNG |
| 2026-07-15 | Search 手动提交已完成 debounce 的 A 后，去重 ref 无后续同值 effect 可消费；经过 B 后再次输入 A 会被误跳过 | 一次性 QA 先复现 `A,A,B`，再将 ref 改为下一轮 debounce 必定清空、仅同值跳过；修复后为 `A,A,B,A`，其余 q/category/history 契约不变 |
