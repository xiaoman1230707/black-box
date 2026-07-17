# 第四期实施计划核对发现

## 已确认输入
- 权威设计：`docs/design/04-phase4-visual-polish.md`，状态已确认。
- 实施批次固定为 P0～P6；本轮只写计划，不执行任何批次。
- 工作树包含前三期大量未提交修改，后续任务必须以 P0 基线记录隔离，禁止破坏性 Git 操作。
- 前端脚本为 `dev/build/lint/preview/e2e`；Playwright 由 `playwright.config.ts` 启动 Vite，现有行为测试主要 mock 后端。
- 后端脚本为 `build/lint/test/test:e2e` 等；Jest 单测根目录为 `src`，后端 e2e 位于 `test/`。
- 当前 `App.css` 仍加载 Geist 和旧 oklch 主题；`MainLayout/Sidebar/Topbar` 已实现 248px/80px/移动底 tab 三态，P1/P2 只能视觉迁移，不能重做结构。
- `Topbar` 当前自行维护输入并导航 `/search?q=`，为 P2 抽 `SearchBar`、P3 Search 消费 `q` 的真实接线起点。
- Playwright `pnpm exec playwright test --list` 再次确认 7 个 spec、41 tests；本轮只列举未运行测试，P0 建议在任何视觉改动前完整跑一次 41 条，以建立可归因行为基线。
- 当前前端无单元测试 runner；纯视觉不新增测试体系。P1 可用 dev-only 组件展示面 + build + 人工验收，P4 新行为 e2e 必须等用户人工确认后再补。
- `@base-ui/react` 已包含 Select、AlertDialog、Toast primitive；设计已指定 Toaster 基于 sonner，因此 P4 只新增 `sonner`，AlertDialog/Select 复用现有依赖。
- 官方 `@nestjs/throttler` 当前 v6.5.0，v5+ 的 `@Throttle` 使用 `{ default: { limit, ttl } }` 且 ttl 为毫秒；全局 guard 先于路由 JWT guard，tracker 不能依赖 `req.user`。
- 限流实施契约：全局 `AppThrottlerGuard` 对 Bearer token 做独立验证仅生成 `user:<sub>` tracker，缺失/无效则回退 `ip:<address>`；JwtAuthGuard 仍是授权唯一来源，SSE handler 与响应协议不改。
- Prisma `File`/`Avatar` 均无 createdAt，且本期禁止 migration；24 小时清理保护只能依据磁盘文件 mtime。DB 记录存在但派生文件均缺失时无法安全判断年龄，只报告不删。
- P5 seed 需从现有 14 条扩到稳定 35 条；manifest 定向清理，禁止按演示用户全量删帖；图片 fixture 使用独立生成资产，不复制 prototype 假数据。

## 已完成核对
- 3 处状态同步残留已按“设计已确认、AGENTS 已进入第四期”口径修正，历史约束保留为时间点说明。
- P0～P6 已逐批绑定真实文件、package scripts、测试目录和现有组件/API/store 路径；共 7 批、40 个任务。
- 04 第十四章验收项已建立到实施任务和 P6 证据的逐项映射。
- P1 dev-only gallery 已锁定源码与临时 HTML 路径；P5 环境校验已锁定 `dotenv` 直接依赖和统一加载入口，避免计划执行时临时发明结构。

## 错误与处置
- Windows 下 `rg .planning/phase4-discovery/*.md` 不展开通配符，已改为显式文件读取。
- 一次 PowerShell 组合数组命令括号错误，未产生文件改动；后续改用显式路径数组。
