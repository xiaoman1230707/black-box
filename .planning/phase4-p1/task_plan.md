# 第四期 P1：token、Inter 与基础组件施工方案

## 目标

依据 foundation、04 设计、P0 基线和真实代码完成 P1 token、字体与基础组件施工；通过技术门禁后停下，等待用户人工确认再进入 P2。

## 阶段

- [completed] 1. 恢复 P0 上下文并同步用户人工确认门禁
- [completed] 2. 只读核对 App.css、foundation/system.css token 与 package/lock
- [completed] 3. 只读核对现有 6 个基础组件、调用方和 Base UI Select API
- [completed] 4. 形成真实文件矩阵、兼容策略、验证门禁与提交边界
- [completed] 5. 提交 P1 施工方案，等待用户确认
- [completed] 6. 用户已确认；已同步文档勘误并完成 P1.1～P1.5 技术门禁
- [completed] 7. P1 用户人工复验确认通过，允许进入 P2 方案阶段

## 范围红线

- 本轮允许修改已确认的 P1 文件矩阵、安装 Inter 并更新前端 lockfile、维护 P1 QA/设计/计划记录。
- 不修改页面、路由、store、API、JWT、SSE、业务语义、既有 e2e、原型或 P2 以后文件。
- 不新增 e2e，不进入 P2，不提交 Git，不覆盖前三期未提交改动。

## 错误记录

| 时间 | 问题 | 处理 |
|---|---|---|
| 2026-07-14 | 首次 `rg` 调用的 PowerShell 引号被解析器截断 | 拆成两个简单 `rg` 查询后成功；命令只读、无文件改动 |
| 2026-07-14 | 以 `--` 开头的 token 正则被 `rg` 误判为参数 | 在 pattern 前加入 `--` 后成功；命令只读、无文件改动 |
| 2026-07-14 | P1.1 首次 `pnpm build` 在沙箱内读取 Inter CSS 时 EPERM | 根因是沙箱读取 pnpm 字体包权限；授权环境重跑后 build 通过，未改代码绕过 |
| 2026-07-14 | 全量 `pnpm lint` 命中 16 个既存 error、3 个 warning，涉及 P1 禁止修改的 e2e/API/pages/utils 等 | P1 不能同时满足“全量 lint 通过”和“不改这些文件”；暂停施工，等待用户确认采用基线差分门禁或允许单独清理既存 lint |
| 2026-07-14 | P1.2 首次 build 报 `select.tsx` 的 React import 未使用 | react-jsx 无需该 import；删除单行后重跑定向 lint/build |
| 2026-07-14 | P1.5 首次定向 lint 报 gallery 未用 `Check`，且两个组件未导出触发 Fast Refresh | 删除未用 import，导出 dev-only gallery 组件；不改变产品入口或路由 |
| 2026-07-14 | gallery 首轮 Playwright 仅产出 1440 截图，Vite 首次优化 Select 后 reload；预热后重跑仍在截图后的复合交互链提前结束且工具未返回 stderr | 将四视口视觉捕获与单视口交互检查拆开，并写本地 JSON 证据，隔离具体失败层 |
| 2026-07-14 | 拆分后的四视口捕获全部成功，但校验脚本把实际 7 个 section 误写成 8，退出 1 | 将本地 QA 脚本期望修正为 7；截图、字体、宽度和 console 证据本身均正常 |
| 2026-07-14 | gallery 交互脚本按 `button` 查 Select Trigger 超时 | Base UI Trigger 的真实 ARIA role 为 `combobox`；修正本地 QA locator，不改组件 |
| 2026-07-14 | gallery QA 调用了 Playwright Locator 不存在的 `isFocused()` | 改用 DOM `document.activeElement` 比对；本地 QA 脚本问题，不改产品组件 |

## Lint 差分门禁

- P1 所有新增/修改 TS/TSX：0 errors / 0 warnings。
- `ui/button.tsx`、`ui/carousel.tsx` 各 1 个既有 Fast Refresh error 属 P1 文件，必须清除。
- 全量基线 16 errors / 3 warnings；P1 完成后上限 14 errors / 3 warnings。
- 剩余命中只允许来自：`e2e/compose.spec.ts`、`e2e/social.spec.ts`、`src/api/config.ts`、`ui/badge.tsx`、`pages/Compose.tsx`、`pages/Login.tsx`、`pages/Search.tsx`、`pages/post/index.tsx`、`src/utils/index.ts`。
- 不修改上述范围外文件；全仓 lint 债务另立工程任务。
