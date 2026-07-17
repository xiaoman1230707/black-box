# 第四期 P6 最终验收报告

> 日期：2026-07-17  
> 状态：P6.0～P6.5 已完成，第四期已获用户整批人工验收通过。  
> 纪律：P6 只验证和记录；发现真实缺口停止汇报，不在本批临时开发。

## 1. 已批准验收口径

- P6 新增或修改文件 lint 必须 `0 errors / 0 warnings`。
- 前端全量 lint 不高于批准基线 `3 errors / 0 warnings`。
- 后端全量只读 eslint 不高于 P5 终态基线。
- 历史 lint 债未增加时如实记录，不表述为“全仓 lint 通过”；清债为独立工程任务。
- 真实写链路只使用隔离数据库/uploads 副本；真实 `yue` 不重跑 cleanup apply、seed/full 或 embedding backfill。

## 2. P6.0 工作树与数据基线

| 项目 | 结果 |
|---|---|
| HEAD / branch | `f29ea940dfb7f4492a09119303c3cf78864f7e2b` / `main` |
| 工作树 | 152 项：57 modified、14 deleted、81 untracked；保留既有脏树 |
| tracked diff stat | 70 files，4466 insertions，44537 deletions；包含前三期与第四期累计未提交差异 |
| Node / pnpm | `v24.18.0` / `11.9.0` |
| PostgreSQL tools | `pg_dump`/`pg_restore` 18.4；bsdtar 3.8.4 |
| 端口 | 3000、3106、4173、5173 均无监听 |
| 数据库 | 35 Post、13 Comment、31 Like、10 File、1 Avatar |
| 游戏 | 艾尔登法环、黑神话、塞尔达、赛博朋克、原神各 7 帖 |
| 内容质量 | 空正文 0、重复标题 0 |
| embedding | 35/35 非空，全部 1536 维 |
| uploads | 26 文件、432558 bytes；4 control + 22 JPG |

`docs/prototype/`、schema/migration 在 P0 台账中属于不同历史状态：prototype 当时已作为 untracked 文档树记录，schema/migration 在 P0 前已有前三期差异。P6 只按 P0 路径台账及各批 QA 审计第四期未扩大范围，不声称拥有不存在的逐文件 P0 内容快照。

### 调查执行环境记录

- 内联 Prisma 统计在沙箱因 pnpm junction `EPERM` 失败；两次非沙箱 `node -e` 又因 PowerShell 引号展开在 JavaScript 解析阶段失败，均未访问数据库。
- 改用可复跑的只读 `src/scripts/audit-phase4-state.ts`；新增文件 eslint 0/0，随后成功读取上述计数。脚本不写数据库、不进入应用启动路径。

## 3. P6.1 自动化总门禁

**状态：通过。**

| 检查 | 结果 |
|---|---|
| 前端 build | 通过，2456 modules transformed |
| 前端 Vitest 首轮 | 10 files passed、1 failed；build 专用 `VITE_API_BASE_URL` 泄漏，使“缺变量应失败”用例失真 |
| 前端 Vitest 独立复验 | 清除变量后 11 files/27 tests passed；确认是验收命令环境污染，不是产品回归 |
| 后端 build | 通过 |
| 后端 Jest | 14 suites/63 tests passed |
| 后端 e2e | 测试收集失败，0 tests executed |
| 后端 e2e 最小修复 | 用户授权仅增加 Jest `src/*` mapper；RED 后 1 suite/1 test passed，命令最终 exit 0 |
| Playwright list/full | 7 files/41 tests；41 passed |
| 前端全量 lint | 3 errors/0 warnings，仅 badge 1、utils 2；与批准基线一致 |
| 后端全量只读 eslint | 881 errors/7 warnings/35 files，低于 P5 1268/7 |
| P6 新增数据审计脚本 lint | 0 errors/0 warnings |

### 后端 e2e 阻塞

- `test/jest-e2e.json` 只配置 extensions、root、environment、regex 与 ts-jest transform，没有 `moduleNameMapper`。
- `src/users/users.service.ts` 使用 `import { PrismaService } from "src/prisma/prisma.service"`。
- 只读扫描确认这是 `src/` 与 `test/` 中唯一 `from 'src/...'`/`from "src/..."` 绝对导入。
- Nest build 能借助 TypeScript `baseUrl` 通过，但 Jest e2e resolver 无法解析，报 `Cannot find module 'src/prisma/prisma.service'`。
- 该失败在非沙箱环境稳定发生，不属于 pnpm junction 权限问题。

用户确认将该缺口归入测试基础设施责任范围；仅在 `test/jest-e2e.json` 增加 mapper 后转绿，未修改业务源码或断言。Jest 完成断言后提示 open handle，并约 50 秒后自行退出 0；该延迟作为独立测试卫生债登记，不影响本次断言结果，也不表述为全仓测试基础设施无债。

## 4. P6.2 部署与真实主链路

**状态：已通过。**

- 隔离数据库：`yue_phase4_p6_20260717_122139`，由真实终态同一停写快照恢复；只用于 P6 写链路，完成后销毁。
- 仓库外 runtime：`C:\Users\15593\Black-box-p6\yue_phase4_p6_20260717_122139\runtime`，含 uploads 副本与服务日志。
- 快照证据：数据库 dump 290143 bytes，SHA-256 `24BBC63FF4AA99A0D2BC82FDFEF3E678EDC5805D9C47B2A2EB6914784D1FA65D`；uploads 328043 bytes，SHA-256 `028D4928231F24363F12F5F9E2B656E6FFD4FF791501FB3FED453DD0F11B8557`。
- 恢复后只读审计与真实 `yue` 基线一致；uploads 恢复 26 个文件。
- 前端已使用 `VITE_API_BASE_URL=http://localhost:3107/api` 完成生产 build；真实链路由 `scripts/run-phase4-real-smoke.mjs` 驱动，不注册进现有 7 files/41 tests，也不 mock 后端或 AI。脚本定向 lint 0/0。

### 已通过节点

- production backend `dist/src/main.js` 在 3107 启动，preview 在 4173 启动，两个健康检查均为 200。
- 真实注册并自动登录成功，access/refresh token 均落入既有 store；未记录 token 值。
- Home 5 个游戏筛选存在；“原神”稳定得到 7 条；快速切换最终高亮与 7 条列表一致；取消筛选后无限滚动由 10 条增至 20 条。
- 把副本账号 access token 置为无效值后进入 `/search?q=玛莲妮亚打法`，401 触发现有 refresh 流程并替换 access token。两次有效实测分别在 11.020 秒进入 ErrorState、2.839 秒进入 success，均满足 25 秒有限结果/失败契约。
- 发评论与回复均成功写入副本；只读 API 确认评论树作者与当前账号相同。

### 阻塞与根因

- UI 不渲染本人评论的 `data-testid="delete-comment"`，因此无法完成删除 Dialog 主链路。
- 真实浏览器诊断：store 中 `user.id` 为字符串；评论 API 的 `comment.user.id` 为数字。`CommentItem` 使用 `currentUserId === comment.user.id`，严格相等恒为 false。
- 后端 `AuthService.login()` 当前返回 `id: user.id.toString()`；前端 `User` 类型声明和评论节点均为 `number`。这是跨层返回契约不一致，不是外部 AI、环境或视觉问题。
- 现有 `social.spec.ts` 的登录 mock 使用数字 id，故 41 条行为基线未覆盖真实返回类型。
- P6 不临时开发修复。Compose、Chat、Mine、真实 429/CORS/移除接口等后续串验尚未执行，不可据此声明 P6.2 或第四期通过。

### 环境收口

- 3107/4173 已按监听 PID 停止，端口无残留；未触碰 3000/5173。
- 一次性数据库/uploads 副本暂保留在上述仓库外路径，便于获批修复后原样复现；真实 `yue` 未写入。
- 停服后真实 `yue` 只读审计仍为 35 帖、13 评论、31 点赞、10 File、1 Avatar；5 个游戏各 7 帖；空正文/重复标题 0；35/35 embedding 均为 1536 维。

### 授权修复与复验状态

- 用户已授权最小业务修复。后端新增契约测试先 RED（期望数字 25，实际字符串 `"25"`），前端新增两条 store 测试先 RED（新登录与旧 persist 恢复均保留字符串）。
- GREEN 实现：登录响应返回 Prisma 数字 id，JWT `sub` 不变；前端登录和 persist merge 统一归一化旧数字字符串，非法旧用户状态不保持登录。
- 定向结果：后端 1/1、前端 2/2 通过。P6.2 仍保持未通过，等待全量回归与隔离真实链路完成。
- 修复后全量结果：前端 build 2456、Vitest 12 files/29 tests、Playwright 7 files/41 tests 全部通过；后端 build、Jest 15 suites/64 tests 通过。前端全量 lint 保持 3/0，后端全量保持 881/7；历史债未增加，不表述为全仓 lint 通过。

### 最终真实串验

- 完整 runner 最终 exit 0。注册登录成功；Home 由 10 条无限滚动至 20 条，游戏筛选与快速切换通过。
- Search 在故意失效 access token 后完成 refresh，并于 2.806 秒进入 success；此前同链路也分别验证了 11.020 秒和 20.355 秒进入明确 ErrorState，有限失败成立。
- PostDetail 评论、回复与删除 Dialog 通过；详情访问前后本轮目标帖 viewCount 均为 0；评论区无伪时间。
- Compose Markdown 编辑/桌面实时预览、真实图片上传、发帖与详情渲染通过。
- Chat 4.215 秒完成真实回答，引用 1 条，实际 data stream 包含 `0:`、`8:`、`d:`；SPA 切走返回后对话保持。
- Mine 头像上传使用 `http://localhost:3107/uploads/...` 配置 URL，退出后访问 `/chat` 重定向登录。
- 匿名 AI search 401；`/ai/rag`、`/ai/git`、`/ai/avatar` 均 404；只允许 `http://localhost:4173` 的精确 CORS；登录第 10 次命中 429。
- 浏览器 page error 为 0；唯一 expected console error 是 token refresh 场景故意触发的首个 401 resource。
- 3107/4173 已停止；一次性数据库和仓库外 runtime 已删除。真实 `yue` 销毁后复核仍为 35 帖、13 评论、31 点赞、10 File、1 Avatar、5 游戏各 7、35/35 embedding 1536 维。

## 5. P6.3 截图与视觉审查

- 默认态：`docs/qa/phase4/screenshots/p6/` 共 `28/28`，覆盖 7 页与 1440×1000、900×1000、390×844、320×740。
- 补充态：`docs/qa/phase4/screenshots/p6-states/` 共 `28/28`，覆盖 14 个稳定状态与 1440×1000、390×844。
- 索引：`docs/qa/phase4/screenshots/comparison.html` 已生成；图片尺寸复核 `BAD_DIMENSIONS=0`。
- 人工抽查覆盖四档 App Shell、移动固定评论栏、Markdown 长正文/GFM 表格/代码块、删除 Dialog、Compose 预览与上传 busy、Chat 引用、Mine Drawer、Login/Search error、Home loading。未发现页面级横向溢出、双滚动、遮挡、底部导航冲突或 portal 层级问题。
- Compose 移动预览中的宽表格和代码块由 Markdown 正文自身的 `max-w-full overflow-x-auto` 局部容器承载，不扩张页面宽度。
- 截图使用 route mock、reduced-motion、稳定锚点和固定轮播首帧；不调用真实 AI、不使用固定 sleep、不注册产品测试或像素阈值断言。

### 5.1 最终评审修正：Compose 移动预览

- 用户最终抽查指出首轮 `390x844/compose-preview.png` 的预览卡片右边框、标题和表格被右侧裁切；执行者此前把该现象误判为局部横滚，上述首轮结论不成立。
- 修复前一次性诊断：document `clientWidth=390`、`scrollWidth=606`；预览直接 grid item 宽 552px；table scroller `clientWidth=512`、`scrollWidth=512`。根因是预览直接 grid item 缺少 `min-w-0`，内部 `min-w-lg` 表格参与 intrinsic minimum 并撑宽父项。
- 最小修复：仅为 Compose 预览直接 grid item 增加 `min-w-0`，不改变 MarkdownRenderer、表格最小宽度、编辑/预览业务或 P3 布局结构。
- 修复后诊断：document `clientWidth=390`、`scrollWidth=390`；预览 item 282px；table scroller `clientWidth=242`、`scrollWidth=512`。页面不再横向扩张，宽表格改为预期的局部横滚，标题正常换行、卡片右边框完整。
- `capture-phase4-states.mjs` 已重新生成补充态 `28/28`，修复后 390px 图片覆盖原文件；临时宽度诊断代码已移除。
- 回归：Compose/截图脚本定向 lint 0/0、build 2456 modules、全量 lint 保持批准基线 3/0、Playwright 7 files/41 passed。

## 6. P6.4 静态、安全、数据与运维审计

### 6.1 已通过项

- 静态清零：Geist 0、直接 Tailwind 色阶 0、柔阴影 0、`rounded-xl/2xl/3xl` 0、业务渐变类 0、inline style 0、`window.confirm/alert` 0。
- 允许项：暗色仅 `App.css` 的 `@custom-variant dark` 机制 1 处，无旧 `.dark` token 值块或入口；视觉 HEX 56 处均集中在 `App.css` token/cover；`rounded-full` 仅 Drawer handle、scroll thumb 与 Home avatar skeleton 等圆形控制/头像占位；localhost 仅后端集中 `config/env.ts` 开发默认 2 处与其 spec 2 处，前端及其他业务模块为 0。
- `active ?` 文本命中 5 处均为 `active` 属性类型或生成 `data-state`/语义 state，不是 class 三元；SearchBar、TagChip、StatButton、PostItem 各只有一套实现。
- 聚焦测试：前端 8 files/19 tests，后端 6 suites/33 tests，生产启动契约 1/1，均退出 0。覆盖 Markdown/XSS/旧换行、PageState、URL/env、AI 有限失败、CORS、限流和 cleanup filename 聚合；P6.2 已完成隔离生产启动和真实主链路。
- 真实 `yue` cleanup dry-run：control 4、referenced 22、orphan 0，其余分类 0；未使用 `--apply`。
- 真实 `yue` 只读终态：35 帖、13 评论、31 点赞、10 File、1 Avatar，五游戏各 7，空正文/重复标题 0，35/35 embedding 且均 1536 维。
- 备份 A/B 四个 SHA-256 与原证据一致；`pg_restore --list` / `tar -tzf` 目录项分别为 A 98/50、B 98/10。
- `git diff --check` 无补丁错误，仅既存 LF/CRLF 提示；3000/3107/4173/5173 无监听。prototype untracked、schema/migration modified/untracked 均与 P0 路径台账一致，P6 不声称拥有不存在的逐文件 P0 内容快照。
- 用户最终抽查发现 PID 13520 的本项目 `dist/src/main` 仍监听 3000，推翻了执行者基于受限 `Get-NetTCPConnection` 得出的“端口空闲”判断。复核确认受限 API 会漏报且 CIM 查询被拒绝，而 `netstat -ano` 与 HTTP 均稳定证明服务存在。
- 经用户明确要求清理后，在提升权限下核验 PID 13520 的命令行为仓库内 `backend/backend/posts/dist/src/main`，父 cmd PID 为 33092，二者创建时间一致。仅终止该精确父子进程；随后 `netstat -ano` 对 3000/3106/3107/4173/5173 无命中，两个 PID 均不存在，`GET http://localhost:3000/api` 已不可达。
- 最终端口结论以 `netstat -ano` 为准；不再使用受限 `Get-NetTCPConnection` 的空结果作为无残留证据。

### 6.2 授权静态收口

- 首轮发现 `frontend/black_box/src/assets/react.svg` 仍含 `#00D8FF`；全仓引用扫描为 0，确认是未引用 Vite 旧资产。P6 按纪律暂停，取得用户明确授权后仅删除该文件。
- 删除后复扫：HEX 共 56 处且 `App.css` 外为 0；Geist、直接色阶、柔阴影、大圆角、业务渐变、inline style、原生反馈仍全部为 0；暗色仅保留 `@custom-variant dark` 机制 1 处。
- 删除后回归：前端 build 2456 modules；P6 QA 文件 lint 0/0；全量 lint 保持批准基线 3 errors/0 warnings；Playwright 7 files/41 tests 全部通过。

**P6.4 状态：通过。** 未执行 cleanup apply、seed/full、embedding backfill，未修改真实 `yue` 数据。

## 7. P6.5 文档与人工门禁

- 04 第十四章已逐项映射 P0～P6 证据；除“用户最终确认后同步 AGENTS/最终状态”外，其余技术与执行者人工检查项均已勾选。
- 真实实现偏差已回填：后端 e2e mapper、真实 user id 数字契约与旧 persist 归一化、未引用 `react.svg` 删除、差分 lint 口径、隔离生产主链路和 AI 有限失败实测。
- P6 未新增产品功能、路由、接口、schema/migration 或依赖；未修改原型；没有删测试或放宽既有断言。
- 最终人工入口：`docs/qa/phase4/screenshots/comparison.html` 与本报告第 4～6 节。用户确认前不修改 `AGENTS.md`、不把第四期标为“已人工验收通过”、不关闭 planning、不提交 Git。
- 最终评审提出的 Compose 390px 溢出和 3000 服务残留均已按独立证据关闭；当前无已知技术或环境阻塞。

**最终结论：** 用户独立复核 Compose 390px 预览、3000/3106/3107/4173/5173 无监听、PID 13520/33092 不存在、3000 HTTP 不可达及 `git diff --check` 后，明确确认 P6 与第四期整批通过。P6.5 关闭；历史 lint 债保留为独立工程任务，不自动进入第五期，未提交 Git。
