# 第四期 P6：最终验收施工方案

## 目标与状态

依据 `docs/design/04-phase4-visual-polish.md`、`docs/plans/04-phase4-implementation-plan.md`、P0 基线及 P1～P5 QA，完成第四期最终回归、截图、静态审计、真实部署/主链路、数据终态和文档一致性验收。

**当前状态：已完成并关闭。** P6.0～P6.5 已通过，用户于 2026-07-17 明确确认 P6 与第四期整批人工验收通过。04、实施计划、QA 与 `AGENTS.md` 已同步；不自动进入第五期，未提交 Git。

## 范围红线

- P6 只验证和记录，不开发新功能，不改变业务语义，不安装依赖，不修改既有测试断言。
- 不修改 `docs/prototype/`、schema/migration、路由、store、API、JWT、SSE、AI 检索、seed 口径或已验收页面结构。
- 发现失败立即停在对应检查点，记录证据和责任批次，向用户确认后再处理；不得顺手修复。
- 保留脏工作树，不 reset/checkout/clean/stash，不覆盖用户改动，不提交 Git。
- 不在真实 `yue` 库重复 cleanup apply、seed/full 或 embedding backfill；P6 对其只做只读终态和证据复核。

## 文件矩阵

| 文件 | 动作 | 职责 |
|---|---|---|
| `.planning/phase4-p6/task_plan.md` | Create | P6 顺序、门禁和停止规则 |
| `.planning/phase4-p6/findings.md` | Create | 基线、差异、风险和待确认项 |
| `.planning/phase4-p6/progress.md` | Create/Append | 每条命令、耗时、结果、失败归属 |
| `docs/qa/phase4/p6-regression-report.md` | Create | 自动化、真实串验、静态、数据与部署总证据 |
| `frontend/black_box/scripts/capture-phase4-states.mjs` | Create | 14 状态 × 2 视口稳定截图；只用 route mock，不调用真实 AI |
| `frontend/black_box/scripts/generate-phase4-comparison.mjs` | Create | 生成 P0/P6 默认态人工并排索引，无像素阈值 |
| `frontend/black_box/scripts/run-phase4-real-smoke.mjs` | Create | 驱动隔离生产副本的七页真实主链路；不注册为产品 e2e，不 mock 后端或 AI |
| `backend/backend/posts/src/scripts/audit-phase4-state.ts` | Create | 只读输出 P6 数据计数、游戏分布和 embedding 维度，不进入应用运行路径 |
| `docs/qa/phase4/screenshots/p6/**` | Create | 7 页 × 4 视口默认态 28 图 |
| `docs/qa/phase4/screenshots/p6-states/**` | Create | 14 状态 × 1440/390 共 28 图 |
| `docs/qa/phase4/screenshots/comparison.html` | Create | P0/P6 默认态及 P6 状态索引 |
| `docs/design/04-phase4-visual-polish.md` | Modify at P6.5 | 真实实现与第十四章勾选 |
| `docs/plans/04-phase4-implementation-plan.md` | Modify throughout | P6 checkbox、结果和失败责任 |
| `AGENTS.md` | Modify only after final user acceptance | 将过期 P0 阶段描述同步为第四期完成事实 |

除上述 QA/规划/最终文档外，不计划修改生产源码、配置、依赖、lockfile、测试、数据库结构或原型。

## 执行顺序与检查点

### P6.0：前置冻结

1. 记录 HEAD、分支、`git status --short`、`git diff --stat`、Node/pnpm、PostgreSQL 工具版本和 3000/3106/4173/5173 端口。
2. 记录 P0 原始状态与当前状态的路径级差异；重点确认 `docs/prototype/` 无新增 diff。schema/migration 在 P0 前已存在历史改动，只能据 P0 路径台账与各批 QA 做路径级审计，不伪造逐字节 P0 快照。
3. 确认真实 `yue` 基线为 35 帖、13 评论、31 点赞、10 File、35/35 embedding，uploads 为 4 control + 22 referenced。
4. 任一基线漂移先停，不启动测试服务。

### P6.1：自动化总门禁

按顺序执行，结果逐条写入 `p6-regression-report.md`：

```powershell
# frontend/black_box
$env:VITE_API_BASE_URL='http://localhost:3000/api'; pnpm build
Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue
pnpm lint
pnpm test:unit
pnpm exec playwright test --list
pnpm e2e

# backend/backend/posts
pnpm build
pnpm test -- --runInBand
pnpm test:e2e -- --runInBand
pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
```

预期稳定基线：前端 Vitest 11 files/27 tests；Playwright 7 files/41 tests；后端 Jest 14 suites/63 tests；后端 e2e 现有 `app.e2e-spec.ts` 全部通过。build/test/e2e 必须退出 0。lint 的最终口径见“唯一待确认项”。任何失败停止 P6.1，不进入截图或真实串验。

### P6.2：部署与真实主链路

1. 在仓库外创建当前演示数据库的 custom dump 与 uploads 归档，记录大小和 SHA-256；从该快照恢复一次性 QA 数据库，并把 uploads 解压到仓库外临时 cwd。
2. 从临时 cwd 使用仓库绝对路径的 `dist/src/main.js` 启动 backend，使硬编码 `process.cwd()/uploads` 指向副本；`DATABASE_URL` 指向 QA 数据库，`PUBLIC_BASE_URL`/`FRONTEND_ORIGIN`/`PORT` 使用隔离端口。不得回显连接串、token 或 AI key。
3. 前端以显式 `VITE_API_BASE_URL` build 后启动 preview；验证标准 `pnpm start:prod` 仍可启动真实产物，并核对 CORS 只接受配置 origin。
4. 在副本上走注册、登录、token refresh、Home tag×game/快速切换/无限滚动、Search `q`、PostDetail Markdown/社交、Compose preview/上传/发帖、Chat SSE/引用或检索超时降级/切走保持、Mine 头像/退出。
5. Search 最长在 25 秒客户端边界进入结果或可重试 ErrorState；Chat 引用检索可在 20 秒降级，模型流与 55 秒客户端兜底必须结束 loading。记录首字节、总耗时、SSE `0:/8:/3:/d:` 实际组合，不要求供应商每次返回引用。
6. 验证 401、429、精确 CORS、媒体公开 URL、只读 viewCount、无评论伪时间、无 rag/git/avatar、多会话或持久化 Chat。
7. 停止服务并删除一次性数据库/uploads 副本；删除失败报告路径并停止。真实 `yue` 只读核对前后计数一致。

### P6.3：56 张截图与人工视觉审查

默认态：

```powershell
# frontend/black_box
pnpm visual:capture -- --stage=p6
```

必须保持 manifest 的 Home/Search/PostDetail/Compose/Chat/Mine/Login 与 1440×1000、900×1000、390×844、320×740，得到 `28/28`。脚本使用稳定 route mock、登录态、reduced-motion、轮播首帧和锚点等待，不调用真实 AI、不固定 sleep。

补充态由 `capture-phase4-states.mjs` 在 1440×1000、390×844 捕获：Home loading/empty；Search loading/empty/error；PostDetail long-markdown/delete-dialog；Compose preview/uploading；Chat typing/citations；Mine drawer；Login register/error，共 `28/28`。

`generate-phase4-comparison.mjs` 生成静态 HTML，将 P0/P6 默认态并排，并链接补充态。人工逐页检查 248/80/72 三态、safe-area、固定评论栏、无横向溢出/双滚动/遮挡、长文本、44px 命中区、focus-visible、disabled/busy、Dialog/Drawer portal、reduced-motion。不得新增像素断言或 `toHaveScreenshot` 产品门禁。

**执行状态（2026-07-17，已通过）：** 默认态 `28/28`、补充态 `28/28` 与 `comparison.html` 均已生成，56 张图片尺寸全部符合清单。代表性人工抽查覆盖四档 App Shell、移动固定评论栏、Markdown 长正文与局部宽表格、删除 Dialog、Compose 预览/上传 busy、Chat 引用、Mine Drawer、Login/Search error 与 Home loading；未发现页面级横向溢出、双滚动、遮挡、底部导航冲突或 portal 层级问题。Markdown 表格/代码块的宽内容由正文容器局部 `overflow-x-auto` 承载，不构成页面溢出。

### P6.4：静态、安全、数据与运维审计

1. 逐条复跑 `docs/qa/phase4/static-audit.md` 的 Geist、dark、直接色阶、HEX/oklch、柔阴影、大圆角、渐变、inline style、confirm/alert、localhost、class 状态和重复组件命令。
2. 清零项必须为 0；允许项逐条列文件和原因：`@custom-variant dark` 机制 1 处；HEX/cover gradient 只在 `App.css` token/cover；`rounded-full` 仅 pill/avatar；localhost 只在集中 config、测试、env 示例和文档。
3. 运行 Markdown/XSS、PageState、timeout、环境校验、CORS、限流、生产入口、cleanup 聚焦测试；真实库只运行 `pnpm maintenance:uploads` dry-run。
4. 运行 `pnpm exec ts-node src/scripts/audit-phase4-state.ts` 只读核对 35 帖、13 评论、31 点赞、10 File、5 游戏各 7 帖、空正文 0、重复标题 0、35/35 embedding 且 1536 维；uploads 为 control 4/referenced 22/orphan 0。
5. 复核备份 A/B 哈希、cleanup apply、双轮 seed/full、P5.9 与 P5.10 QA；不重复 apply、seed/full 或 70 次外部 embedding 调用。
6. `git diff --check` 必须无补丁错误；CRLF 提示单列为既有工作树属性。核对 prototype 无 diff，schema/migration 无第四期新增路径。

### P6.5：文档与最终人工门禁

1. 把每条命令、截图、静态命中、真实链路和数据结果写入 `p6-regression-report.md`。
2. 04 第十四章每个 checkbox 必须链接到 P6 证据；失败项保持未勾选。
3. 自动门禁与执行者人工检查通过后停止，交由用户按同一七页主链路和 comparison.html 人工验收。
4. 只有用户明确确认 P6/第四期整批通过后，才把 04 标为“已实现、已人工验收通过”、同步 `AGENTS.md` 并关闭 `.planning/phase4-p6/`。不提交 Git，不进入第五期。

## 失败处置

| 失败类型 | 处置 |
|---|---|
| build/unit/e2e 回归 | 停止，归属最后修改该模块的 P1～P5 批次；确认后按 TDD 修复并重跑 P6.1 全套 |
| 真实 Search/Chat 超时或协议异常 | 保存前后端状态、耗时和非敏感日志；区分有限失败是否按契约结束，不把供应商慢等同代码故障 |
| 截图溢出/遮挡 | 记录页面、状态、视口和截图；不在 P6 改 CSS，返回 P1/P2/P3/P4 责任批次 |
| 静态残留超出口径 | 记录精确文件和命中；禁止扩大允许列表掩盖残留 |
| 数据/uploads 漂移 | 立即停服务和写操作；不自动 cleanup/seed/restore，先报告并请求授权 |
| QA 副本清理失败 | 保留路径与进程证据，非零结束；不得声称环境已清理 |

## 已批准 lint 门禁

P6 lint 门禁存在已知冲突：

- 已批准现状：前端全量 `3 errors / 0 warnings`，仅 `src/components/ui/badge.tsx` 与 `src/utils/index.ts`；后端全量只读 eslint 存在 P5 前已登记的大量历史格式债。
- 主计划 P6.1 旧文字：所有命令退出 0；04 §14：lint 通过。
- P6 约束：不临时开发或顺手清债。

**批准口径：** P6 沿用差分门禁，所有 P6 新增/修改文件 0/0，前端全量不高于 3/0，后端全量不高于 P5 终态基线且新增文件 0/0；报告中如实标为“历史 lint 债未增加”，不表述为“全仓 lint 通过”。lint 清债登记为独立工程任务，不影响第四期功能与验收结论。

当前无产品范围、业务语义、数据库或安全事项需要拍板。
