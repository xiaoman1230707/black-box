# O2 调研进度

## 2026-07-17

- 已执行 using-superpowers、planning-with-files 与 session-catchup。
- 已确认当前 Git 仅有既有用户改动 `CLAUDE.md`，本轮不触碰。
- 已建立 O2 独立 planning 目录并切换活动计划。
- 当前进入权威文档、前端、后端与测试基线核对阶段。
- 已核对 00/01～05 与 O1 终态：O2 仅窄范围覆盖 04 的 my-posts/my-likes 后续债，不扩展完整个人中心。
- 已核对 Mine/Router/RequireAuth/PostItem/PageState/InfiniteScroll/BackToTop/types/API/store；确认当前 Mine 无内容入口，O2 可完全复用现有列表组件且无需修改 Home store。
- 已核对 Posts/Users/Prisma：现有接口不足但 schema 与索引足够；设计采用 Posts 模块内两条最小 JWT 只读接口，不新增数据库语义。
- 已实测基线：前端 unit 13/39、后端 Jest 15/64、Playwright 8/46 且全量 46 passed。
- 已确认 Sidebar 不新增全局目的地，Axios 继续统一注入/刷新 JWT，O2 入口只在 Mine 内出现。
- 已创建 `docs/design/06-post-phase4-personal-content.md`，覆盖背景、范围、真实映射、方案取舍、接口、状态、一致性、四视口、文件矩阵、批次、测试与回滚。
- 已完成占位词、范围、历史差异、接口安全、测试时机和文件边界自审；无模糊占位。
- 本轮只修改 O2 设计与 planning 记录；未修改业务代码、测试、依赖、配置、数据库、原型或 AGENTS，未编写实施计划，未提交 Git。
- 当前停在用户设计评审门禁，不直接实施 O2。

## 2026-07-17（实施计划阶段）

- 用户已确认 06 设计，设计状态已改为“已确认，尚未实施”。
- 已再次核对真实测试环境：前端 Vitest 使用 Node/SSR，无 DOM Testing Library；计划采用现有 `renderToStaticMarkup` 与纯状态 helper，不新增测试依赖。
- 已核对后端 controller/service、DTO、Prisma relation、前端 router/Mine/PostItem/PageState/InfiniteScroll、Axios token 注入与 Base UI Button 契约。
- 已创建 `docs/plans/06-post-phase4-personal-content-implementation-plan.md`，按 O2.0～O2.5 拆分五个责任边界和硬检查点。
- 计划明确 `CLAUDE.md` 纳入实施前后 SHA-256 保护，不得编辑、格式化、回滚或覆盖用户现有改动。
- 本轮仅修改设计/计划/planning 文档；未修改业务代码、测试、依赖、配置、数据库、原型或 `AGENTS.md`，未提交 Git。
- 当前停在实施计划评审门禁，未授权执行 O2.0 或产品实施。

## 2026-07-18（O2.0 基线冻结）

- 用户已确认 O2 实施计划，无阻塞项，并仅授权执行 O2.0。
- O2.0 增补实施前截图基线：复用现有 QA 脚本捕获七页四视口 28 张默认态，不修改截图脚本或产品代码。
- 当前开始冻结工作树、工具版本、受保护文件 SHA-256 和自动测试基线；完成后必须暂停，未经确认不进入 O2.1。
- 已冻结 `main@96f9245`、Node 24.18.0、pnpm 11.9.0；O2.0 开始与结束时 3000/5173 均无监听。
- 已生成 65 个受保护文件 SHA-256，包含 `CLAUDE.md`，`.env` 命中为 0。
- 前端实测：Vitest 13/39、build 2455 modules、Playwright 8 files/46 passed；全量 lint 保持历史 3 errors/0 warnings。
- 后端实测：Jest 15 suites/64 passed、build 成功；无写入全量 ESLint 历史基线为 881 errors/7 warnings，未运行 `--fix`。
- 已确认产品源码尚无 O2 两页面或两 API 命中；未发生部分实现或静态路由冲突。
- 已复用现有脚本生成七页四视口 `28/28` 截图；Mine 四视口抽查无整体溢出、遮挡或底栏冲突，且当前确无个人内容入口。
- 沙箱内首次模块读取出现 EPERM/解析失败；相同命令在沙箱外复跑全部成立，未修改源码、依赖、lockfile 或权限。
- O2.0 证据写入 `docs/qa/post-phase4-personal-content/baseline.md`；当前停在用户确认门禁，未进入 O2.1。

## 2026-07-18（O2.1 后端只读能力）

- 用户已确认 O2.0，授权进入 O2.1，边界仅限 Posts 模块两条 JWT 只读接口与共享分页映射。
- 当前按 TDD 先新增 service/controller 测试；controller 使用真实 Nest HTTP 路由锁定静态路由优先级与 JWT 用户边界。
- O2.1 不修改 Prisma、数据、点赞写接口、前端产品文件或既有 Playwright；完成后必须暂停。
- RED 已实测：实现前 service 的 `findMine/findLiked` 不存在；HTTP 请求实际被 `:id` 捕获，8 项失败、2 项既有公共回归通过。
- GREEN 已实测：新增 DTO、共享 `findPostPage`、两 service 方法和位于 `:id` 前的 JWT 静态路由；定向 Jest 2 suites/10 passed。
- REFACTOR 后全量 Jest 为 17 suites/74 passed，Nest build 成功；原 15/64 基线全部保留。
- 新增 DTO/spec 定向 lint 0/0；历史文件同口径差分为 post-query -21、controller 0、service -16，无新增 lint 债。
- 受保护 65 文件再次核对 0 mismatch；Prisma/auth/ai/users、前端产品/e2e、依赖/配置均无 O2 diff。
- O2.1 证据已写入 `docs/qa/post-phase4-personal-content/backend-report.md`，随后已获用户确认并进入 O2.2。

## 2026-07-18（O2.2 前端共享列表）

- 用户已确认 O2.1，授权进入 O2.2；边界仅限前端个人内容 API、共享本地状态列表、两个薄页面与受保护路由。
- 当前按 TDD 先覆盖 API 参数/异常/AbortSignal、分页纯逻辑和 Node/SSR 状态呈现；不新增测试依赖。
- `BackToTop` 已由 `App.tsx` 在 Router 内全局唯一渲染；O2.2 页面继承该实例，不重复挂载第二个按钮。
- O2.2 不修改 Mine、后端、数据库、Home store、PostDetail、既有 Playwright 或 `CLAUDE.md`；完成后必须暂停。
- RED 已实测：API 与共享页面模块不存在，2 个测试文件按预期失败；未出现“先实现后补测试”。
- GREEN 已实现：两个不吞异常的 API helper、共享本地状态容器、published/liked 薄页面及两条 `RequireAuth` 路由。
- 分页状态已复核：按 id 保留首次顺序去重；busy 阻止重复请求；request id + AbortController 拒绝卸载后的过期响应；翻页错误保留列表并关闭自动观察，只允许局部 retry。
- 定向 Vitest 为 2 files / 11 passed；前端全量 unit 为 15 files / 50 passed；生产 build 成功（2460 modules）。
- O2.2 定向 lint 0/0；全量 lint 保持批准的历史 3 errors/0 warnings，仅位于 `ui/badge.tsx` 与 `utils/index.ts`。
- Playwright 列表仍为 8 files / 46 tests，全量 46 passed；未修改或新增既有 e2e。
- 受保护 65 文件 SHA-256 再核对为 0 mismatch；3000/5173 无监听；`git diff --check` 无补丁错误，仅既有换行提示。
- 沙箱内 pnpm/node_modules 读取再次出现 EPERM；在正常权限下执行测试与构建后成立，未修改依赖、lockfile 或权限。异常透传测试最初因 `beforeEach` 隐式返回 mock 被 Vitest 当清理函数调用而产生伪失败，改为无返回 hook 后验证通过。
- O2.2 证据写入 `docs/qa/post-phase4-personal-content/frontend-report.md`，随后已获用户确认并进入 O2.3。

## 2026-07-18（O2.3 Mine 入口）

- 用户已确认 O2.2，授权进入 O2.3；边界仅限 `Mine.tsx` 两个语义入口及聚焦单测。
- 入口固定为 `/mine/posts` 与 `/mine/likes`，不请求列表、不展示数量、不增加 Sidebar 或其他全局导航。
- 当前按 TDD 先锁定链接、文案、零预取及原头像/上传/退出锚点；实现不改头像 Drawer→关闭→Loading→反馈时序或 logout handler。
- O2.3 不修改后端、数据库、共享列表、既有 e2e 或 `CLAUDE.md`；完成后必须暂停。
- RED 已实测：3 条 Mine 聚焦测试中仅入口测试因 `mine-posts-link` 缺失失败；账户摘要、头像上传和退出锚点在实现前已通过。
- GREEN 已实现：账户卡片与退出按钮之间新增“个人内容”section，两条 Base UI Button + React Router Link 分别指向 `/mine/posts`、`/mine/likes`；不展示数量、不预取列表。
- 首轮 Playwright 虽为 46 passed，但日志发现 Base UI 报告 Link 被按原生 button 校验；根因是 `render={<Link />}` 未声明 `nativeButton={false}`。补齐真实 API 后复跑，控制台错误消失。
- Mine diff 仅增加 Link/icon import 与 49 行入口 section；`handleAvatarUpload`、Drawer open、关闭后 Loading、成功/失败反馈和 logout handler 无改动。
- 定向 Mine Vitest 为 1 file / 3 passed；前端全量 unit 为 16 files / 53 passed；定向 lint 0/0；build 成功（2460 modules）。
- 全量 lint 保持批准的历史 3 errors/0 warnings；Playwright 仍为 8 files / 46 passed 且未修改 e2e。
- 受保护 65 文件 SHA-256 为 0 mismatch；3000/5173 无监听；`git diff --check` 无补丁错误，仅既有换行提示。
- O2.3 证据已补入 `docs/qa/post-phase4-personal-content/frontend-report.md`，随后已获用户确认并进入 O2.4。

## 2026-07-18（O2.4 完整回归与人工验收准备）

- 用户已确认 O2.3，授权进入 O2.4；本阶段只执行回归、稳定 mock 截图、真实串验、SHA-256 复核与文档收口。
- 默认截图固定为 Mine/MyPosts/MyLikes 三页 × 1440/900/390/320 共 12 张，另捕获 MyPosts empty、MyLikes 首屏 error、MyLikes loaded+load-more-error 3 张专项态。
- 真实串验原则上只读；仅允许在既有详情页取消一次点赞，以验证返回收藏页后权威数据消失。
- O2.4 不新增或修改 Playwright，不改产品功能，不提交 Git，不进入 O2.5；最终状态只能写“已实施，待人工验收”。
- 自动矩阵完成：后端 17 suites / 74 passed、build 成功；前端 16 files / 53 passed、build 成功、O2 定向 lint 0/0、全量保持历史 3/0；Playwright 8 files / 46 passed，既有 e2e 零修改。
- 稳定截图完成：Mine/MyPosts/MyLikes 四视口默认态 12 张，390px empty/error/load-more-error 3 张；15 个状态均无页面横向溢出，人工抽查无双滚动或移动底栏遮挡。
- 真实串验完成：匿名 API 401、RequireAuth 导向 Login、userId query 不改变 JWT 边界、Mine 两入口/Drawer 取消/详情返回重取/退出均正常；limit=5 的 mine/liked 两页均非空且 id 唯一。
- 依授权只取消一次既有点赞：帖子 117 从收藏中移除，权威 total 9→8；未执行其他真实写入。
- 受保护文件 65 项前后 SHA-256 为 0 mismatch，包含 `CLAUDE.md`；证据见 `docs/qa/post-phase4-personal-content/implementation-report.md`。
- O2.4 当时状态为“已实施，待用户人工验收”；该门禁随后已由用户明确确认通过。

## 2026-07-18（O2.5 验收后 Playwright 与文档关闭）

- 用户已明确确认 O2.4 人工验收通过，授权进入 O2.5。
- O2.5 只新增 `e2e/personal-content.spec.ts` 五条稳定行为用例，不修改或弱化既有 46 条，不写 CSS、DOM 层级或像素断言。
- 终态目标固定为 9 files / 51 passed；随后回填 foundation、06 设计、QA 与 planning，保持 65 个受保护文件（含 `CLAUDE.md`）哈希不变。
- 本阶段不修改产品功能、数据库、依赖或配置，不提交 Git，不自动进入第五期。
- 已新增 `e2e/personal-content.spec.ts` 五条稳定行为用例，断言仅使用 URL、query、testid、可见文本与请求方法；未修改既有 e2e。
- 新增文件定向 Playwright 为 5 passed，定向 lint 0/0；全量列表为 9 files / 51 tests，全量 51 passed。
- 最终自动矩阵完成：前端 16 files / 53 unit、build 2460 modules、全量 lint 保持历史 3/0；后端 17 suites / 74 Jest、build 成功。
- 已回填 `00-foundation.md` 的两条二级受保护路由与共享个人列表事实；06 设计、实施计划和 QA 已标记 O2 实现、人工验收及 9/51 终态。
- 最终受保护文件复核为 65 项 / 0 mismatch，包含 `CLAUDE.md`；O2 已关闭，未提交 Git，未自动进入第五期。
