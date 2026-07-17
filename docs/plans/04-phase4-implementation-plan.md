# Black-box 第四期实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 `subagent-driven-development`（推荐）或 `executing-plans` 逐任务实施；每个任务按 checkbox 更新，批次人工验收门禁不得跳过。

**目标：** 在不改变前三期业务语义的前提下，将已确认的第四期视觉系统与工程收尾设计分成可独立实施、验证、评审和回滚的 P0～P6 任务。

**架构：** P0 先冻结脏工作树、41 条行为测试和 7 页四视口视觉基线；P1～P4 依次迁移 token/基础组件、App Shell/共享组件、7 个页面和横切反馈/Markdown 能力；P5 独立收口运行配置、安全与演示数据；P6 执行自动化、静态、截图和人工串验并回填真实实现。设计事实仍由 `docs/design/04-phase4-visual-polish.md` 负责，本文件只锁定施工顺序、文件职责和验证门禁。

**技术栈：** React 19、Vite 8、TypeScript 5.9、Tailwind CSS v4、shadcn/base-ui、Zustand 5、Playwright 1.61、NestJS 11、Prisma 6、Jest 30、PostgreSQL、LangChain/DeepSeek。

## Global Constraints

- 只迁移 `Home`、`Search`、`PostDetail`、`Compose`、`Chat`、`Mine`、`Login`。
- 不新增 profile/edit-profile/my-posts/my-likes 路由、接口或能力。
- 不实现浏览量自增；只展示现有 `viewCount`。
- 不增加 `Comment.createdAt`，不创建 schema 变更或 migration，不展示伪评论时间。
- 不新增游戏专区/详情、多会话 AI、预设头像、正文 embedding、改帖或暗色入口。
- 保持现有路由、接口字段、JWT、`0:/8:/d:` SSE、Zustand 主数据流、App Shell 248px/80px/移动底 tab 三断点和前三期业务语义。
- Search 只允许增加不持久化的 UI `error` 元数据；不得重写 store 或改变请求、防抖、历史、排序和结果语义。
- Topbar `q` 修正只读取 URL 参数并复用现有 `search()`；不扩展 API。
- Markdown 固定使用 `react-markdown`、`remark-gfm`、`remark-breaks`、`rehype-sanitize`；不启用 raw HTML，不使用 `dangerouslySetInnerHTML`。
- 所有选中、展开、激活状态统一使用 `data-state`；页面不得形成第二套私有 token 或组件体系。
- 保留现有 `data-testid`、可访问名称和 test role；视觉迁移不得用 CSS 类或 DOM 层级替代行为锚点。
- 不 reset、checkout、clean、stash、覆盖或回滚工作树中前三期未提交修改；每次审查只比较并暂存本任务明确列出的文件。
- `docs/prototype/` 全程只读；不复制 `app.js` 的假交互、假数据、inline style 或未实现页面能力。
- 新增功能 e2e 必须等待用户人工验收通过；纯视觉不写 CSS、DOM 或像素行为断言。
- 任何扩大范围、改变业务语义或需要 schema/migration 的发现，先停工并更新设计，经用户确认后才继续。

## 计划使用约定

### 路径与命令

- 仓库根：`C:\Users\15593\Desktop\project\Black-box`。
- 前端命令目录：`frontend/black_box/`；后端命令目录：`backend/backend/posts/`。
- 前端既有命令：`pnpm build`、`pnpm lint`、`pnpm e2e`、`pnpm exec playwright test --list`。
- 后端既有命令：`pnpm build`、`pnpm lint`、`pnpm test`、`pnpm test:e2e`。
- Windows 文本检索使用 `rg`；不得用 shell 通配符直接表示 `.planning/**/*.md`，应传目录或显式文件。

### TDD 与门禁

1. 行为或纯逻辑变更先建立失败证据；后端纯逻辑优先使用现有 Jest，不引入新测试框架。
2. 纯视觉变更以 build、组件展示面、四视口截图和人工验收为证据，不为 CSS 写行为测试。
3. 页面或工程功能人工验收通过后，才允许补稳定的 Playwright/后端 e2e；现有 41 条始终先保留。
4. 每批结束先更新本计划 checkbox、`docs/qa/phase4/` 证据和 04 设计实现状态，再申请下一批方案确认。

### 任务数量

| 批次 | 任务数 | 输出 |
|---|---:|---|
| P0 | 5 | 范围、Git/测试、静态残留与 28 张视觉基线 |
| P1 | 5 | token、Inter、11 个基础组件契约与组件展示面 |
| P2 | 5 | App Shell、SearchBar、帖子卡、轮播和全局辅助组件 |
| P3 | 7 | 7 个现有页面按固定顺序一次性迁移 |
| P4 | 5 | Toaster/Dialog/PageState、Markdown 和 XSS 闭环 |
| P5 | 8 | URL、CORS、限流、强密钥、清理、seed 与运维文档 |
| P6 | 5 | 自动化回归、串验、截图审查、静态/安全审计、交付门禁 |

### 主要文件职责矩阵

| 文件/目录 | 动作 | 批次 | 单一职责 |
|---|---|---|---|
| `docs/qa/phase4/`、`frontend/black_box/scripts/capture-phase4-screenshots.mjs` | Create | P0/P6 | 行为、静态、截图和最终回归证据；不进入产品路由 |
| `frontend/black_box/src/App.css`、前端 package/lock | Modify | P1/P4/P5 | token/Inter 与经确认的新依赖；每批 lock diff 独立审查 |
| `frontend/black_box/src/dev/phase4-component-gallery.tsx`、`.tmp/phase4-components.html` | Create | P1 | dev-only 组件契约展示；临时 HTML 不提交、不挂产品路由 |
| `frontend/black_box/src/components/ui/{button,input,textarea,avatar,card,carousel}.tsx` | Modify | P1 | 既有基础组件统一契约 |
| `frontend/black_box/src/components/ui/{button-variants,carousel-context}.ts` | Create | P1 | 隔离 cva 与 Carousel context/hook，保留兼容导出并满足 Fast Refresh lint |
| `frontend/black_box/src/components/ui/{select,pill,tag-chip,stat-button,count-badge}.tsx` | Create | P1 | 新增基础组件；页面不得复制其样式 |
| `frontend/black_box/src/components/{SearchBar,Sidebar,Topbar,PostItem,SildeShow,...}.tsx` | Create/Modify | P2 | App Shell 和跨页共享组合 |
| `frontend/black_box/src/pages/{Home,Search,Compose,Chat,Mine,Login}.tsx`、`pages/post/index.tsx` | Modify | P3/P4 | 七页一次迁移；P4 只填预留反馈/Markdown 槽 |
| `frontend/black_box/src/store/search.ts` | Modify | P3 | 仅增加不持久化 UI error 元数据 |
| `frontend/black_box/src/components/{PageState,MarkdownRenderer}.tsx`、`src/lib/{markdown,api-error}.ts` | Create | P4 | 统一状态、错误文案和安全 Markdown |
| `frontend/black_box/src/config/{runtime,runtime-value}.ts`、`frontend/black_box/.env.example` | Create | P5.1 | 前端 API 根地址单一来源与可复用的纯校验逻辑 |
| `frontend/black_box/playwright.config.ts` | Modify | P5.1 | 仅为 Playwright webServer 注入固定测试 API URL，不建立生产回退 |
| `frontend/black_box/vite.config.ts` | Modify | P5.1 | dev/build 启动前校验必填 API URL，避免只在浏览器运行时失败 |
| `backend/backend/posts/src/config/{load-env,env,public-url}.ts` | Create | P5.2/P5.3 | dotenv 单一加载入口、启动环境校验和公开媒体 URL 构造 |
| `backend/backend/posts/src/security/` | Create | P5.5 | Throttler 配置、显式 user-or-IP 身份元数据、tracker 与 429 口径 |
| `posts/auth/comments/ai/upload` 相关后端 service/controller | Modify | P5.3～P5.5 | URL 消费与敏感接口限流；成功结构不改 |
| `frontend/black_box/src/hooks/useChatBot.ts` | Modify | P5.1/P5.5 | 统一 Chat URL，并通过 AI SDK 现有 `onResponse` 接缝映射 429；JWT/SSE/store 不改 |
| `backend/backend/posts/src/maintenance/`、`src/scripts/cleanup-uploads.ts` | Create | P5.6 | dry-run 默认的安全文件清理 |
| `src/scripts/{demo-seed-manifest,seed-demo-posts}.ts`、fixtures | Create/Modify | P5.7 | 35 帖 manifest、幂等数据和确定性图片 |
| `docs/operations/`、前后端 `.env.example` | Create/Modify | P5.8 | 部署、备份、清理、seed 与环境变量口径 |

---

## P0：范围冻结与行为/视觉基线（5 tasks）

**目标：** 在任何业务或视觉文件变化前，留下可复现的工作树、测试、页面和残留证据，使 P1～P6 的每个差异可归因。

**非目标：** 不改业务代码、运行配置、依赖、数据库、测试断言或原型；除 `visual:capture` 这一 QA 命令外不改 package scripts；不清理用户改动；不修 Topbar `q`。

**前置依赖：** `docs/design/04-phase4-visual-polish.md` 已确认；根 `AGENTS.md` 已进入四期实施计划阶段。

**Create：**
- `docs/qa/phase4/p0-baseline.md`：Git、工具链、命令、路由和 41 条行为基线。
- `docs/qa/phase4/static-audit.md`：旧视觉与工程残留分类清单。
- `docs/qa/phase4/screenshot-manifest.json`：7 页、4 视口、状态与输出文件映射。
- `frontend/black_box/scripts/capture-phase4-screenshots.mjs`：Playwright API 截图脚本，不进入 `e2e/` 测试发现范围。
- `docs/qa/phase4/screenshots/p0/{1440x1000,900x1000,390x844,320x740}/`：28 张默认态基线。

**Modify：**
- `frontend/black_box/package.json`：仅在 P0 实施时增加 `visual:capture` QA 命令；不改运行依赖。
- `docs/plans/04-phase4-implementation-plan.md`：更新 P0 checkbox 和实测偏差。

**Verify/Test：** `git status --short`、`git diff --stat`、Playwright `--list` 与全量 41 条、截图清单完整性、静态 `rg` 清单。

### Task P0.1：冻结范围和脏工作树证据

- [x] 在 `p0-baseline.md` 记录 `git rev-parse HEAD`、当前分支、`git status --short`、`git diff --stat`、Node/pnpm 版本；不得记录 `.env` 值。
- [x] 将前三期未提交文件分成“历史业务改动”“生成/结果目录”“本期将触碰文件”三类，只记录不删除。
- [x] 抄录 Global Constraints、7 个页面、P0～P6 顺序和禁止 Git 操作，登记 Topbar `/search?q=` 未被 Search 消费的既存缺口。

**验证：** `git status --short` 与文档文件列表逐项一致；再次运行不得改变工作树。  
**完成条件：** 审查者能区分第四期修改与此前 3 期脏 diff。  
**风险/回滚：** 只写 QA 文档；误录 secret 时删除该段并检查 Git diff，绝不提交 secret。

### Task P0.2：锁定测试和构建基线

- [x] 在前端运行 `pnpm exec playwright test --list`，确认 `Total: 41 tests in 7 files`，把 7 个 spec 名写入基线。
- [x] **明确建议并执行完整 41 条：** 运行 `pnpm e2e`。理由是当前工作树已有大量功能改动，若 P1 前不证明 41 条通过，第四期失败无法归因；这些用例由 Vite + route mock 运行，不依赖真实后端/数据库。
- [x] 记录 `pnpm build`、`pnpm lint`、后端 `pnpm build/test/test:e2e` 的可用命令；P0 只要求前端 41 条行为基线通过，构建/lint 的现状结果如实记录，失败不得在 P0 修代码。

**预期：** 列表仍为 41/7；`pnpm e2e` 41 passed。若基线失败，P0 标阻塞并先向用户报告，不把失败带入 P1。  
**人工验收：** 核对测试未使用 CSS 类、DOM 层级或像素作为断言。  
**风险/回滚：** 测试只读；清理由 Playwright 生成的临时结果仅能删除本次新产物，不能动既有未跟踪结果。

### Task P0.3：建立四视口截图工具和 28 张默认基线

- [x] `screenshot-manifest.json` 固定视口 `1440x1000`、`900x1000`、`390x844`、`320x740`，页面键固定为 `home/search/post-detail/compose/chat/mine/login`。
- [x] 截图脚本复用 Playwright 依赖，接受 `--stage=p0|current`、`--base-url=http://localhost:5173`；对需要登录的页面注入与现有 e2e 同结构的 `user-store`，使用 route mock 固定帖子、游戏、标签、评论和 chat 完成态，不调用真实 AI。
- [x] 每张截图等待页面稳定 testid/可访问名称，不使用固定 sleep；动态轮播停在第一帧，动画与 reduced-motion 固定，输出路径由 manifest 决定。
- [x] `/post/:id` 使用固定 mock id；Login 使用匿名 context；其余受保护页使用独立已登录 context，避免 store 污染。

**验证命令：** `pnpm visual:capture -- --stage=p0`；脚本应输出 28/28，缺页或重复文件返回非零。  
**人工验收：** 每档抽查 7 页均为真实 React 页面，1440 有 248px sidebar、900 有 80px rail、390/320 有底 tab，Login 不套 App Shell。  
**风险/回滚：** 截图 harness 不进入产品路由、不改测试基线；仅删除本任务新增脚本/截图即可回滚。

### Task P0.4：建立静态残留台账

- [x] 在 `static-audit.md` 保存以下分类及命中路径：Geist/旧 `.dark` token、直接色阶/HEX/oklch、`rounded-xl/2xl/3xl`、柔阴影、页面渐变、inline `style`、`window.confirm/alert`、`localhost`、`.active/.liked` 类状态、页面私有搜索/按钮/卡片。
- [x] 使用可复跑命令并写明最终允许项：HEX/gradient 只允许在 `App.css` token 定义；`rounded-full` 只允许 pill/avatar；`localhost` 不得出现在 service/controller/api/hook/page 等业务模块，最终只允许后端 `src/config/env.ts` 的 development fallback、`playwright.config.ts` 的测试 webServer 默认及 `.env.example`/文档示例。
- [x] 对 `PostItem` 图片 `onError` 的 inline style、PostDetail `window.confirm`、Home/Login/Mine 的直接色阶、前后端 localhost 分别登记目标批次 P2/P4/P3/P5。

**验证：** 清单每条都有“当前命中数、目标批次、P6 允许/零残留口径”；不在 P0 改命中源文件。  
**完成条件：** P6 可用相同命令复跑并比较，而不是凭印象找残留。

### Task P0.5：P0 审查门禁

- [x] 核对基线文档、41 条结果、28 张截图和静态清单均可复现；记录任何环境差异。
- [x] 用户人工确认 P0 后才标完成并进入 P1；P0 不新增行为 e2e。

**P0 实测状态（2026-07-14）：** 技术证据已完成，Playwright 41/41、截图 28/28；受保护业务树前后 SHA-256 一致。用户已人工确认 P0，允许进入 P1 方案检查点；P1 尚未实施。

**文档回填：** `docs/design/04-phase4-visual-polish.md` 第十一/十二章仅添加 P0 实测状态，不改变设计。  
**建议 commit 边界：** 只暂存 P0 QA 文档、截图脚本、package 脚本和计划回填；建议 `chore(phase4): freeze behavior and visual baselines`。不得使用 `git add .`。  
**批次完成条件：** P0 所有证据获人工确认，业务代码 diff 与 P0 开始时一致。

---

## P1：Tailwind token、Inter 与基础组件（5 tasks）

**目标：** 把 foundation/system.css 的视觉值落入单一 Tailwind v4 token 系统，并建立页面可消费的基础组件契约。

**非目标：** 不迁移页面信息结构，不改路由/store/API，不新增产品页面，不开放暗色入口。

**前置依赖：** P0 通过；已保存截图和静态台账。

**P1 lint 差分门禁（2026-07-14 拍板）：** P1 范围内所有新增或修改的 TS/TSX 必须达到 0 errors / 0 warnings。施工前全量 `pnpm lint` 基线为 16 errors / 3 warnings，其中 P1 将修改的 `ui/button.tsx`、`ui/carousel.tsx` 各有 1 个 `react-refresh/only-export-components` error，须随组件改造消除；因此 P1 完成后的全量结果不得高于 14 errors / 3 warnings，且剩余命中只能来自已登记的范围外 e2e/API/pages/utils/badge。全仓 lint 债务另立工程清理任务，不在 P1 顺手修改。

**Create：**
- `frontend/black_box/src/components/ui/button-variants.ts`
- `frontend/black_box/src/components/ui/carousel-context.ts`
- `frontend/black_box/src/components/ui/select.tsx`
- `frontend/black_box/src/components/ui/pill.tsx`
- `frontend/black_box/src/components/ui/tag-chip.tsx`
- `frontend/black_box/src/components/ui/stat-button.tsx`
- `frontend/black_box/src/components/ui/count-badge.tsx`
- `frontend/black_box/src/lib/content-type.ts`
- `frontend/black_box/src/dev/phase4-component-gallery.tsx`：仅供 Vite dev 的组件矩阵，不挂产品路由。
- `frontend/black_box/.tmp/phase4-components.html`：由 P1 本地生成的 Vite 临时入口；仓库根 `.gitignore` 已忽略 `.tmp/`，不得提交。

**Modify：**
- `frontend/black_box/package.json`、`pnpm-lock.yaml`
- `frontend/black_box/src/App.css`
- `frontend/black_box/src/components/ui/button.tsx`
- `frontend/black_box/src/components/ui/input.tsx`
- `frontend/black_box/src/components/ui/textarea.tsx`
- `frontend/black_box/src/components/ui/avatar.tsx`
- `frontend/black_box/src/components/ui/card.tsx`
- `frontend/black_box/src/components/ui/carousel.tsx`

**核心契约：**

```ts
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ControlSize = 'sm' | 'default' | 'lg' | 'icon';
type ContentTypeVariant =
  | 'news'
  | 'guide'
  | 'help'
  | 'review'
  | 'event';
type PillVariant = 'accent' | 'warm' | 'soft' | ContentTypeVariant;
type TagChipVariant = PillVariant;
type CardVariant = 'panel' | 'tile';
type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarCover = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
```

兼容契约：Button 继续接受 `variant="default"`，其视觉固定映射为 `outline`；保留现有 `xs`、`icon-xs`、`icon-sm`、`icon-lg` size alias 和 Base UI `render`，不新增 `asChild`。Avatar 保留 `size="default"` alias。Card 保留旧 `size="default|sm"`，新增契约以 `variant="panel|tile"`、`padding="none|sm|default"` 为准。

### Task P1.1：接入 Inter 与 Tailwind v4 token

- [x] 先将 `@fontsource-variable/geist` 替换为 `@fontsource-variable/inter`，只修改前端 package/lock；`App.css` 从本地包加载 Inter，不使用 CDN。
- [x] 按 foundation §2 将颜色、半径、字体、字号、行高、间距、硬阴影、focus、motion、内容类型色和 8 个 cover gradient 写入 `@theme inline`/`:root`；页面只能消费语义 token。
- [x] 保留 `@custom-variant dark` 机制，删除旧 `.dark` oklch 值块；不增加切换入口，`.dark` 在本期不形成可用主题。
- [x] 增加 `prefers-reduced-motion` 全局规则：取消位移/长过渡，保留必要状态变化。

**验证：** `pnpm build`、`pnpm lint`；`rg '@fontsource-variable/geist|Geist Variable|^\.dark' src package.json` 无旧字体/旧暗色值。  
**人工验收：** body 为 Inter；奶黄背景、墨色文字、橙主色、2px 墨边和硬阴影与 `system.css` 一致。  
**回滚：** token/font 作为一个文件组回滚，不回滚前三期页面文件。

### Task P1.2：表单与命令组件

- [x] 改造 `Button` variant/size，墨边、硬阴影、hover 抬升、active 下沉、focus-visible、disabled 均由组件统一；现有未显式 variant 的调用在 P3 迁移时逐个指定语义。将 `buttonVariants` 移入非组件模块或改为不触发 Fast Refresh 的兼容导出结构，清除该 P1 文件的既有 lint error。
- [x] 改造 `Input`/`Textarea` 为 2px input 边、shadow-sm、focus 主色阴影；`aria-invalid` 或 `data-state="invalid"` 映射 destructive。
- [x] 基于现有 `@base-ui/react/select` 新建 `Select`，导出 Root/Trigger/Value/Content/Item 等组合，Trigger 高度与 Input 一致，选中项使用 `data-state`，键盘/Esc/portal 行为沿 primitive。

**验证：** `pnpm build && pnpm lint`；键盘 Tab/Enter/Arrow/Esc、disabled、invalid、长选项和 320px 宽度人工检查。  
**禁止触碰：** Compose 的游戏 state 和提交 payload 在 P1 不接线。

### Task P1.3：展示型组件与共享映射

- [x] `content-type.ts` 固定 资讯/攻略/求助/评测/活动到五个 `ContentTypeVariant` 的映射，未知类型回退 `PillVariant` 中的 `soft`，避免页面重复 switch；`TagChipVariant` 与 `PillVariant` 共用同一类型域，不得另起冲突枚举。
- [x] `Avatar` 尺寸改为 28/44/72，增加 `cv` 静态映射，保持 Image/Fallback/Group 现有导出和首字母 fallback。
- [x] `Card` 增加 `variant="panel|tile"`、`padding="none|sm|default"`，保留 Header/Content/Footer 等 slot 及旧 `size` 兼容 alias；不制造嵌套卡规则。
- [x] 新建纯展示 `Pill` 和 `CountBadge`；`CountBadge` 统一 `999`、`1.0k` 等格式，使用 tabular nums。

**验证：** build/lint；未知 tag、空 avatar、999/1000/10500、长用户名在 gallery 中不溢出。  
**回滚：** 保持现有导出兼容，新增 props 可逐组件撤销。

### Task P1.4：筛选与统计组件

- [x] 新建 `TagChip({ value, active, variant, onSelect, disabled })`，用 `data-state="active|inactive"` 驱动，组件不内置 tag/game store。
- [x] 新建 `StatButton({ variant, count, active, busy, disabled, onClick })`；like 使用 `data-state="liked|idle"`，view 默认非交互，计数复用 CountBadge。
- [x] icon 只用 lucide，icon-only 路径必须有 `aria-label`/title；busy 时稳定尺寸且不可重复提交。

**验证：** build/lint；键盘触发、busy/disabled、like/view 语义和 44px 移动命中区人工检查。  
**禁止触碰：** 不在 P1 改 `useHomeStore`、点赞请求或 viewCount。

### Task P1.5：Carousel、组件展示面与 P1 门禁

- [x] 改造底层 `ui/carousel.tsx` 的控制按钮、focus 和 reduced-motion，保留 Embla API、orientation、plugin 和可访问文本；将 `useCarousel` 移入独立模块或调整导出边界，清除该 P1 文件的既有 Fast Refresh lint error。
- [x] dev-only gallery 覆盖所有 variant/size/state；`phase4-component-gallery.tsx` 自行 mount 到 `.tmp/phase4-components.html`，通过 `http://localhost:5173/.tmp/phase4-components.html` 加载，不注册 React Router 路由，生产 `index.html` 不引用。
- [x] 在 1440/900/390/320 查看 gallery，记录到 `docs/qa/phase4/p1-components.md`；P1 不新增视觉 e2e。
- [x] 运行 `pnpm build`、P1 文件定向 lint 和全量 `pnpm lint`，并运行现有 `pnpm e2e` 防止基础组件破坏 41 条行为；定向 lint 必须 0/0，全量不得高于 14 errors / 3 warnings且不得出现未登记文件。

**文档回填：** 04 §4/§5 写入实际 token 名、组件 props 和任何兼容 alias。  
**建议 commit 边界：** `feat(ui): establish phase four tokens and primitives`；只暂存 P1 package/lock、App.css、ui/lib/dev gallery、QA/设计回填。  
**批次完成条件：** token 单一来源、11 个组件契约可编译且 gallery 人工通过、41 条无回归。

**P1 实测状态（2026-07-15，已人工确认通过）：** P1.1～P1.5 技术门禁已完成；生产 build 通过，P1 TS/TSX 定向 lint 为 0 errors / 0 warnings，全量 lint 为已登记的 14 errors / 3 warnings，既有 7 个 spec、41 条 Playwright 全通过。人工门禁指出 gallery 小屏 slide 被 `aspect + min-height` 撑宽后，已改为移动端固定高度、`sm` 起恢复宽高比；390/320 的 slide 宽度现与 viewport 严格一致且标题居中。未注册产品路由、未新增 e2e；用户已确认 P1 通过，允许进入 P2 方案阶段。

---

## P2：App Shell 与全局复用组件（5 tasks）

**目标：** 在 P1 组件之上迁移全局壳、搜索入口、帖子卡、轮播和辅助状态组件，为 7 页提供唯一组合体系。

**非目标：** 不改路由表、RequireAuth、Home/store 筛选、Search API、Chat SSE 或页面业务流程。

**前置依赖：** P1 人工验收通过。

**全局约束：** 不迁移七个页面、不改 Header/原型/既有 e2e、不新增 e2e、不安装依赖或改 package/lock、不提交 Git。图片失败只用 React state + 既有 token fallback；选中/active 只用 `data-state`；保留现有 testid、默认导出和调用 props。

**方案状态（2026-07-15）：** P2.1～P2.5 已实施并经用户人工复验通过；允许进入 P3 施工方案阶段。

**Create：**
- `frontend/black_box/src/components/SearchBar.tsx`
- `docs/qa/phase4/p2-shell-components.md`

**Modify：**
- `frontend/black_box/src/App.css`：仅补 foundation 已定义的 `--sidebar-w` 响应值与 `--bottombar-h`，复用既有 container gutter/max token。
- `frontend/black_box/src/layouts/MainLayout.tsx`
- `frontend/black_box/src/components/Sidebar.tsx`
- `frontend/black_box/src/components/Topbar.tsx`
- `frontend/black_box/src/components/PostItem.tsx`
- `frontend/black_box/src/components/SildeShow.tsx`
- `frontend/black_box/src/components/BackToTop.tsx`
- `frontend/black_box/src/components/ErrorBoundary.tsx`
- `frontend/black_box/src/components/Loading/index.tsx`
- `frontend/black_box/src/components/InfiniteScroll.tsx`

**Delete（先确认唯一引用已移除）：**
- `frontend/black_box/src/components/Loading/loading.module.css`

**只读依赖，不修改：** P1 的 Button/Card/Pill/Avatar/StatButton/CountBadge/Carousel 与内容类型映射；`router/index.tsx`、各页面、store、API、`Header.tsx` 和既有 e2e。`Header.tsx` 仍被 Chat 使用，不属于可清理文件。

**SearchBar 契约：**

```ts
interface SearchBarProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  loading?: boolean;
  showKbd?: boolean;
  className?: string;
}
```

SearchBar 只管输入/提交/清除/状态；Topbar 负责导航，Search 页负责调用 store，Home 负责导航。

受控模式以 `value` 为准，非受控模式只用 `defaultValue` 初始化本地值；输入变化统一调用 `onValueChange`。提交值先 trim，清除同时更新当前值并调用 `onClear`，组件不读取 URL、不调用 API。Topbar 对非空值只做一次 `encodeURIComponent` 并导航 `/search?q=`，空值导航 `/search`；Search 消费 `q` 明确保留到 P3。

**P2 lint 差分门禁：** 上述现有 P2 TS/TSX 在施工前定向 lint 为 0 errors / 0 warnings；P2 新增/修改 TS/TSX 完成后仍必须 0/0。全量 `pnpm lint` 不得高于 P1 已批准的 14 errors / 3 warnings，且剩余命中仍只能来自登记的范围外 e2e/API/pages/utils/badge；不得借 P2 清债。

### Task P2.1：MainLayout 与 Sidebar 三态迁移

- [x] 在 `App.css` 补齐 foundation 既有布局 token：`--sidebar-w` 默认 248px、`max-width:1024px` 改为 80px，`--bottombar-h:72px`；不复制颜色、阴影或 gutter 数值。
- [x] 保持 `data-testid="app-shell"` 与 `Sidebar + main(Topbar + Outlet)` DOM 顺序；外层使用 foundation grid/sticky 契约，main 保持 `min-width:0`，内容区只消费 `--container-max` 与三档 gutter。
- [x] Sidebar 保留首页 `/`、攻略助手 `/chat`、发帖 `/compose`、我的 `/mine` 四项和同一 `NavLink` 逻辑；品牌、用户 store 与首字母 fallback 不变，头像改用 P1 Avatar。
- [x] 断点精确为 `min-width:1025px` 展开 248px、761～1024px 为 80px rail、`max-width:760px` 为 72px fixed 底 tab；移动总高度和 main bottom padding 同步叠加 `env(safe-area-inset-bottom)`，不新建 BottomNav。
- [x] active 只由 `data-state=active|inactive` 驱动；rail 隐藏文字/meta 后保留 title，底 tab 四项均分，长用户名只在展开档截断且不挤压导航。

**验证：** build/P2 定向 lint；现有 `auth-guard.spec.ts`；1440 实测 248px、900 实测 80px、390/320 实测 72px + safe-area，Topbar/首行/BackToTop 不被遮挡。  
**回滚：** 只回滚 MainLayout/Sidebar 视觉，路由配置不在提交中。

### Task P2.2：SearchBar 与 Topbar 接线

- [x] 按上述契约新建 SearchBar，组合 P1 Input/Button 与 lucide Search/X；输入、清除、提交按钮尺寸稳定，loading 只禁用重复提交，不内置导航、store 或 API。
- [x] Topbar 使用 token 化半透明表面与 backdrop blur；SearchBar 清除按钮实际命中区至少 44×44px，不能以缩小的 icon size 代替移动交互目标。
- [x] `showKbd` 桌面显示 Enter 提示，`max-width:600px` 隐藏但不改变输入可用宽度；容器 `min-width:0`，超长关键词不推出 Topbar。
- [x] Topbar 删除私有 input，复用 SearchBar；只保留本地关键词和导航职责，提交非空值生成一次正确编码的 `/search?q=<encoded>`，空值导航 `/search`。
- [x] 此任务只保证 URL 写入；Search 消费 `q` 留在 P3 Search，避免跨页业务提前改动。

**验证：** 回车/按钮对中文、前后空格、`& ? # %` 均生成正确 URL；清除后提交进入 `/search`。匿名仍由既有守卫进入 Login，登录态停在 Search；本批不断言搜索请求。  
**保留：** sticky topbar、z-index 不盖 portal，路由表不变。

### Task P2.3：PostItem 成为唯一 PostCard

- [x] 保留默认导出、`PostItemProps { post, className }`、外层 article、`post-item` testid 与整卡 `navigate('/post/:id')`；不增加搜索专用卡或页面 variant。
- [x] 外层 article 同时具备可聚焦 link 语义、可见 focus ring 与 Enter 键触发；保留既有整卡跳转，不改变路由或统计交互。
- [x] 以 P1 Card `tile/none` 作为唯一表面，Pill + `getContentTypeVariant` 呈现最多 3 个真实 tag（未知回退 soft），Avatar 呈现真实图片/首字母，StatButton 呈现 like/comment/view；CountBadge 只经 StatButton 统一格式化，不在 PostItem 重写 k 逻辑。
- [x] PostItem 当前没有点赞/评论操作，因此三项 StatButton 均保持展示态，不新增 handler；若卡内存在真实可交互元素，必须阻止冒泡，不能形成嵌套 button/link 冲突。
- [x] `viewCount`、`totalLikes`、`totalComments` 只读取真实字段并以 0 兜底；整卡点击仍去详情，浏览量不自增。
- [x] thumbnail 存在且加载成功时优先显示；无图/失败时由 React state 切到静态 token cover fallback，不写 inline style，不删除真实数据。缩略图变化时重置失败态。
- [x] 封面保持稳定 16:9，标题/brief 限行并允许长词断行，作者名截断，统计脚部不收缩；320px 单列无横向溢出，后续 Home 网格只组合此组件而不再改卡契约。

**验证：** Home/Search 的 PostItem mock 点击、长标题、空 brief、空 avatar、无图/坏图、三项计数；`pnpm e2e` 保持现有相关用例。  
**回滚：** PostItem 单文件可恢复，类型和路由不变。

### Task P2.4：SildeShow 与 BackToTop

- [x] 保留文件拼写、默认导出、`SlideData`、`slides/autoPlay/autoPlayDelay`、loop、hover 暂停和 Embla `setApi`；复用 P1 Carousel/Previous/Next，不修改底层 Carousel API。
- [x] 组合层迁移为稳定 16:9、2px ink、shadow-lg；标题限行且避让 controls，dot 使用 `data-state=active|inactive` 并提供可访问名称/`api.scrollTo(index)`，不改 banners 数据。
- [x] dot 的视觉圆点保持小尺寸，实际 button 命中区在 320px 下也不得被 flex 压缩，实测至少 44×44px。
- [x] 每张图片失败由 React Set state 记录并显示静态 token cover fallback；不写 inline style。`autoPlay=false` 不创建自动播放；reduced-motion 使用 Autoplay 8.6.0 的 `playOnInit/play/stop` 停止自动播放，但上一张/下一张/dot 手动切换仍可用。
- [x] BackToTop 复用 P1 icon Button，保留 threshold=100、200ms throttle、滚动监听清理和回顶；增加 aria-label/title。reduced-motion 时直接回顶，否则保持 smooth；移动位置按 `--bottombar-h + safe-area + gutter` 避让底 tab。

**验证：** 四视口手动上一张/下一张、dot、autoplay/reduced-motion；滚动后 BackToTop 出现并回顶部。  
**禁止触碰：** Home 的 banners 数据与滚动 sessionStorage。

### Task P2.5：ErrorBoundary、Loading、InfiniteScroll 与 P2 门禁

- [x] ErrorBoundary 保持 class boundary、`getDerivedStateFromError/componentDidCatch`、全页 reload 和 `role=alert`；只用 token class + P1 Button 移除 inline style，`body translate="no"` 与全局挂载位置不动。
- [x] Loading 保持默认导出并同时服务 Suspense/Mine；改为稳定 fixed status overlay + lucide loading icon，支持 reduced-motion，移除私有 HEX/圆形 CSS 动画。
- [x] InfiniteScroll 保持 props、children、sentinel、IntersectionObserver threshold=0、disconnect 与 `hasMore/isLoading` 守卫；只迁移加载尾部视觉，不新增“没有更多”业务状态。
- [x] `rg 'loading.module.css'` 确认 index import 已移除且无其他引用后删除该 CSS module；`Header.tsx` 因 Chat 仍在使用必须保留。
- [x] 运行 `pnpm build`；P2 定向 lint 必须 0/0；全量 lint不得高于 14 errors/3 warnings且命中清单不变；`pnpm exec playwright test --list` 仍为 7/41，`pnpm e2e` 41 passed。
- [x] 运行 `pnpm visual:capture -- --stage=p2` 生成独立 28 张截图，不覆盖 P0；重点人工比较 Home 的 App Shell/Topbar/PostItem/Carousel 在 1440×1000、900×1000、390×844、320×740 的边界、长文本、图片 fallback 和遮挡。
- [x] 静态扫描 P2 文件中的 inline style、直接色阶/HEX、柔阴影、大圆角、渐变字面量和 `.active` class；允许的 cover 必须只引用 P1 token，业务 active 必须使用 `data-state`。

**文档回填：** 04 §5/§6 记录真实组件导出和断点数值。  
**建议 commit 边界（仅用户要求提交时）：** 1) `feat(ui): migrate app shell and search bar`；2) `feat(ui): migrate shared post and carousel components`；3) `docs(qa): record phase four P2 shared components`。每次只暂存对应 P2 文件，不混入前三期或 P1 脏改动。  
**风险与回滚边界：** App Shell 的 grid/断点/safe-area 作为 P2.1 一组回滚；SearchBar/Topbar 作为 P2.2 一组，避免受控/非受控状态或双重编码污染页面；PostItem 单独回滚且不动 Post 类型；SildeShow/BackToTop 一组，Autoplay 生命周期失败不得改 Home store；ErrorBoundary/Loading/InfiniteScroll 一组，若全局 fallback 回归只恢复其视觉文件。任何回滚均不得触碰 router/pages/store/API/P1 primitives。  
**批次完成条件：** App Shell 三态、SearchBar URL 写入、唯一 PostItem、轮播和辅助组件人工通过，41 条无回归。

**P2 实测状态（2026-07-15，已人工复验通过）：** P2.1～P2.5 已实施。生产 build 通过（2085 modules transformed），P2 TS/TSX 定向 lint 0/0，全量 lint 保持批准的 14 errors / 3 warnings，Playwright 列表仍为 7 个文件/41 条且全量 41 passed。P2 截图 28/28 已生成至 `docs/qa/phase4/screenshots/p2/`；移动轮播标题与 controls 首轮有遮挡，已在 P2 范围内改为移动标题上置并复验。人工评审进一步指出并已修正 Topbar 半透明/blur、SearchBar 清除按钮 44px 命中区、SildeShow dot 44px 命中区和 PostItem 键盘/link 语义；浏览器实测分别为 alpha 0.9 + blur(12px)、44×44px、44×44px，以及聚焦后 Enter 进入 `/post/1`。执行环境中 Playwright 自动启动 Vite 会因本地 Inter 文件权限出现 EPERM，改为沙箱外显式启动 `localhost` Vite 后复用，未以代码或配置绕过。用户已确认 P2 人工门禁通过，允许进入 P3 施工方案阶段。

---

## P3：现有 7 页一次性视觉迁移（7 tasks）

**目标：** 严格按 Home → Search → PostDetail → Compose → Chat → Mine → Login 顺序，把每页组合到 P1/P2 单一体系，并为 P4 预留固定状态/反馈/Markdown 容器。

**非目标：** 不实现 P4 的 Markdown/Toaster/Dialog，不改变 API、store 业务语义、路由或 SSE，不增加页面；唯一 store 变化是 04 已批准的 Search 非持久化 `error` UI 元数据。

**前置依赖：** P2 人工验收通过；P0 四视口基线可复跑。

**方案状态（2026-07-15）：** P3 七页已完成施工、自动门禁与用户整批人工验收，Search 去重评审修正亦已复验通过；允许进入 P4 施工方案阶段。

**方案选择：** 采用“按 Home → Search → PostDetail → Compose → Chat → Mine → Login 逐页一次迁移”的方案。拒绝先全页换 token 再二次拆组件（会让每页经历两次迁移），也拒绝七页一次合并（无法逐页归因和人工验收）。每页先冻结行为/testid，完成目标组合后立即跑对应 spec 与四视口人工检查；最终再统一生成 P3 的 28 张截图。

**真实文件矩阵：**

| 文件 | 动作 | P3 职责 |
|---|---|---|
| `src/pages/Home.tsx` | Modify | SearchBar、两行 TagChip、SildeShow、PostItem 列表；只接现有 store action |
| `src/pages/Search.tsx` | Modify | 消费 `q/category`、SearchBar、历史/结果/状态槽、唯一 PostItem |
| `src/store/search.ts` | Modify | 仅增加不持久化 `error` UI 元数据；请求与 history 语义不变 |
| `src/components/PostItem.tsx` | Modify | 增加可选 `highlight?: string` 纯展示契约，供 Search 安全文本分段；Home 默认路径不变 |
| `docs/design/00-foundation.md` | Modify | 在 PostCard 契约记录可选 highlight，保持单一组件事实来源 |
| `src/pages/post/index.tsx` | Modify | 详情编排、真实 content、统计、评论栏和 App Shell 避让 |
| `src/pages/post/CommentItem.tsx` | Create | 页面级两层评论行；只接收数据/handler，不访问 API/store，不成为全局组件 |
| `e2e/social.spec.ts` | Modify（仅契约适配） | 未赞状态断言从页面旧值 `unliked` 对齐 StatButton 契约 `idle`；业务断言与 7 条数量不变 |
| `src/pages/Compose.tsx` | Modify | Select、TagChip、图片区、正文兼容接缝和提交面板 |
| `e2e/compose.spec.ts` | Modify（仅交互适配） | 把原生 `selectOption()` 改为按 combobox/option 操作 Base UI Select；41 条数量、请求体/跳转断言不变 |
| `src/pages/Chat.tsx` | Modify | 单会话消息流、annotation link、错误/typing 接缝和输入栏 |
| `src/components/Header.tsx` | Delete（条件式） | Chat 迁移后 `rg` 为零才删除；仍有引用则保留 |
| `src/pages/Mine.tsx` | Modify | 用户摘要、现有头像 Drawer、退出；隐藏无能力入口 |
| `src/pages/Login.tsx` | Modify | 独立 861px 双栏 auth shell、seg、表单与强度状态 |
| `docs/qa/phase4/p3-pages.md`、`docs/qa/phase4/screenshots/p3/` | Create | 逐页人工记录、最终 7×4 截图与串验结论 |
| `docs/design/04-phase4-visual-polish.md`、本计划、`.planning/phase4-p3/` | Modify | 记录真实偏差、实现状态和门禁 |

**明确不修改：** router、`useHomeStore`、`useChatStore`、`useChatBot`、API、后端、数据库、原型、P1 primitives（除 foundation 文档记录 PostItem 的兼容扩展）、P4 Markdown/Toaster/Dialog/PageState。P3 不新增 e2e；Compose/Social spec 只做既有组件契约维护，不增加用例、不放宽业务断言。

**差分 lint 基线：** 七页当前为 6 errors / 3 warnings（Compose 2、Login 2、Search 1+2 warnings、PostDetail 1+1 warning）；本批必须适配的 Compose/Social spec 另有 4 个 `any` errors。所有 P3 新增/修改 TS/TSX 完成时必须 0/0，因此只对这两个被修改 spec 的现有类型债做最小收口；全量 lint 预期由 14/3 降至不高于 4/0，剩余只允许来自未触碰的 `api/config.ts`、`ui/badge.tsx`、`utils/index.ts`。不得借 P3 清理这三处。

**统一状态接缝：** P3 只用现有数据建立稳定 `data-slot` 容器和 token 化 inline 状态，不创建 PageState、toast、Dialog 或 MarkdownRenderer。Search 按已批准例外增加 `error` 元数据；其他页面没有可靠 error channel 时不得伪造“请求失败”，只呈现现有 loading/empty/inline error。P4 只替换接缝内容，不重排页面。

**统一执行模板：** 每页先记录现状 testid/行为 → 先跑对应既有 spec 形成绿基线 → 一次性迁移 → 页面范围 lint 0/0 + build → 同一 spec 复跑 → 1440/900/390/320 人工检查 → 用户逐页或整批确认。功能未获人工确认前不新增 e2e。最终运行 7 文件/41 条全量、`visual:capture -- --stage=p3` 生成 28 张截图并做主链路串验。

**页面状态与响应式矩阵：**

| 页面 | P3 可呈现状态（只用现有数据） | 四视口/长文本重点 |
|---|---|---|
| Home | 首屏 loading、筛选成功 empty、分页 loading；无可靠 error channel，不伪造 error | 1440 两列，其余单列；筛选横滚；长游戏名不压缩 chip；返回恢复 scrollY |
| Search | idle、loading、empty、error、results；error 来自获批的非持久化 store 元数据 | 结果自然页面滚动；关键词/长标题/长 brief 断行；320 下返回、输入、清除、提交均 ≥44px |
| PostDetail | loading、无法加载/不存在、正文 empty、评论 empty、like inline error、composer disabled | 标题/作者换行；图片/正文限宽；评论回复缩进收敛；fixed composer 避让 248/80/72 + safe-area |
| Compose | games/tags 初始空、uploading、submitting、inline error、disabled | Base UI popup 不越界；长游戏名截断；图片网格稳定；320 单列且提交按钮不漂移 |
| Chat | idle、messages、streaming、hook error、disabled | 动态 viewport 内单滚动区；长 AI 文本/URL/引用断行；输入栏不盖移动底 tab |
| Mine | 用户摘要、Drawer open/closed、全局 uploading overlay | 长用户名/ID 可断行；Avatar 尺寸稳定；Drawer/portal 不被底 tab 遮挡 |
| Login | login/register、loading、inline info/error、password level | 1440/900 双栏；390/320 单栏；短高屏可滚动；错误数组/长用户名不推出表单 |

**人工验收与回滚：** 每页验收都检查默认、loading/empty/error（仅该页有真实状态时）、disabled/focus、键盘、长文本、坏图和四视口；验收记录写入 `p3-pages.md`。某页失败只回滚该页及其页面级组件；Search 可连同可选 PostItem highlight 回滚，PostDetail 可连同 CommentItem/Social spec 适配回滚，Compose 可连同 Select/Compose spec 适配回滚。不得为通过门禁修改 router/API/store 业务结构或放宽断言。建议提交保持七个页面七个 commit，Search 的 foundation/PostItem 扩展跟 Search，CommentItem/Social spec 跟 PostDetail，Compose spec 跟 Compose；仅用户要求时提交，禁止 `git add .`。

### Task P3.1：Home

**Modify：** `frontend/black_box/src/pages/Home.tsx`。  
**保留：** 首次加载、无限滚动、tag×game AND、独立 toggle、双维度竞态、`!hasMore` switch 绕过、scroll sessionStorage、详情返回数据保持。  
**目标组合：** 内容区 SearchBar 导航入口 → SildeShow → 主 TagChip 行 → 次级 game TagChip 横滚 → PostItem 网格/尾部 Loading。该 SearchBar 是页面内容入口，不再用 sticky 私有 header，也不复制 App Shell Topbar 的结构。  
**必须保留：** `tag-all`、`tag-chip`、`game-filter-row`、`game-chip` testid 及 `data-state`；`loadMore({tag?,gameId?})` 调用形态。

- [x] 删除页面私有 sticky header、直接橙色阶/渐变/大圆角/柔阴影；内容区 SearchBar 不带第二套顶栏边框或 sticky 行为。
- [x] SearchBar 使用页面本地关键词 state，trim 后按 `encodeURIComponent` 导航 `/search?q=`；只负责导航，不在 Home 调搜索 API，也不写 search history。
- [x] tag/game 两行均复用 TagChip：内容类型通过 `getContentTypeVariant()`，未知类型回退 soft；“全部”只存在 tag 行，游戏仍点已选取消。保留所有 testid/data-state 和原 handler 参数。
- [x] `xl` 宽档使用两列 PostItem，900/390/320 保持单列；首屏 loading、筛选成功空结果和分页尾部 loading 各有稳定 `data-slot`，但 Home store 无 error channel，P3 不伪造错误态或改 store。

**验证：** `pnpm exec playwright test e2e/home.spec.ts e2e/game-filter.spec.ts`；快速切 tag/game、少帖筛选后切换、详情返回滚动恢复。  
**四视口验收：** 轮播比例、两行横滚、超长游戏名不挤压、1440 两列与其余单列、底 tab 遮挡、返回详情后的数据和 scrollY 恢复。  
**禁止触碰：** `useHomeStore.ts`、`api/posts.ts`、banners 数据。  
**建议 commit：** `feat(home): migrate feed to phase four visual system`。

**P3.1 实测状态（2026-07-15，已人工验收通过）：** `Home.tsx` 已一次性组合 SearchBar、SildeShow、TagChip、PostItem、InfiniteScroll 与 Loading，未修改 store/API/路由/e2e。迁移前后 `home.spec.ts` + `game-filter.spec.ts` 均为 8/8 passed；Home 定向 lint 0/0、全量 lint 保持 14 errors/3 warnings、生产 build 通过（2086 modules）。`p3-home` 截图工具输出 28/28，其中 Home 四视口实测列数 2/1/1/1、页面横向溢出 0；非 e2e route-mock QA 已验证分页追加、双维度竞态、少帖后切换、搜索 URL 编码及详情返回 `scrollY` 恢复。用户已确认 Home，允许连续实施 P3.2～P3.7，统一停在 P3 整批人工验收门禁。

### Task P3.2：Search

**Modify：** `frontend/black_box/src/pages/Search.tsx`、`frontend/black_box/src/store/search.ts`、`frontend/black_box/src/components/PostItem.tsx`、`docs/design/00-foundation.md`。  
**保留：** RequireAuth、500ms debounce、history persist、category 搜索、语义 search、结果排序与 PostItem 跳转。  
**目标组合：** 返回 icon Button + SearchBar → 历史 Tile → 搜索摘要 → 固定状态槽 → PostItem 列表。  
**必须保留/新增：** 返回、清除、提交、清空历史均有中文可访问名称；仅在行为测试需要时增加稳定 `search-input/search-state/search-results` testid，旧锚点不得删除。

- [x] store 增加 `error: string | null`：`search/searchByTag` 请求开始、成功、空输入时清零，失败写展示文案；`partialize` 仍只返回 history，API、排序和返回的 `Post[]` 不变。
- [x] URL source effect 明确 `category` 优先：有效 category 调现有 `searchByTag()` 并抑制 q/debounce；无 category 时把解码后的 `q` 同步到 keyword，由现有 500ms debounce 调 `search()` 一次。URL 清空时调用现有 `search('')` 清结果。
- [x] SearchBar submit 立即调用现有 `search()` 并 `addHistory()`；用 ref 记本次 immediate keyword，只跳过紧随其后的同值 debounce 一次，后续键入仍按 500ms 搜索。clear 清 keyword/error/results，不清 history，不改变 URL/history 持久化语义。
- [x] 删除与真实 `suggestions: Post[]` 不符的字符串/`any` 死分支；同一 `data-slot=search-state` 区分 idle/loading/empty/error，error 提供调用原 action 的重试，P4 只替换 PageState 呈现。
- [x] 给唯一 PostItem 增加可选 `highlight?: string`，默认不高亮；只对 title/brief 做大小写不敏感的 React 文本分段并输出 `<mark>`，先转义正则字符，不用 innerHTML。同步回填 foundation 3.7；Home 与其他调用方不传 prop，DOM/testid/跳转不变。

**失败证据：** P3 开始前以一次性 QA route mock 让 `/api/ai/search` 500，记录当前错误被误显示为“暂无结果”；脚本不进入 `e2e/`，实现后同脚本证明 error 与成功空结果可区分并删除。  
**验证：** build/本页 lint 0/0；匿名 `/search` 仍跳 Login；登录后 Topbar `q` 只触发一次请求且输入同步；手动 submit 不产生第二次 debounce 请求；category 优先、history、clear、error retry、高亮特殊字符人工检查；最终现有 41 条。  
**禁止触碰：** `api/search.ts` 接口、JWT、persist key、排序。  
**建议 commit：** `feat(search): unify search visuals and error presentation`。

### Task P3.3：PostDetail

**Modify：** `frontend/black_box/src/pages/post/index.tsx`、`frontend/black_box/e2e/social.spec.ts`（仅 StatButton 状态契约与触及类型）。  
**Create：** `frontend/black_box/src/pages/post/CommentItem.tsx`（仅页面级评论行）。  
**保留：** 详情/评论加载、点赞乐观更新和回滚、发表评论、两层回复、删除本人评论、未登录引导、`patchPost` 回写。  
**目标组合：** 返回/分享命令 → article header(Pill/Avatar/CountBadge) → 固定正文容器 → StatButton 行 → CommentItem 两层树/评论输入；P4 在正文容器装 MarkdownRenderer，在删除动作装 AlertDialog。  
**必须保留：** `comment-item`、`comment-reply`、`delete-comment`、`reply-button`、`like-button`、`like-count`、`comment-input`、`comment-submit`、`login-to-comment`。

- [x] 标题、作者、真实 `publishedAt`、tags 和只读 viewCount 使用统一组件；接口/`Post` 类型没有 game，P3 不展示或伪造游戏信息。删除无 handler 的“关注”和“下载 APP 查看完整内容”假入口。
- [x] 返回与分享保留原 handler，改为有中文 aria-label 的 icon Button；分享能力不扩展，成功/失败反馈留 P4。
- [x] 图片、正文、统计和评论区改为 unframed section/Panel 的正确层级，移除内层透明 Card；图片失败使用 React state + token fallback，不写 inline style。
- [x] like/comment/view 统一 StatButton；like 保留 `like-button/like-count`、P1 契约 `data-state=liked|idle`、busy 和失败回滚，comment/view 为只读 span，不制造可点击假按钮。Social spec 只把未赞断言由旧页面 `unliked` 对齐为 `idle`，点赞数、请求和持久化断言不变。
- [x] 正文 P3 使用 `post.content ?? post.brief` 原始字符串、`whitespace-pre-wrap` 保留单换行，并建立 `data-slot="post-body"`；P4 只在该容器接同一字符串的 MarkdownRenderer。空字符串只显示兼容空态，不伪造正文。
- [x] 抽页面级 CommentItem，props 仅含 comment、reply 标记、topId、当前用户 id 和 `onReply/onDelete`；保留两层树/testid，不访问 API/store，不显示不存在的评论时间，移动回复缩进收敛。
- [x] `window.confirm` 与删除请求暂保留到 P4；P3 只保持 handler 边界和现有重拉/patch 行为，不提前引入 AlertDialog/toast。因 Social spec 已触及，用明确的 mock comment/reply 类型替换其 3 个 `any`，不改测试流程。
- [x] 评论 composer 在 `>760px` 固定区左侧避让 `var(--sidebar-w)`，`≤760px` 固定于 `bottom: calc(var(--bottombar-h) + env(safe-area-inset-bottom))`；z-index 低于 Sidebar，主文档 padding 同时预留 composer，不能盖住末条评论或底 tab。

**验证：** 迁移前后均运行 `pnpm exec playwright test e2e/social.spec.ts`；坏图/无正文/超长标题和正文、未登录、点赞失败、两层回复；1440/900 检查评论栏不压 Sidebar，390/320 检查底 tab、安全区和末条评论均可见。  
**禁止触碰：** viewCount 写接口、Comment schema、评论层级、接口返回。  
**建议 commit：** `feat(post): migrate detail and comments visual structure`。

### Task P3.4：Compose

**Modify：** `frontend/black_box/src/pages/Compose.tsx`；`frontend/black_box/e2e/compose.spec.ts` 仅适配 Select 操作。  
**保留：** 标题/游戏/tagIds/fileIds/content、上传/移除、提交校验、createPost、fetch detail、prependPost、导航。  
**目标组合：** Panel 内基础信息 → Select → TagChip 多选 → 图片网格 → 固定 Markdown 工具/正文容器 → submit Button；P4 在既定正文容器加入编辑/预览。  
**必须保留：** `compose-page/title/game/tags/tag/image-input/content/error/submit`。

- [x] 原生 select 换 P1 Base UI Select，Trigger 保留 `compose-game` testid，value 仍用 string、提交时仍 `Number(gameId)`；TagChip 只驱动原 `selectedTagIds`，未知内容类型回退 soft。
- [x] 既有 `compose.spec.ts` 仅把 `selectOption('1')` 改成点击 `compose-game` combobox 后选择“黑神话:悟空”option；请求是否带 gameId、成功跳转及其余 4 条用例断言不变，不新增用例。因该 spec 已触及，用明确的 CreatePost mock body 类型替换其 1 个 `any`，不改断言语义。
- [x] 上传缩略图使用稳定尺寸；移除 icon button 有 44px 命中区和 aria-label；上传中沿用现有全局 uploading，仅禁用图片入口与提交，不改变逐图上传、部分成功或不回滚语义。
- [x] 提交使用 P1 Button `primary/busy`，字段错误靠近对应区域；catch 改 `unknown` + Axios 类型守卫以消除本页 lint，同时保持后端 message 优先级，不抽 P4 统一错误 helper。
- [x] content state 仍唯一；P3 不安装 Markdown 依赖、不显示无功能的编辑/预览按钮，现有 Textarea wrapper 固定为 `data-slot=markdown-editor`；`markdown-preview` 由 P4 在真实 segmented mode 与 renderer 同步创建，不在 P3 制造空 preview 容器。

**验证：** 先用原 spec 证明原生 select 绿基线；切 Base UI Select 后记录 `selectOption` 因控件类型变化失败，再做上述最小测试维护并恢复同 5 条通过。人工覆盖无图/多图/单图失败/重复选图/空标题/空正文/成功 prepend；四视口检查 popup、长游戏名、图片网格与键盘选择不横溢。  
**禁止触碰：** POST DTO、草稿、自动保存、改帖、上传 API。  
**建议 commit：** `feat(compose): migrate publishing form visual structure`。

### Task P3.5：Chat

**Modify：** `frontend/black_box/src/pages/Chat.tsx`；`frontend/black_box/src/components/Header.tsx` 仅在迁移后无人引用时删除。  
**保留：** useChat 1.2.12、Authorization、SSE `0:/8:/d:`、annotation、阈值、useChatStore 内存单会话。  
**目标组合：** 页面标题/返回命令 → message flow → 引用 Link chip → typing/error 槽 → sticky 输入区。  
**必须保留：** `chat-message`、`chat-citations`、`chat-citation-link`、`chat-loading`。

- [x] 移除页面对旧 Header 的依赖，以 unframed 页面标题/返回 icon command 组合；Chat 高度按 App Shell Topbar、内容 gutter 和移动底 tab 计算，不再用嵌套 `h-screen` 造成双滚动。
- [x] assistant/user 气泡用 token，最大宽度在桌面/移动分档，长单词、URL 和连续中文可断行；AI 内容仍纯文本并保留换行，不在 P3/P4 改为 Markdown。
- [x] 引用 chip 保持 `<Link to="/post/:id">`、三个 citation testid 和可见 focus；长标题截断但保留 title，无引用不留空容器。
- [x] 从 useChat 返回值显示现有 error 到 `data-slot=chat-error`，不清历史、不改 hook 的 `onError`、SSE 或 store；typing 使用稳定尺寸并保留 `chat-loading`。
- [x] 输入/发送保持原 `handleInputChange/handleSubmit`；为兼容既有 3 条 spec，placeholder 保留 `Type your message...`，发送按钮 accessible name 保留可匹配 `Send`（可同时显示中文），loading 尺寸稳定；不新增 stop/regenerate。
- [x] `rg` 确认 Header 无引用后删除；Topbar 仅同步移除失真注释，运行行为未变。

**验证：** 迁移前后 `pnpm exec playwright test e2e/ai-chat.spec.ts` 保持 3/3；mock 验 token、`0:/8:/d:` 解析、引用跳转和离开返回保持；真实握手只做一次人工流式抽查，不把不确定 AI 文本写测试。四视口检查长回答、多个引用、输入栏和底 tab 不重叠。  
**禁止触碰：** `useChatBot.ts`、`useChatStore.ts`、chat API、后端 AI。  
**建议 commit：** `feat(chat): migrate single-session assistant interface`。

### Task P3.6：Mine

**Modify：** `frontend/black_box/src/pages/Mine.tsx`。  
**保留：** 用户/首字母 fallback、Drawer 上传头像、`setAvatar` 即时刷新、logout。  
**目标组合：** unframed 用户 header + Avatar → 真实动作 Panel → Drawer → destructive 退出。  
**必须保留：** `mine-avatar`、`avatar-upload-btn`、`avatar-file-input`。

- [x] 删除当前不可达且无 handler 的“我的帖子”视觉项，不新增路由；页面只剩用户摘要、头像上传和退出三个真实能力/信息。
- [x] Avatar 的 DrawerTrigger 使用可聚焦的真实 button/Button 语义并有“修改头像”名称，不能继续用无键盘语义的 div；保持 `mine-avatar` 位于触发器内和首字母 fallback。
- [x] Drawer 视觉统一并保持当前“选图即关闭 → 全局 Loading → setAvatar”的时序；P3 不改为失败保留 Drawer。成功/失败只预留 P4 toast 接缝，不提前实现反馈系统。
- [x] 删除 `bg-gray/bg-white/text-blue/shadow-red` 直接色阶和无效 `mt-4.space-y-4` 类。
- [x] logout 行为和导航由现有 store/guard 决定，不新增确认弹窗。

**验证：** 一次性 route mock 人工检查上传成功/失败、Avatar key 刷新、Drawer 关闭时序和 logout→RequireAuth；不新增 e2e。四视口检查长用户名/ID 换行、Drawer portal、Loading 与底 tab，不出现无功能入口。  
**禁止触碰：** profile/my-posts/my-likes、预设/AI 头像。  
**建议 commit：** `feat(mine): migrate account summary and avatar flow visuals`。

### Task P3.7：Login 与 P3 门禁

**Modify：** `frontend/black_box/src/pages/Login.tsx`。  
**保留：** login/register seg、密码显隐、确认密码、强度规则、API、自动登录/兜底、user store、成功导航。  
**目标组合：** 独立双栏 auth shell；左品牌面、右表单；`≤860px` 隐藏品牌面。  
**必须保留：** `login-page`、`seg-login/register`、`pw-toggle`、`auth-submit/name/password/confirm/error`、`password-strength`。

- [x] 独立 shell 不渲染 MainLayout/Sidebar/Topbar；品牌栏仅 `min-width:861px` 显示，390/320 和 900 高度不足时表单可自然滚动，不能垂直裁切。
- [x] seg 用 `data-state`；Input/Button/IconButton 统一，密码强度用 `data-level` + 语义 token，同时显示弱/中/强文字，不用直接 yellow/green 色阶作为唯一线索。
- [x] 去除 emoji 作为品牌主视觉，使用文字品牌与真实社区价值文案，不增加第三方登录/找回密码。
- [x] loading 禁止重复提交；catch 改 `unknown` + Axios 类型守卫，保持 inline info/error、401 refresh 重载和自动登录兜底语义；P4 只接入统一反馈，不重排表单。
- [x] 完成 Login 后生成最终 P3 28 张截图，复跑静态台账，扫描 7 页直接色阶、柔阴影、大圆角、页面渐变、私有重复组合和 class 业务状态；`window.confirm` 仅允许 PostDetail 1 处留 P4。

**验证：** 迁移前后 `pnpm exec playwright test e2e/auth.spec.ts e2e/auth-guard.spec.ts`；键盘切 seg、显隐密码、弱/中/强、长错误数组、注册自动登录兜底；1440/900 双栏，390/320 单栏且无 App Shell。最终 build、P3 文件 lint 0/0、全量 lint不高于 4/0、7 文件/41 条全量通过。  
**文档回填：** 04 §7 对每页记录实际组件组合和保留 testid。  
**建议 commit：** `feat(auth): migrate login and registration shell visuals`；P3 七页建议七个独立 commit，不合并为一个巨型提交。  
**批次完成条件：** 7 页各自四视口人工通过；最终 `docs/qa/phase4/screenshots/p3/` 为 28/28；P4 插槽明确但未实现；旧页面私有视觉体系已清；41 条无回归。用户逐页或整批确认前不新增 e2e、不进入 P4。

**P3 整批实测状态（2026-07-15，已人工验收通过）：** 七页已按固定顺序完成页面级施工。P3 触及 TS/TSX 定向 lint 为 0 errors / 0 warnings；全量 lint 为计划批准的 4 errors / 0 warnings，且只命中 `api/config.ts`、`ui/badge.tsx`、`utils/index.ts`；生产 build 通过（2166 modules transformed）；Playwright 清单仍为 7 files / 41 tests，全量 41 passed。终态 `docs/qa/phase4/screenshots/p3/` 为 28/28，执行者与用户均已完成页面/交互验收。Search 去重评审修正复验后，用户确认 P3 整批通过，允许进入 P4 施工方案阶段。

**P3 Search 评审修正（2026-07-15，已人工复验通过）：** 首轮整批评审发现手动提交已完成 debounce 的关键词时，`skipNextDebounce` 可能因没有紧随其后的同值 effect 而残留，并在后续 `A → B → A` 中误吞最后一次 A。实现已收紧为“下一轮 debounce 必定消费并清空标记，仅同值时跳过；不同值继续搜索”，category 分支也清除过期标记。一次性 route-mock QA 先得到失败序列 `A,A,B`，修复后为 `A,A,B,A`；快速提交仍仅一次，首次 `q` 仍单请求，category 优先及 history-only 持久化不变。复验保持 Search lint 0/0、全量 lint 4/0、build 2166 modules、7 files/41 tests 全通过；用户据此确认 P3 整批人工验收通过。

---

## P4：Markdown、安全渲染、toast/Dialog 与统一状态（5 tasks）

**目标：** 在 P3 已人工验收的布局与业务接缝内，增加同源 Markdown 编辑/安全渲染、全局单例反馈、删除确认和统一内容区状态；不重排七页信息结构。

**实施状态（2026-07-16，已人工验收通过）：** P3 已整批人工验收通过；P4.1～P4.5 已实施并完成评论删除异常路径修正：删除成功后先更新本地评论树与 Home 计数，刷新失败不恢复旧评论，无用途的 `deleteConfirmRef` 已删除。P4 定向 lint 0/0、全量批准基线 4/0、5 files/16 unit tests、build、7 files/41 Playwright、28/28 截图与一次性交互 QA 均通过；用户已确认 P4，允许进入 P5。

**非目标：** 不改路由、接口字段、DTO、schema/migration、JWT/SSE/AI、Search/Home 业务语义、后端、原型或 P5；不启用 raw HTML，不把 Chat 改 Markdown，不新增页面/个人中心/改帖/正文 embedding/评论时间。

**真实状态边界：** Search、Chat、comments 请求有可靠 error；Home 的 `fetchPosts/useHomeStore` 与 PostDetail 的 `fetchPostById` 会把失败折叠为空值。P4 不改变这些 API/store 语义，只统一真实可观测状态；Home 不伪造 ErrorState，PostDetail null 使用“不可用或不存在”+重试。精确错误可观测性登记为后续工程债。

### 依赖差异

| 类型 | P4 增加 | 已核兼容性/用途 |
|---|---|---|
| dependencies | `react-markdown@^10.1.0` | React `>=18`；唯一 Markdown React renderer |
| dependencies | `remark-gfm@^4.0.1`、`remark-breaks@^4.0.0` | GFM 与旧帖单换行兼容 |
| dependencies | `rehype-sanitize@^6.0.0` | GFM 白名单 sanitize；不安装/启用 `rehype-raw` |
| dependencies | `sonner@^2.0.7` | 支持 React 19；根部单一 Toaster |
| devDependencies | `vitest@^4.1.10` | 支持 Vite 8/Node 24；Node 环境做 P4 纯逻辑/SSR 单测，不增加 jsdom |

`@base-ui/react@1.3.0` 已真实导出 AlertDialog `Root/Backdrop/Close/Description/Popup/Portal/Title/Trigger/Viewport`，不新增 Radix AlertDialog 依赖；现有 `radix-ui` 聚合包保持不动。package/lock 只允许上述六个直接依赖及其必要传递依赖变化，并增加 `test:unit: vitest run`。

### 文件职责矩阵

| 文件 | 处置 | 单一职责 |
|---|---|---|
| `src/components/ui/alert-dialog.tsx` | Create | 封装 Base UI AlertDialog parts、Portal/Backdrop/Viewport/Popup、Cancel 与非自动关闭 Action |
| `src/components/ui/toaster.tsx` | Create | token 化 Sonner Toaster；固定单例视觉、层级、reduced-motion 与移动底栏 offset |
| `src/components/ui/skeleton.tsx` | Create | `aria-hidden` 稳定占位块；不取代 fixed `Loading` overlay |
| `src/components/PageState.tsx` | Create | `PageState` 与 `IdleState/LoadingState/EmptyState/ErrorState` 语义包装；不捕获 API |
| `src/lib/api-error.ts` | Create | 429、网络、Nest string/string[] message、未知错误统一映射；不碰 axios interceptor |
| `src/lib/feedback.ts` | Create | success/error/warning toast helper；调用方必须传稳定 `id` 去重，不接管 Promise |
| `src/lib/markdown.ts` | Create | plugin 列表、sanitize schema、URL/站内链接/图片策略的纯函数和常量 |
| `src/components/MarkdownRenderer.tsx` | Create | Compose/PostDetail 唯一 renderer 与 token typography；Chat 禁止引用 |
| `src/lib/api-error.test.ts`、`src/lib/markdown.test.ts` | Create | 纯策略 TDD：错误优先级、协议/控制字符/相对路径/图片 URL |
| `src/components/PageState.test.tsx`、`src/components/MarkdownRenderer.test.tsx` | Create | Node SSR TDD：roles/data-state、旧换行/GFM/XSS/链接属性；不做像素断言 |
| `vitest.config.ts` | Create | 独立 Node/SSR 单测配置，只收集 `src/**/*.test.{ts,tsx}`，不加载产品 Vite mock plugin 或 Playwright spec |
| `src/main.tsx` | Modify | ErrorBoundary 内、RouterConfig 同级挂唯一 Toaster；App/BackToTop 结构不变 |
| `src/dev/phase4-component-gallery.tsx` | Modify | dev-only 展示 PageState/Skeleton/Dialog/toast/Markdown 安全 fixture；不注册产品路由 |
| `src/pages/Home.tsx` | Modify | 首屏 PostCard skeleton 与既有 empty 使用统一组件；不新增 error/store 状态 |
| `src/pages/Search.tsx`、`src/store/search.ts` | Modify | 保持 q/category/debounce/history；状态块接 PageState，error 文案走 helper 且仍不持久化 |
| `src/pages/Chat.tsx` | Modify | 空会话/现有 hook error 接 compact PageState；typing/SSE/消息纯文本不动 |
| `src/pages/Compose.tsx` | Modify | 编辑/预览、同一 content、提交/图片失败 toast；上传与 prepend/navigate 编排不动 |
| `src/pages/post/index.tsx` | Modify | 详情 Markdown、正文/评论状态、单例受控删除 Dialog、评论/点赞反馈与原回写 |
| `src/pages/Mine.tsx`、`src/pages/Login.tsx` | Modify | 头像成功/失败和注册成功 toast；Drawer/认证时序及 inline auth error 不动 |
| `e2e/social.spec.ts` | Modify | 仅把原生 dialog 接受改为操作 AlertDialog；仍为原 7 条、删除业务断言不弱化 |
| `scripts/capture-phase4-screenshots.mjs` | Modify | P4 截图 fixture 增加 Markdown/GFM 正文；路由、视口、稳定等待和 28 张 manifest 不变 |
| `docs/qa/phase4/p4-content-feedback.md`、04/foundation/本计划、`.planning/phase4-p4/` | Create/Modify | 记录依赖、红绿证据、四视口、XSS/焦点/反馈验收与实现状态 |

**Delete：无。** `Loading`、P3 状态 testid、页面 API/store 与既有 7 个 spec 均保留；P4 人工验收前不创建新的 e2e 文件。

### 单一组件与安全契约

```ts
type PageStateKind = 'idle' | 'loading' | 'empty' | 'error';

interface PageStateProps {
  state: PageStateKind;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
  testId?: string;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  empty?: React.ReactNode;
}

interface FeedbackOptions {
  id: string;
  description?: string;
}
```

- PageState 外层固定 `data-slot="page-state" data-state={state}`；loading 为 `role="status" aria-live="polite"`，error 为 `role="alert"`，idle/empty 不抢读屏焦点。action 只接页面传入的现有 Button。Skeleton 永远 `aria-hidden`，motion-reduce 停止动画。
- Toaster 固定 light/token 样式，不启用 Sonner richColors 第二套色板；桌面 bottom-right，`mobileOffset` 使用 `calc(var(--bottombar-h) + env(safe-area-inset-bottom) + var(--space-3))`，层级高于 Sidebar/Dialog backdrop；关闭按钮命中区不低于 44px。页面每次操作用稳定 id 更新已有 toast，避免重复堆叠。
- AlertDialog 使用受控 open；Base UI AlertDialog 默认 modal、禁止 pointer dismissal，Esc 沿 primitive 默认关闭。Popup `initialFocus` 指向 Cancel；Action 是 destructive Button 而不是 Close，异步成功后页面关闭，失败时评论保留、Dialog 保持、toast 报错；busy 时忽略关闭并禁用取消/确认，避免请求中重复触发。`finalFocus` 按关闭结果决定：取消或 Esc 返回原删除按钮；失败不关闭且焦点留在 Dialog 内；成功时若原按钮仍 `isConnected` 则返回原按钮，否则返回页面提供的 `comments-heading`/评论列表稳定锚点（`tabIndex={-1}`）。
- `api-error` 优先级固定为 429 统一文案 → 无 response/`ERR_NETWORK` 网络文案 → 后端 string/string[] message → 调用方 fallback；未知 Error 不把技术 message 直接暴露给用户。
- Markdown plugin 顺序固定为 `remarkGfm`、`remarkBreaks`，rehype 阶段只用 `rehypeSanitize`；`skipHtml=true`，禁止 `rehype-raw`、`dangerouslySetInnerHTML`、脚本/iframe/style/form/event 属性。sanitize 从 default schema 最小扩展 GFM 的 table/thead/tbody/tr/th/td、disabled task checkbox、code language class、任务列表 class 和 align 属性；不开放任意 class/style/id。
- URL 先 trim 并拒绝 ASCII 控制字符、反斜杠、协议相对 `//`。链接只允许 `http:`、`https:`、`mailto:` 和站内 `/`、`./`、`../`、`?`、`#`/bare relative；图片只允许绝对 `http/https`，拒绝相对、`data:`、`javascript:`。站内相对链接用 Router Link；绝对 http/https 用新窗口并带 `rel="noopener noreferrer"`；图片使用 `loading="lazy" decoding="async" referrerPolicy="no-referrer"`、token 边框和最大宽度，失败时由 React state 切换为 token 占位，不使用 inline style。任务 checkbox 强制 disabled。
- Typography 全部在 MarkdownRenderer 的 React components 映射中使用现有 token，不引入 typography/prose 主题；表格与 fenced code 分别放横滚容器，长 URL/单词允许断行。Compose preview 与 PostDetail 共享同一配置和结果。
- 旧帖兼容固定覆盖：连续文字单换行产生 `<br>`、空行产生段落、多行列表前普通文本不合并。`Post.content` 仍是 Markdown 源文本、不存 HTML；Compose 预览用当前 content，提交继续沿用已验收的 `content.trim()` payload。

### Task P4.1：依赖、测试基座与共享反馈/状态 primitives

- [x] 安装表中五个 runtime 依赖与 Vitest，核对 package/lock 差异后先运行原 build/lint/7 files/41 tests，证明仅安装未改变行为。
- [x] 先写 `api-error.test.ts` 和 `PageState.test.tsx` 的失败用例，再实现 `api-error`、Skeleton、PageState；测试只断言语义/文字/属性，不断言 CSS 类。
- [x] 按 Base UI 真实 parts API实现 AlertDialog；Cancel 通过 primitive Close + 现有 Button `render` 组合，Action 保持普通 Button，由受控页面决定关闭。
- [x] 实现 token 化 Toaster/feedback helper，并在 `main.tsx` 的 ErrorBoundary 内、RouterConfig 同级挂载一次；不改变 RouterConfig/App。
- [x] 在 dev-only gallery 增加四种状态、Skeleton、toast 去重和 AlertDialog；不注册产品路由、不修改生产入口条件。

**验证：** `pnpm test:unit`、P4.1 定向 lint、全量 lint不高于 4/0、build、41 条；gallery 1440/900/390/320 检查 Dialog 尺寸、Cancel 初始焦点、Tab trap、Esc/取消焦点返回、busy 防重复、toast 单例/去重/底栏避让和 reduced-motion。  
**回滚：** package/lock、测试基座、共享组件、main/gallery 同组回滚；不得留下半安装依赖或第二个 Toaster。  
**建议 commit：** `feat(ui): add phase four feedback and state primitives`。

### Task P4.2：Markdown policy 与唯一安全 Renderer

- [x] 先写 URL policy 和 SSR renderer 失败用例：普通/混淆危险协议、相对链接、远程/相对图片、raw HTML、单换行/段落、GFM 表格/任务/删除线、代码块、外链属性。XSS fixture 至少包含 `<script>alert(1)</script>`、`<img src=x onerror=alert(1)>`、`<iframe src=...>`、`[x](javascript:alert(1))`、混合大小写/控制字符协议、`[x](//evil.example)` 与 `![x](data:text/html,...)`，断言危险节点/属性/URL 不进入输出。
- [x] 实现 `markdown.ts` 的常量/schema/URL 纯函数，再实现 MarkdownRenderer；sanitize 必须位于最后一个不可信转换之后，components 只负责安全元素与 token 呈现。
- [x] gallery 加同一 fixture 的普通、旧纯文本、GFM、XSS、超长 URL/代码/表格/嵌套图片；通过 DOM 检查确认无 script/event/style/form/iframe 和危险 href/src。

**验证：** 单测红→绿、P4.2 lint 0/0、build；四视口确认表格/代码仅局部横滚、页面无横向溢出，图片失败不撑破容器，键盘可达链接。  
**回滚：** policy/renderer/tests/gallery fixture 一组撤销；尚未接页面时不影响 P3。  
**建议 commit：** `feat(markdown): add sanitized shared renderer`。

### Task P4.3：全局状态接线（Home、Search、Chat）

- [x] Home 只把首屏 fixed Loading 改为与 PostCard 尺寸一致的 Skeleton 组合，把现有 empty 改 EmptyState；分页 InfiniteScroll loading、筛选/store/滚动恢复不动，不增加 error。
- [x] Search 用 Idle/Loading/Empty/ErrorState 替换 P3 私有状态块，保留原 `data-slot="search-state"`/testid、retry、q/category/debounce/history；store 仅用 `getApiErrorMessage` 生成现有非持久化 error。
- [x] Chat 用 compact EmptyState/现有 hook ErrorState替换对应壳；typing bubble、JWT/SSE/annotation/store/纯文本消息与输入 busy 不动，不新增“重试生成”业务。

**验证：** 定向 lint 0/0、build、`home.spec.ts`/`game-filter.spec.ts`/`auth-guard.spec.ts`/`ai-chat.spec.ts`；一次性 mock 验 Search 429/网络/后端错误与 retry，Home 初始 skeleton→内容/empty，Chat error 不清历史。四视口不改变 P3 信息顺序、滚动与底栏。  
**回滚：** 三页按文件独立回滚；不回滚共享组件，不触碰 Home/Search/Chat 业务 hook。  
**建议 commit：** `feat(ui): unify observable page states`。

### Task P4.4：Compose Markdown 编辑/预览与动作反馈

- [x] 在既有 `data-slot="markdown-editor"` 内增加 UI-only `edit|preview` state；`>1024px` 同时显示双栏，`≤1024px` 显示 data-state segmented control 与单面板，默认 edit，保留 `compose-content`。
- [x] Textarea、preview 和提交共用唯一 content；preview 渲染未转换 state，提交仍发送现有 trim 后 Markdown 字符串。空 preview 用 EmptyState，不新增自动保存/草稿/HTML payload。
- [x] 图片逐文件上传失败用文件级稳定 toast id，已成功图片不回滚；提交失败保留全部表单并 error toast，成功 toast 后仍 fetch detail→prepend→navigate。字段校验保留 inline，不用 toast 代替。
- [x] submitting/uploading 与现有 canSubmit、按钮 busy、上传时序保持；不借 P4 重写请求并发或回拉语义。

**验证：** Compose lint 0/0、unit/build、原 `compose.spec.ts` 5/5；一次性 route-mock 断言 preview 与 PostDetail fixture 一致、payload 是 Markdown 而非 HTML且继续 trim、失败保留输入/已上传图片、toast 同 id 不堆叠。1440 双栏，900/390/320 分段切换，长代码/表格仅预览内部横滚。  
**回滚：** Compose 单文件回到 P3 Textarea，数据和数据库无需回滚；共享 renderer/feedback 保留。  
**建议 commit：** `feat(compose): add sanitized markdown preview`。

### Task P4.5：PostDetail Markdown/Dialog、剩余反馈与整批门禁

- [x] 先维护既有 `social.spec.ts` 删除用例：去掉原生 dialog listener，点击“删除评论”后操作 AlertDialog 确认；用例仍 7 条且最终“评论消失”断言不变，先观察旧实现失败再施工。
- [x] `post-body` 直接组合 MarkdownRenderer，仍取 `content ?? brief`；空正文用 EmptyState。详情 null 用“不可用或不存在”状态 + retry/返回，不声称能区分 404/网络失败；comments 可用真实 ErrorState + retry。
- [x] 页面只维护一个 `pendingDeleteId` 受控 AlertDialog；确认时 busy，DELETE 成功后先从本地评论树移除目标节点并同步 Home count，再用 reload 结果校准，故 reload 失败也不会留下已删除节点；DELETE 失败保留评论/Dialog 并 error toast，取消不发请求且焦点回原删除按钮。成功关闭前记录关闭结果，`finalFocus` 在触发按钮仍连接时返回该按钮，否则聚焦 `comments-heading`/评论列表稳定锚点。
- [x] 评论提交增加 UI busy 防重复并在失败时保留输入/回复上下文、error toast；点赞继续乐观更新/失败回滚，仅把 inline action error 收口为统一 error toast。分享行为不扩展。
- [x] Mine 在 Drawer 先关→全屏 Loading→setAvatar 的原时序中增加成功/失败 toast；失败仍不重开 Drawer。Login 仅在注册 API 成功后发 success toast，登录/注册错误继续 inline，自动登录/兜底与 861/860 布局不动。
- [x] 生成 `visual:capture -- --stage=p4` 的 7×4=28 张截图，回填 QA/04/foundation/计划；人工确认前不新增 P4 e2e、不进入 P5。

**自动门禁：** P4 新增/修改 TS/TSX lint 0/0；全量 lint不高于 4/0且只剩 `api/config.ts`、`ui/badge.tsx`、`utils/index.ts`；`pnpm test:unit`、build；Playwright 清单仍 7 files/41 tests，全量 41 passed。静态扫描 `window.confirm/alert`、`dangerouslySetInnerHTML`、`rehype-raw` 为零，`remarkBreaks`/sanitize 只在共享 policy 配置。  
**人工门禁：** Markdown/XSS/旧换行/GFM/外链/图片；Dialog Cancel 初始焦点、Tab/Esc、取消返回原按钮、失败保持 Dialog 内焦点、成功删除后在触发节点消失时返回 `comments-heading` 稳定锚点、确认/busy/失败保留；toast 单例、同 id 去重、底栏避让；PageState/Skeleton 语义；Compose/PostDetail 一致；1440/900/390/320 无横向页面溢出、遮挡或 P3 结构回归。  
**人工验收后新增 e2e：** 再新增 `markdown.spec.ts` 锁定编辑→预览→trim 后源文本提交、旧单换行/GFM详情、安全 URL/HTML；新增 `feedback.spec.ts` 锁定删除取消不请求、删除失败保留、Compose 失败保留+toast、Mine 上传成功/失败时序。只断言行为/ARIA/testid，不断言 CSS/DOM 层级；通过后更新 41 之外的增量基线。  
**风险/回滚：** PostDetail、Mine、Login 可按页面独立回滚；若 renderer 安全测试失败则整组回滚 Markdown policy/renderer/两页接线，绝不通过放宽 schema 解决。Dialog/feedback 失败回滚到 P3 行为时不得保留半接线 toast 或双确认。  
**建议 commit：** `feat(post): add safe markdown and confirmed comment deletion`、`feat(feedback): wire account and auth notifications`；最终文档/QA 独立 commit。  
**批次完成条件：** 上述自动与人工门禁全部通过且用户明确确认；确认前不新增 P4 e2e、不进入 P5。**状态：2026-07-16 用户人工验收通过。**

**P4 实测状态（2026-07-16，已人工验收通过）：** 五个 task 已实施。新增依赖与 lock 差异符合表格；独立 `vitest.config.ts` 避免 Vitest 误收集 Playwright。P4 定向 lint 0/0，全量 lint 为批准的 4 errors/0 warnings且仅命中 `api/config.ts`、`ui/badge.tsx`、`utils/index.ts`；5 个单测文件 16 passed；生产 build 2453 modules；Playwright 清单仍为 7 files/41 tests且全量 41 passed；P4 截图 28/28。一次性交互 QA 验证 Compose 1440 双栏/320 分段、Markdown/XSS、toast 去重、Dialog 取消/Esc、失败保持与成功 fallback 路径及窄屏 overflow=0；临时脚本已删除。首轮 QA 发现删除失败后 busy 按钮失焦到 body，已改为失败结束后聚焦 Dialog Cancel 并复验通过；复审又发现删除成功后刷新失败会保留旧树，已改为本地树先行删除，并用“删除 200 + 刷新 500”强制路径验证旧评论消失、错误态出现、Dialog 最终关闭。用户已确认 P4，可以进入 P5 施工方案阶段。

---

## P5：URL、限流、强密钥、文件清理与演示 seed（10 tasks）

**目标：** 收口运行时配置和敏感接口保护，提供可审查的一次性维护脚本和可重复演示数据；不改变成功接口结构或 AI SSE。

**非目标：** 不引入 secret manager、Redis 限流、对象存储、HttpOnly Cookie、CSP/Helmet，不改 schema/migration。

**前置依赖：** P0 基线；可在 P3/P4 后按 8 个独立任务串行实施，P6 前全部完成。

**实施顺序与检查点：** `P5.1` 前端 URL 可独立施工；随后 `P5.2` 先建立环境配置底座，`P5.3`/`P5.4`/`P5.5` 依次消费该底座；`P5.6` 与 `P5.7` 分别完成维护和演示数据，最后 `P5.8` 汇总环境示例、运维文档与集成门禁。每个 task 保持独立 diff、定向测试和回滚边界；涉及真实 cleanup apply、演示 DB seed/backfill 的命令均需单独人工确认，不能因代码测试通过而自动执行。

**新增环境变量契约：**

| 变量 | 开发默认/规则 |
|---|---|
| `VITE_API_BASE_URL` | 前端必填示例 `http://localhost:3000/api`；构建时 trim 尾斜杠 |
| `PUBLIC_BASE_URL` | 开发默认 `http://localhost:${PORT或3000}`；生产必填 URL |
| `FRONTEND_ORIGIN` | 开发默认 `http://localhost:5173`；生产必填 origin |
| `TRUST_PROXY` | 默认 `false`；仅已知反向代理部署允许 `loopback` |
| `THROTTLE_GLOBAL_LIMIT/TTL_MS` | `60` / `60000` |
| `THROTTLE_LOGIN_LIMIT/TTL_MS` | `10` / `60000` |
| `THROTTLE_REGISTER_LIMIT/TTL_MS` | `5` / `600000` |
| `THROTTLE_AI_CHAT_LIMIT/TTL_MS` | `10` / `60000` |
| `THROTTLE_AI_SEARCH_LIMIT/TTL_MS` | `30` / `60000` |
| `THROTTLE_UPLOAD_LIMIT/TTL_MS` | `20` / `600000` |
| `DEMO_USER_PASSWORD` | 仅 seed 命令必填，不进入生产运行时校验 |
| `AI_EMBEDDING_TIMEOUT_MS` | `20000`；embedding 单次有限失败上限，正整数毫秒 |
| `AI_CHAT_TIMEOUT_MS` | `30000`；DeepSeek 流有限失败上限，正整数毫秒 |

### Task P5.1：前端统一 `VITE_API_BASE_URL`

**Create：** `frontend/black_box/src/config/runtime.ts`、`runtime-value.ts`、`runtime.test.ts`、`frontend/black_box/.env.example`。  
**Modify：** `frontend/black_box/src/api/config.ts`、`frontend/black_box/src/hooks/useChatBot.ts`、`frontend/black_box/playwright.config.ts`、`frontend/black_box/vite.config.ts`；P5.1 不新增依赖，package/lock 不应变化。

- [x] `runtime-value.ts` 提供无副作用的 URL 必填/归一化函数；`runtime.ts` 导出 `API_BASE_URL` 和 `apiUrl(path)`，trim 末尾 `/`、path 统一补 `/`，不在业务文件回退 localhost。`vite.config.ts` 复用同一纯函数，在 dev/build 启动前拒绝缺失值，避免构建成功后才在浏览器抛错。
- [x] axios `baseURL=API_BASE_URL`；useChat `api=apiUrl('/ai/chat')`，Authorization 和 useChat 其他配置不改。
- [x] `.env.example` 写占位/开发示例，不写真实 key；Vite build 使用 `VITE_API_BASE_URL` 注入。
- [x] 裸 `pnpm build` 在没有 `.env/.env.local` 时按契约失败。开发者可自行创建不提交的 `.env.local`；CI/验收必须显式注入，例如 PowerShell `$env:VITE_API_BASE_URL='http://localhost:3000/api'; pnpm build`，POSIX/CI `VITE_API_BASE_URL=http://localhost:3000/api pnpm build`，不得依赖 `.env.example` 被自动加载。
- [x] `playwright.config.ts` 的 `webServer.env` 为 Vite 子进程注入固定测试值 `VITE_API_BASE_URL=http://localhost:3000/api`；允许调用者用同名 process env 显式覆盖。该测试默认只存在于 Playwright 配置，不进入生产 runtime，也不要求修改 41 条用例。

**失败证据：** 修改前 `rg 'localhost:3000' frontend/black_box/src` 命中 config/useChat。  
**验证：** 先验证缺变量 build 明确失败，再用上述显式注入命令及带尾斜杠值运行 build；执行 `pnpm e2e` 验证 webServer 获得固定测试值且 7 files/41 tests 不变；浏览器确认 posts/auth/search/chat/upload URL 均同源，SSE header/annotation 不变。  
**人工验收后 e2e：** 可新增稳定 route 断言锁定 chat/axios 构造 URL，不在验收前修改 e2e。  
**回滚：** runtime/config/useChat 同组回滚，不能只回滚一处造成双 host。

**P5.1 实测状态（2026-07-16）：** runtime TDD 为 3/3，前端全量 unit 为 6 files/19 tests；缺变量 build 在加载 Vite config 时明确非零失败，显式普通值与尾斜杠值均 build 成功（2455 modules）。P5.1 定向 lint 0/0，全量 lint 收敛为批准的 3 errors/0 warnings且仅剩 `ui/badge.tsx`、`utils/index.ts`；前端 `src` localhost 扫描为零，Playwright 清单 7 files/41 tests且全量 41 passed。首次回归因 5173 上遗留的旧 Vite 被 `reuseExistingServer` 复用而页面空白，核实并停止该本项目进程后，由 `webServer.env` 启动的干净服务全绿；未修改既有 e2e。

### Task P5.2：启动环境校验与强密钥

**Create：** `backend/backend/posts/src/config/load-env.ts`、`env.ts`、`env.spec.ts`。  
**Modify：** 后端 `package.json/pnpm-lock.yaml`、`main.ts`、`auth/auth.module.ts`、`auth/jwt.strategy.ts`、`ai/ai.service.ts`、`embedding/embedding.service.ts`、`scripts/seed-games.ts`、`scripts/rebuild-tags.ts`、`scripts/backfill-embeddings.ts`、`scripts/seed-demo-posts.ts`。

```ts
interface RuntimeEnv {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  tokenSecret: string;
  publicBaseUrl: string;
  frontendOrigin: string;
  trustProxy: false | 'loopback';
  deepseek: { apiKey: string; baseUrl: string; model: string };
  openai: { apiKey: string; baseUrl: string; embeddingModel: string };
  rateLimits: Record<'global' | 'login' | 'register' | 'aiChat' | 'aiSearch' | 'upload', { limit: number; ttl: number }>;
}
```

- [ ] 增加直接依赖 `dotenv@^17`；`load-env.ts` 是唯一副作用加载入口，`main.ts` 与维护脚本必须先加载它，再读取 `env.ts` 的纯解析结果，禁止 service 或脚本各自散落 `dotenv/config`。
- [ ] `env.ts` 的纯 parser 接受显式 env record 以便表驱动测试，并提供按能力组合的 `runtime`、`database`、`embedding`、`demoSeed` profile：应用启动使用 `runtime`，完整校验数据库、JWT、DeepSeek、OpenAI、公开 URL、前端 origin、端口和限流变量；`seed-games`、`rebuild-tags`、cleanup 使用 `database`；backfill 使用 `embedding`；seed 数据本体使用 `demoSeed`。维护脚本只校验自身实际能力所需的最小集合。错误只列变量名/规则，不打印值。
- [ ] `validateEnvironment('runtime')` 在 `NestFactory.create` 和任何外部 service 实例化前执行；DATABASE_URL、TOKEN_SECRET、DeepSeek/OpenAI key/base URL 均必填，TOKEN_SECRET ≥32，拒绝包含 `secret/changeme/default/example/demo/test` 的常见弱值。
- [ ] `seed-games`、`rebuild-tags`、文件清理和 `seed:demo` 等非 AI 命令不得因缺少 DeepSeek/OpenAI 变量拒绝运行；`backfill-embeddings`、`seed:demo:full` 的 embedding 阶段及 chat/embedding 诊断命令继续校验各自外部服务 key/base URL。
- [ ] 生产强制 PUBLIC_BASE_URL/FRONTEND_ORIGIN；开发使用明确本地默认；PORT/模型名/限流数值校验正整数范围。
- [ ] `JwtModule`/JwtStrategy 移除 `|| ""`，签发/验证使用同一已校验 secret；AuthModule 导出 JwtModule 供 throttler tracker 验证但不改变 token 协议。
- [ ] `.env` 只在本机设置，不纳入 commit；上述现有脚本改用同一 `load-env.ts`，P5.6/P5.7 新脚本创建时也必须复用，但各脚本调用自己的最小校验 profile，不得无条件调用完整 runtime 校验。

**验证：** 表驱动 Jest 覆盖缺失、弱 secret、非法 URL、非法整数、开发默认、生产完整配置，以及“非 AI 维护脚本无 AI key 可运行、embedding/chat profile 缺对应 key 会失败”；启动子进程确认失败码非零且日志无 secret；完整 env 下 build/start。  
**风险：** 更换 secret 使旧 token 失效，部署文档明确需要重新登录。  
**建议 commit：** `feat(config): validate runtime environment at startup`。

**P5.2 实测状态（2026-07-16）：** 已增加 `dotenv@17.4.2` 直接依赖及 `runtime/database/embedding/demoSeed` 分层 parser，并完成应用、JWT、AI/embedding 与四个既有维护脚本接线。env 表驱动测试 7/7、后端全量 2 suites/8 tests、build 通过；新增 config 文件 lint 0/0，修改的 10 个历史文件逐文件诊断均未高于施工前基线。弱 secret 子进程在 Nest 初始化前非零退出且不回显值；经用户授权，本机 TOKEN_SECRET 已使用兼容的加密随机 API 替换并仅作非值校验，真实 `.env` 后端在 3101 完整启动，`GET /api` 返回 200，验证后进程与端口均已清理。首次兼容性 RNG 调用失败后产生的中间值在任何服务启动前即被安全覆盖；沙箱中的依赖读取 `EPERM` 亦已通过非沙箱同命令复验确认为执行环境差异，不是依赖缺失。

### Task P5.3：后端 `PUBLIC_BASE_URL` 与统一媒体 URL helper

**Create：** `backend/backend/posts/src/config/public-url.ts`、`public-url.spec.ts`。  
**Modify：** `posts/posts.service.ts`、`auth/auth.service.ts`、`comments/comments.service.ts`、`ai/ai.service.ts`、`upload/upload.service.ts`。

- [x] `buildPublicUrl(relativePath, baseUrl)` 只接受站内相对路径，normalize base 尾斜杠并输出 `${base}/uploads/...`；单测覆盖尾斜杠、前导斜杠、空/非法 URL。
- [x] 五个 service 的 avatar、large avatar、thumbnail、original URL 全部复用 helper；删除 `BASE_URL` 和模板中的 localhost，保留 null/空值语义。
- [x] helper 的运行 base 由 P5.2 已校验环境读取；开发 fallback 只存在 config 层，不散回 service。

**验证：** 先写 Jest 失败测试，再最小实现；`pnpm test -- public-url.spec.ts`、`pnpm build`；curl posts/detail/search/login/upload 返回公开 URL。  
**禁止触碰：** 文件磁盘路径、DTO、返回字段名、AI 检索/SSE。  
**回滚：** helper + 五个消费者作为一个 commit 回滚。

**P5.3 实测状态（2026-07-16）：** helper TDD 为 RED 缺模块后 9/9 GREEN；新增 helper/spec lint 0/0，五个历史消费者未增加既有诊断，build 与后端全量 3 suites/17 tests 通过，五个 service 的 localhost/`BASE_URL` 清零。显式测试域名下真实后端启动及 posts/detail/comments/login 只读链路成功；当前 14 帖数据没有头像或帖子图片，因此没有非空媒体 URL 可作接口样本，未为验证而执行上传写入。helper 单测已覆盖 base/path 规范化及不安全路径拒绝，空值分支保持原三元判空。

### Task P5.4：`FRONTEND_ORIGIN`、CORS 与代理边界

**Create：** `backend/backend/posts/src/config/cors-options.ts`、`cors-options.spec.ts`，以纯函数锁定 CORS 选项。  
**Modify：** `backend/backend/posts/src/main.ts`；P5.2 的 config parser。  
**Verify/Test：** `cors-options.spec.ts` 与 `env.spec.ts` 中 CORS/origin/proxy 案例。

- [x] 移除 `NestFactory.create(...,{cors:true})`，创建后 `app.enableCors({ origin: resolvedOrigin, methods, allowedHeaders })`；不启用 cookie credentials。
- [x] `TRUST_PROXY=false` 默认不信任转发头；部署明确设 `loopback` 时才 `app.set('trust proxy','loopback')`，供限流获取真实 IP。
- [x] 开发允许默认 5173，生产缺失/非法 origin 在 P5.2 启动校验失败；恶意相似域名不通过。

**验证：** OPTIONS 从允许 origin 得到 CORS header，其他 origin 不得到；Authorization/Content-Type/multipart 正常；前端主链路可访问。  
**风险：** CORS 配错会阻断全站；本任务可独立回滚，不恢复全开放作为长期方案。  
**建议 commit：** `fix(config): restrict cors to configured frontend origin`。

**P5.4 实测状态（2026-07-16）：** 新增纯 CORS options 契约并完成 RED/GREEN；真实预检发现字符串 `origin` 虽能让浏览器阻断相似恶意域名，但仍返回配置 origin 头，遂按既定“其他 origin 不得到头”契约改为精确 callback 并补回归。最终允许 origin 返回 204、精确 origin、所需 methods/headers 且无 credentials；相似 origin 返回 404 且无 CORS origin 头。env 覆盖 origin 规范化与 `loopback`，后端全量 4 suites/22 tests、build 通过；新增文件 lint 0/0，`main.ts` 诊断由基线 13/1 降至 11/1。

### Task P5.5：`@nestjs/throttler` 与用户/IP tracker

**Create：**
- `backend/backend/posts/src/security/app-throttler.guard.ts`
- `backend/backend/posts/src/security/app-throttler.guard.spec.ts`
- `backend/backend/posts/src/security/rate-limit-identity.decorator.ts`
- `backend/backend/posts/src/security/rate-limit.config.ts`
- `backend/backend/posts/src/security/rate-limit.config.spec.ts`

**Modify：** 后端 `package.json/pnpm-lock.yaml`、`app.module.ts`、`auth/auth.module.ts`、`auth/auth.controller.ts`、`users/users.controller.ts`、`ai/ai.controller.ts`、`upload/upload.controller.ts`；前端 `src/hooks/useChatBot.ts`（仅 429 反馈接缝）。

- [x] 增加官方 `@nestjs/throttler@^6.5.0`；`ThrottlerModule.forRootAsync` 使用默认全局 60/60s，ttl 单位固定毫秒。
- [x] `APP_GUARD` 使用 `AppThrottlerGuard`；默认 tracker 始终生成 `ip:<req.ip>`。仅在 chat/search/两类 upload 上用显式 metadata 标记 `user-or-ip`，guard 才验证 Bearer token 并为有效 payload 生成 `user:<sub>`，缺失/无效回退 IP；不得按 URL 字符串推断身份、设置 `req.user` 或替代 JwtAuthGuard。login/register/refresh 即使携带有效 token 也始终使用 IP 配额。
- [x] 明确执行顺序：全局 throttler 先执行，路由 `JwtAuthGuard` 后执行；无效 token 可能先消耗 IP 配额，最终授权仍返回 401。
- [x] 用 v6 `@Throttle({ default: { limit, ttl } })` 分别标注 login/register/chat/search/upload 两接口；refresh 只受全局默认。
- [x] guard 抛统一 429 `{ statusCode:429, code:'RATE_LIMITED', message:'请求过于频繁，请稍后再试' }`；不得向已经开始写入的 SSE 流中插入 JSON。限流发生在 controller/SSE header 前。
- [x] axios 请求继续复用 P4 `api-error` 映射；Chat 的 `useChat` 不经 axios，使用本地已核实存在的 `onResponse(response)` 在 `response.ok` 检查前识别 429，并通过既有 `feedback.error` 固定 id 去重显示同一文案；不读取/改写成功流，不改 Authorization、SSE parts、annotation 或会话 store。
- [x] 测试环境通过显式高限值覆盖默认；guard/config 单测用低值验证 tracker、TTL、非法 env 和消息，不提供生产关闭开关。

**验证：** 先写失败单测；`pnpm test -- rate-limit.config.spec.ts app-throttler.guard.spec.ts`；人工 curl 第 N+1 次 429；login/register 携带 token 仍共用 IP 桶，有效用户与另一用户在 chat/search/upload 的配额分离；无 token chat 仍 401；限额内 chat `x-vercel-ai-data-stream:v1`、`0:/8:/d:` 完整；前端 Chat 429 只出现一次统一 toast 且已有消息不清空。  
**人工通过后 e2e：** 增加后端限流集成用例；不改现有断言上限来掩盖 429。  
**回滚：** package/module/guard/decorator一起回滚，不能只删 decorator 留全局误限流。  
**建议 commit：** `feat(security): rate limit public and AI endpoints`。

**P5.5 实测状态（2026-07-16）：** 已按本地 v6 公共扩展点实现，不复制官方 storage/TTL 算法；后端限流定向 12/12、全量 6 suites/34 tests，前端 Chat 429 2/2、全量 7 files/21 unit、build 2455 modules、全量 lint 保持批准基线 3/0，Playwright 7 files/41 passed。低限额实测确认 login 即使带 token 仍为同一 IP 桶，search/upload 的有效用户分桶及无效/缺失回退成立，匿名 Chat 仍 401；限额内 Chat 保留 201、data-stream v1、text 与 finish parts。所有新增后端文件 lint 0/0；修改历史文件未增加诊断并有净减少。内存 storage 的单进程边界留 P5.8 部署文档明确。

### Task P5.6：安全文件清理 dry-run/`--apply`

**Create：**
- `backend/backend/posts/src/maintenance/upload-cleanup.ts`
- `backend/backend/posts/src/maintenance/upload-cleanup.spec.ts`
- `backend/backend/posts/src/scripts/cleanup-uploads.ts`

**Modify：** 后端 `package.json` 增加 `maintenance:uploads`。

**CLI：** `pnpm maintenance:uploads -- [--apply] [--protect-hours=24] [--backup-confirmed]`。默认 dry-run；`--apply` 必须同时有 `--backup-confirmed`，保护期不得为负。

- [x] planner 从 Avatar/File DB filename 构造精确派生组：avatar `-small/-large.jpg`；帖子原图 `.jpg` + `resized/-thumbnail.jpg`。
- [x] 扫描只从 `process.cwd()/uploads` 开始；`resolve` 后必须仍在 root，`lstat` 遇 symlink 只报告，不跟随。
- [x] `.gitignore`、各级 `.gitkeep` 等仓库控制文件必须显式忽略；不符合已知 avatar/post 派生命名的文件只报告为 unknown，不参与模糊删除。
- [x] 无 DB 引用的磁盘组仅在全部候选 mtime 超过保护期时删除；`postId=null` File 用现存派生文件 mtime 作为上传年龄代理。
- [x] DB 有记录但磁盘部分/全部缺失时只报告；因为 File/Avatar 无 createdAt，不能安全判龄，不删 DB 记录。
- [x] apply 对每文件单独捕获并继续；任何失败最终 exit 1；成功的孤立 `postId=null` 组在文件删除成功后才删对应 File 记录。
- [x] 输出分类计数、相对路径和原因；日志不输出用户密码/key。备份命令和恢复位置由 P5.8 固定。

**TDD：** 单测临时目录覆盖 dry-run、apply 双确认、24h 边界、负参数、路径逃逸、symlink、成对派生、缺文件、单文件失败继续/非零。  
**验证：** 先在 uploads/DB 副本执行 dry-run，再核对真实环境 dry-run；只有用户审核报告并确认备份后执行 apply 演练。  
**回滚：** 代码可回滚，数据只能从备份恢复；因此 apply 是独立人工门禁。  
**建议 commit：** `feat(maintenance): add guarded upload cleanup workflow`。

**P5.6 实测状态（2026-07-16）：** planner/executor 6/6、build、新文件 lint 0/0。真实默认 dry-run exit 0，报告 control 4、referenced 2、orphan 40，其余分类 0；执行前后 uploads 全文件 SHA-256/mtime/size 与 DB Avatar/File 计数 1/2 均一致。未执行 apply，候选文件与孤立 File 记录均仍保留；`--apply --backup-confirmed` 必须待 P5.8 固定备份/恢复命令并获得用户单独授权。

**P5.6 评审修复（2026-07-16）：** 复验发现 `File.filename` 无唯一约束，而 planner 曾用 Map 保存单条记录；同名“已引用+孤立”会被后写覆盖并可能误删。现已按 filename 聚合全部 File：任一记录有关联帖子则整组保留；全部孤立时仅在文件组完整删除后逐条删除该组全部记录。新增混合引用和多孤立同名 TDD，修复前 2 项稳定失败，修复后 cleanup 8/8、后端全量 9 suites/50 tests、build、定向 lint 0/0。真实 dry-run 逐项清单见 `docs/qa/phase4/p5-cleanup-dry-run.md`：20 组/40 文件候选、1 组/2 文件引用保留，当前 DB 无重复 filename；46 个 uploads 文件前后 SHA-256/mtime/size 差异 0，Avatar/File 保持 1/2。仍未执行 apply。

**P5.6 备份 A（2026-07-16，apply 仍待授权）：** 在 3000/5173 无监听的同一停写窗口，将 PostgreSQL custom dump 与 uploads tar.gz 写入仓库外 `C:\Users\15593\Black-box-backups\backup-A-20260716-171200`。数据库 dump 133256 bytes、SHA-256 `6BC32045A57F7BCA7B94E73D852BF3E32FA4457A6B85B99EFC614D1CB7E1022C`，`pg_restore --list` 98 条；uploads 归档 645428 bytes、SHA-256 `E768D1EBB57C5248D581348145E098AA704DDC18BE96F8BB8EE879B0D31CD7CA`，`tar -tzf` 50 条。完成后独立重算结果一致，证据见 `docs/qa/phase4/p5-backup-a.md`。未配置隔离恢复目标，未做副本 restore；未执行 cleanup apply。

**P5.6 apply 状态（2026-07-16，已人工验收）：** 经用户对唯一命令明确授权后，`pnpm maintenance:uploads -- --apply --backup-confirmed --protect-hours=24` 仅执行一次并退出 0，无失败项。删除 20 组/40 个孤儿文件及孤立 File 记录 4、5；Post 保持 14、Avatar 保持 1、File 变为 0，引用头像 large/small 与 4 个控制文件保留。执行后 dry-run 为 orphan 0、referenced 2、control 4，其余 0；uploads 恰余 6 文件。备份 A 哈希复核不变，证据见 `docs/qa/phase4/p5-cleanup-apply.md`。该结果已获人工确认，随后备份 B 与双轮 seed/full 分别按独立门禁完成。

### Task P5.7：35 帖幂等演示 seed 与 embedding 回填

**Create：**
- `backend/backend/posts/src/scripts/demo-seed-manifest.ts`
- `backend/backend/posts/src/scripts/demo-seed-manifest.spec.ts`
- `backend/backend/posts/src/scripts/demo-seed-files.ts`
- `backend/backend/posts/src/scripts/demo-seed-files.spec.ts`
- `backend/backend/posts/src/scripts/fixtures/phase4-demo-images/`：10 张独立生成、可提交的 16:9 JPEG，不复制 prototype 假数据。

**Modify：** `seed-demo-posts.ts`、`backfill-embeddings.ts`（只在命令/复用必要时）、后端 `package.json`。

- [x] manifest 固定 35 帖：5 游戏各 7 篇，5 内容类型交叉覆盖；保留三期 14 个高质量标题并新增 21 个，title/brief/content/game/tag/author/viewCount 全部显式。
- [x] 复用两名三期演示用户并增加 3 名明确演示作者；密码从 `DEMO_USER_PASSWORD` 读取并 bcrypt，不在源码写部署 secret。
- [x] 固定评论树、点赞关系和 viewCount；Comment 不写时间；10 帖关联 deterministic 图片 fixture，sharp 生成原图/thumbnail 并创建 File。
- [x] game/tag 按名字查 id；manifest 标题和 fixture originalname 是唯一清理键。只删除“manifest 标题 + manifest 作者”命中的旧演示帖、评论/点赞和 manifest File，禁止按用户删全部帖、禁止 `deleteMany({})`。
- [x] 每次复跑先定向清旧 manifest 数据再重建，最终用户/帖子/评论/点赞/文件数量稳定。Prisma transaction 只保证数据库写入原子性，不覆盖图片文件系统操作；脚本必须记录本次新建的每个图片路径。
- [x] 顺序固定为：先校验 manifest/关联并生成或复用确定性图片，记录本次实际新建路径；再开启 interactive Prisma transaction 定向清旧并重建数据库。已有 fixture 输出只复用、不覆盖，也绝不加入本次补偿集合。
- [x] transaction 或其前后任一步失败时，数据库由 Prisma 回滚；catch/finally 仅补偿删除本次执行实际创建的图片。任一补偿删除失败必须逐项报告残留路径并以非零状态退出，不得声称“完全回滚”；不得删除运行前已存在文件。
- [x] package scripts 固定：`seed:demo`、`embedding:backfill`、`seed:demo:full`；full 顺序为 seed 后 `backfill-embeddings --all`，模型仍 `text-embedding-3-small`。backfill 允许逐帖继续，但只要任一 embedding 失败，命令最终必须非零退出，避免 full 假成功。

**TDD：** manifest 单测检查 35、游戏/类型覆盖、标题唯一、引用 key 有效、评论 parent 只指顶层、likes 不重复、无评论时间字段；文件补偿测试覆盖事务失败后只删除本次新建图片、保留运行前文件，以及补偿失败时非零退出并报告残留路径。  
**验证：** 在演示 DB 连跑 `pnpm seed:demo:full` 两次；两次计数一致、35 帖非空正文、关系正确、图片存在、所有 titleEmbedding 非 null；Home/Search/Chat/PostDetail 人工抽验。  
**风险/回滚：** 只按 manifest 定向删除；fixture/manifest/seed 一组回滚，不触碰非演示数据。  
**建议 commit：** `feat(seed): expand reusable phase four demo dataset`。

**P5.7 实测状态（2026-07-17，双轮数据与页面门禁均通过）：** 备份 B 闭环并获用户独立授权后，在 `yue` 演示库连续执行两次 `pnpm seed:demo:full`，两轮均退出 0。第一轮将三期 14 帖替换为 35 帖，第二轮定向替换第一轮 35 帖与 10 条 File；两轮最终均为 35 帖、13 评论、31 点赞关系、10 条帖子图片 File，未累计重复。两轮各 35 个 `text-embedding-3-small` 调用全部成功，最终 35/35 embedding 非 null 且均为 1536 维；5 游戏各 7 帖且每游戏覆盖五种内容类型，正文为空 0、重复标题 0、File 全部关联且 filename 重复 0。10 张 1600×900 图片在两轮间哈希不变；最终 cleanup dry-run 为 orphan 0、referenced 22、control 4。备份 B 哈希未变。Home/PostDetail 首轮通过，Search/Chat 经 P5.9 有限失败修复后完成真实人工复验；证据见 `docs/qa/phase4/p5-seed-full.md` 与 `p5-ai-timeouts.md`。

### Task P5.8：env 示例、部署/维护文档与 P5 集成门禁

**Create：**
- `backend/backend/posts/.env.example`
- `docs/operations/phase4-deployment.md`
- `docs/operations/phase4-maintenance.md`

**Modify：** `frontend/black_box/.env.example`、04 §10 实现状态、本计划 P5 状态。

- [x] env 示例列出全部运行变量和默认/必填规则，仅占位值；给出生成 ≥32 字节随机 TOKEN_SECRET 的命令，不出现真实 key。
- [x] deployment 写清前端 build env、后端启动校验、CORS、反代 `TRUST_PROXY`、secret 更换导致重新登录、限流默认与测试覆盖。
- [x] deployment 明确默认 Throttler storage 是单进程内存：限额按单进程/单实例计算，多实例之间不共享计数；本期不宣称集群级全局配额。未来多实例若要求共享限额，必须接入 Redis 等共享 storage，登记为后续工程债。
- [x] maintenance 写清 DB/uploads 备份、cleanup dry-run 审核、`--apply --backup-confirmed`、恢复、seed 仅演示环境、embedding 外部成本。
- [x] 集成验证业务源码无 localhost，SSE 正常，429/401 顺序正确，弱密钥失败，cleanup dry-run 不改磁盘/DB，seed 两次幂等。后端只允许 `src/config/env.ts` 保存已确认的 development fallback；前端只允许 `playwright.config.ts` 的测试 webServer 默认，以及 `.env.example`/文档示例。
- [x] P5 每个功能人工通过后再补其稳定 e2e；纯逻辑 Jest 可在实现前写。

**静态验证：** `rg -n 'localhost(:3000|:5173)?' frontend/black_box/src backend/backend/posts/src -g '!*.spec.ts' -g '!*.test.ts'`；前端业务源码必须零命中，后端运行源码唯一允许命中是 `backend/backend/posts/src/config/env.ts` 中 development fallback。co-located 单测可保留 localhost 作为 development 期望样例，但不计作运行时 fallback。前端运行配置的其他允许命中仅限 `playwright.config.ts` 的测试 webServer 默认，以及 `.env.example` 和文档；任何 service/controller/api/hook/page 命中均失败。  
**建议 commit 边界：** P5 保持 6 个可独立 review 的 commit（前端 URL、后端 URL+CORS、限流、env 校验、cleanup、seed+文档），不得合并为一个安全巨改。  
**批次完成条件：** 运行配置、安全、维护和演示数据各自有测试/人工证据，成功 API/SSE/数据库 schema 不变。

**P5.8 实测状态（2026-07-17，工程、维护与页面集成门禁完成）：** 已新增前后端 env 示例及 deployment/maintenance 文档，闭合显式前端 build/CI env、Playwright 固定测试值、运行时与维护 profile、CORS/loopback proxy、单实例内存限流、强 secret、备份恢复、cleanup 与 seed/embedding 成本口径。静态门禁因 co-located `env.spec.ts` 合法使用 localhost 期望样例，订正为排除 `*.spec.ts/*.test.ts` 后扫描；前端业务源码零命中，后端仅 `src/config/env.ts` 两处 development fallback。非写入集成回归、真实 cleanup、备份 A/B 与双轮 `seed:demo:full` 均已闭环；最终 35 帖、13 评论、31 点赞、10 图、35/35 embedding，第二轮无累计，cleanup dry-run orphan 0。Home/PostDetail/Search/Chat 页面串验均通过，P5.9 有限失败契约与 P5.10 标准生产启动另有聚焦证据。真实写入证据见 `docs/qa/phase4/p5-cleanup-apply.md`、`p5-backup-b.md`、`p5-seed-full.md`、`p5-ai-timeouts.md` 与 `p5-production-start.md`。

**P5 差分 lint 门禁（施工前基线）：** 前端全量为已批准的 `4 errors / 0 warnings`；P5.1 必须修改命中历史错误的 `src/api/config.ts`，因此该文件随任务收口到 0/0，P5 完成后前端全量不得高于 `3 errors / 0 warnings`，剩余只允许来自未触碰的 `ui/badge.tsx` 与 `utils/index.ts`。后端现有只读命令 `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"` 基线为 `1268 errors / 7 warnings`，主要是历史 Prettier，且 package 的 `pnpm lint` 会自动 `--fix`；P5 不做全仓格式化。所有新增后端 TS 必须 0/0；修改的历史文件采用逐文件施工前后对比，不得新增诊断。P6 仍使用只读 eslint 命令复核，不运行会改工作树的 `pnpm lint`。

### Task P5.9：AI 外部链路有限失败与前端错误收口

**触发原因：** P5 真实页面串验中，Search 超过 50 秒仍停留在“搜索中”，Chat 超过 30 秒仍停留在“正在生成回答”。直接诊断确认请求已到后端，Search/Chat 共享的 embedding 中转曾长时间无结果；恢复后的最小实测 embedding 仍约 11.8 秒，而 DeepSeek 首字节约 0.4 秒。现有 LangChain/OpenAI 客户端未设置有限超时并保留自动重试，Search 将后端 `code:1` 当空结果，Chat 在响应提交后仍尝试改 HTTP 状态，Axios 无 response 时还会读取 `response.status` 产生二次异常。

**Modify：** `src/config/env.ts`/spec、`src/embedding/embedding.service.ts`、`src/ai/ai.service.ts`、`src/ai/ai.controller.ts`、后端 `.env.example`；前端 `src/api/config.ts`、`src/api/search.ts`、`src/store/search.ts`、`src/hooks/useChatBot.ts`、`src/lib/api-error.ts`。  
**Create：** 后端有限 deadline helper/spec 与 controller/service 聚焦测试；前端 timeout fetch、Search/API/Axios 错误路径聚焦单测。具体测试文件可按现有 co-located 结构拆分，但不得修改 7 个既有 Playwright spec 或新增 e2e。

- [x] 在 runtime env 增加 `AI_EMBEDDING_TIMEOUT_MS=20000`、`AI_CHAT_TIMEOUT_MS=30000`，沿用正整数解析；`.env.example` 与 deployment 文档只写规则/默认，不写真实 key。
- [x] Embedding 客户端与外层 deadline 同时使用 20 秒上限并设 `maxRetries:0`；避免底层库忽略/改变 timeout 时重新出现无限等待。
- [x] Chat 引用检索失败继续降级为空引用，不阻塞普通聊天；DeepSeek 配置 30 秒 timeout、`maxRetries:0`，流调用使用 AbortSignal 限制总时长。
- [x] Chat controller 在响应尚未提交时把模型超时映射为 504；data stream 已开始后写 AI SDK v1 `3:${JSON.stringify(message)}\n` 并 `end()`，不得在已提交响应上再调用 `status()`；不泄露供应商错误。
- [x] Search axios 请求使用 25 秒 timeout；后端 `code !== 0` 必须进入现有非持久化 ErrorState，不能显示 EmptyState。成功结果、排序、history/category/debounce 语义不变。
- [x] `useChat` 使用保持调用方 AbortSignal 的 custom fetch，并以 55 秒客户端总上限兜底，确保 loading 最终结束；JWT header、SSE `0:/8:/d:`、annotation、单会话 store 不变。
- [x] axios interceptor 仅在 `response?.status === 401` 且 config 存在时进入 refresh；无响应网络错误和 timeout 原样 reject，由 `getApiErrorMessage` 分别映射稳定文案。
- [x] CORS 继续只接受配置的精确 `FRONTEND_ORIGIN`；不因 `127.0.0.1` 观察扩大允许范围。

**TDD 与验证：** 先以 fake timers/never-resolving promise 写失败测试，锁定 deadline、SSE 已提交/未提交错误、Search `code:1`、Axios 无 response、客户端 fetch abort 与超时文案，再最小实现。运行后端定向与全量 Jest、build、修改文件差分 lint；前端定向与全量 Vitest、显式 `VITE_API_BASE_URL` build、批准 lint 3/0 与既有 7 files/41 Playwright。最后只做一次真实 Search/Chat 串验：成功时仍得到语义结果/流式引用；人为或测试替身超时时在上限内退出 loading 并显示错误。无视觉变化不重拍 28 张截图。

**人工门禁：** 用户确认 Search/Chat 成功链路和有限失败路径后，P5 才可标整批通过并申请进入 P6；确认前不新增 P5 e2e、不进入 P6。  
**回滚：** P5.9 可整体回滚到此前外部 SDK 行为，不触及 seed、cleanup、数据库、限流或 URL/CORS；不得只回滚前端兜底而保留后端无限等待。  
**实现门禁状态（2026-07-17，已完成）：** P5.9 已按 TDD 实施。后端 13 suites/62 tests、前端 11 files/27 unit、build、触及文件 lint 0/0、批准全量 lint 3/0 与 7 files/41 Playwright 均通过。真实 Search 在供应商 embedding 仍慢时于 20.03 秒有限返回 `code=1`；真实 Chat 的引用检索同样 timeout 后成功降级，随后 DeepSeek 流式完成，HTTP 201、data-stream v1、`0:/d:` 完整，总耗时 37.54 秒。确定性测试覆盖 504、已提交 `3:` 和 55 秒客户端 abort。证据见 `docs/qa/phase4/p5-ai-timeouts.md`；人工结果见下一条。

**人工验收状态（2026-07-17，已通过）：** 用户真实复验确认 Search 慢响应最终进入 ErrorState 且可重试，Chat 在引用检索 timeout 后约 23.6 秒开始流式、约 43.6 秒完成并恢复输入，无引用、无残留 loading、无控制台错误或横向溢出；35 帖、13 评论、31 点赞、10 File 不变。P5.9 已通过人工门禁；该时点进入 P6 前仅剩的 P5.10 `start:prod` 产物路径收口现已完成。

### Task P5.10：修正生产启动产物路径

**事实：** `nest-cli.json` 使用 `sourceRoot: src`，当前 `nest build` 产物为 `dist/src/main.js`；package 的 `start:prod` 仍指向不存在的 `dist/main`，真实执行得到 `MODULE_NOT_FOUND`。  
**Modify：** 仅 `backend/backend/posts/package.json` 的 `start:prod`。  
**Create：** `src/config/production-start.spec.ts`，读取真实 package script，并在 build 后断言入口文件存在。

- [x] 先写 RED 测试，证明脚本目标与真实产物不一致。
- [x] 将 `start:prod` 最小修正为 `node dist/src/main.js`；不改 Nest 输出目录、依赖、lockfile或应用代码。
- [x] 运行 build、聚焦/全量 Jest、触及文件 lint；在隔离端口启动 `pnpm start:prod` 并请求 `GET /api`，不得触碰当前 3000 进程。
- [x] 停止隔离实例、确认端口无残留；验证本 task 仅修改 package script、未修改既有 lockfile，并使 `git diff --check` 通过。

**完成条件：** `pnpm start:prod` 从标准 package 命令启动真实编译产物并可提供 `/api`；P5.9 已人工通过且 P5.1～P5.10 全部闭环后，P5 才可标整批完成并申请进入 P6。  
**回滚：** 仅回滚 package script 与聚焦契约测试，不改变 build 产物或运行时行为。  
**状态（2026-07-17，已完成）：** 聚焦契约测试先稳定复现 `node dist/main` 与真实产物不一致，再将脚本最小修正为 `node dist/src/main.js` 后转绿。后端 build 通过；聚焦测试通过且新增测试 lint 0/0；全量 Jest 为 14 suites/63 tests。隔离端口 3106 通过标准 `pnpm start:prod` 启动，日志确认执行真实产物，`GET /api` 返回 200/`Hello World!`；仅停止经命令行核对的隔离 PID。测试前 3000 已无监听且未被本 task 终止，结束后 3000/3106/5173 均无监听。本 task 未运行 install、未修改既有 lockfile；`git diff --check` 通过（仅既存 CRLF 提示）。证据见 `docs/qa/phase4/p5-production-start.md`。P5.1～P5.10 已全部闭环，P5 整批完成；停止在 P6 入口等待用户指令。

---

## P6：全量回归、多视口截图与人工串验（5 tasks）

**目标：** 用自动化、静态审计、四视口截图和真实主链路证明第四期整体成立，回填实现偏差后交由用户最终验收。

**非目标：** 不在 P6 顺手开发、放宽断言、删测试、改 seed 口径或新增范围；发现失败返回责任批次修复。

**前置依赖：** P1～P5 均完成各自人工门禁；P0 基线和静态命令可复跑。

**P5 前置状态（2026-07-17）：** 用户已确认 P5.1～P5.10 整批人工验收通过；P6 方案可开始，但未经本方案确认不执行。

**P6 执行纪律（方案待确认）：** P6 只采集回归、截图、静态、安全、部署、数据终态和人工串验证据。任一命令失败、截图异常、真实链路偏离或静态命中超出口径时，立即停止该检查点，在报告中标明责任批次并请求确认；不得在 P6 顺手改业务源码、测试断言、依赖、schema/migration、seed 口径或原型。真实注册/发帖/评论/上传链路使用一次性数据库与 uploads 副本，不污染已验收的 `yue` 终态；P5 已完成的 cleanup apply 与双轮 seed/full 不在 P6 对真实库重复执行，只复核其证据并运行只读统计/dry-run。

**lint 门禁（2026-07-17，已批准）：** P6 沿用此前逐批批准的差分门禁：P6 新增/修改文件 lint 必须 `0 errors / 0 warnings`；前端全量不得高于 `3 errors / 0 warnings`；后端全量不得高于 P5 终态基线。报告必须表述为“历史 lint 债未增加”，不得声称“全仓 lint 通过”。全仓 lint 清债登记为独立工程任务，不影响第四期功能与验收结论。

**Create：**
- `docs/qa/phase4/p6-regression-report.md`
- `docs/qa/phase4/screenshots/p6/...`
- `docs/qa/phase4/screenshots/p6-states/...`
- `docs/qa/phase4/screenshots/comparison.html`：P0/P6 人工并排索引，不设像素阈值断言。
- `frontend/black_box/scripts/capture-phase4-states.mjs`：仅 QA 的 14 状态 × 2 视口稳定捕获，不注册产品路由。
- `frontend/black_box/scripts/generate-phase4-comparison.mjs`：生成静态人工索引，不做像素比较。
- `backend/backend/posts/src/scripts/audit-phase4-state.ts`：复用现有维护脚本体系的只读数据终态审计，不进入应用启动路径、不写数据库。

**Modify：** 04 设计实现状态、本实施计划、`AGENTS.md` 仅在最终用户确认且真实状态需要同步时修改。

### Task P6.1：自动化构建与测试总门禁

- [ ] 前端以仅作用于 build 子进程的显式 `VITE_API_BASE_URL` 运行 `pnpm build`，清除该变量后再运行 `pnpm lint`、`pnpm test:unit`、`pnpm exec playwright test --list`、`pnpm e2e`；现有 7 文件/41 条 Playwright 必须全部存在并通过，P4/P5 已增加的 11 文件/27 条 Vitest 也必须通过。
- [ ] 后端运行 `pnpm build`、`pnpm test`、`pnpm test:e2e`。
- [ ] 后端 package 的 `pnpm lint` 带 `--fix`，P6 只读门禁改用 `pnpm exec eslint "{src,apps,libs,test}/**/*.ts"`；不得让验收命令静默改代码。
- [ ] 记录每条命令、版本、耗时、pass/fail 和失败归属；不得删测试、改 mock 掩盖错误或放宽断言。

**完成条件：** build、unit、后端 test/e2e 与 Playwright 全部退出 0，测试列表不丢既有用例；lint 按上方已批准差分口径验收，不得模糊混用“全仓零债”与“差分不增加”。  
**风险/回滚：** 失败不在 P6 临时修，返回对应任务按 TDD 修复后重跑整套。

**P6.1 首轮状态（2026-07-17，暂停）：** 非沙箱复验确认前端 build 成功（2456 modules），清除 build 专用环境变量后 Vitest 11 files/27 tests 全过；后端 build 与 Jest 14 suites/63 tests 全过。后端现有 `pnpm test:e2e -- --runInBand` 在测试收集阶段失败：`src/users/users.service.ts` 唯一一处 `src/prisma/prisma.service` 绝对导入无法由当前无 `moduleNameMapper` 的 `test/jest-e2e.json` 解析。该问题不是沙箱波动，P6 按纪律未修改源码或测试，未继续 Playwright、lint、截图及后续任务，等待用户确认回到测试基础设施责任范围修复。

**P6.1 最终状态（2026-07-17，已通过）：** 用户授权仅在 `test/jest-e2e.json` 增加 `^src/(.*)$ -> <rootDir>/../src/$1`，不改业务源码或断言；既有收集失败为 RED，修复后 e2e 1/1 GREEN。全套复验：前端 build 2456、Vitest 11 files/27、Playwright 7 files/41 tests 且 41 passed；后端 build、Jest 14 suites/63、e2e 1 passed。e2e 有 Jest open-handle warning 并延迟退出，但最终 exit 0，登记为测试卫生债。差分 lint：前端精确保持 3/0；后端 881/7，低于 P5 1268/7；P6 新增审计脚本 0/0。历史债未增加，不表述为全仓 lint 通过。

### Task P6.2：主业务链路真实串验

- [x] 在一次性数据库/uploads 副本启动真实 production backend 与 frontend preview，执行登录/注册 → Home tag/game/无限滚动/快速切换 → Search `q`/语义结果或明确有限失败 → PostDetail Markdown/点赞/评论/回复/删除 Dialog → Compose 编辑/预览/图片/发帖 → Chat 流式/引用或检索超时降级/切走保持 → Mine 头像/退出。
- [x] 确认 rag/git/avatar AI 仍不存在；viewCount 只读不自增；评论无伪时间；Chat 刷新可丢且无多会话。
- [x] 同时验证 429 文案、401 guard、token refresh、媒体 URL、CORS 和 SSE，不用 mock 替代这次真实串验。

**完成条件：** 每个节点在报告中有结果和证据；任何失败有明确责任任务。  
**人工门禁：** 用户亲自走同一清单并确认，代理自测不能替代。

**执行状态（2026-07-17，阻塞）：** 隔离 production backend/preview 与副本数据库/uploads 启动成功；真实注册登录、Home 游戏筛选/快速切换/分页、Search `q`、401 后 token refresh 与 Search 有限结果/失败均已获得证据。PostDetail 发评论与回复成功，但本人评论没有删除入口：真实登录响应把 `user.id` 返回为字符串，评论接口作者 id 为数字，`CommentItem` 的严格相等判定为 false。现有 `social.spec.ts` mock 使用数字 user id，未覆盖该跨层类型差异。按 P6“发现真实功能缺口即暂停”的规则，P6.2 checkbox 保持未勾选，P6.3～P6.5 不开始；等待用户确认返回业务责任批次做最小修复后，从 P6.2 重跑。

**修复状态（2026-07-17，复验中）：** 用户授权返回责任批次修复。RED 测试分别锁定后端响应、新登录写入与旧 persist 恢复的字符串 id；GREEN 将登录响应统一为数字，同时保留 JWT `sub` 字符串，并在 `useUserStore` 登录与 persist merge 边界归一化旧数字字符串。定向测试已通过，待全量回归和 P6.2 原链路复验后再决定 checkbox。

**P6.2 最终状态（2026-07-17，已通过）：** 修复后完整真实 smoke exit 0。Search 2.806s success，Chat 4.215s answer/1 citation/SSE `0:/8:/d:`；评论删除 Dialog、Compose Markdown/上传/发帖、Mine 头像/退出、Home 筛选/分页、401 refresh、429、精确 CORS、旧 AI 接口 404 与只读 viewCount 均通过。副本数据库/uploads 已销毁，真实 `yue` 前后只读终态一致。

### Task P6.3：四视口截图回归

- [x] 复用 P0 script 生成 7 页 × 4 视口的 28 张 P6 默认态，不改 manifest 页面键和 viewport。
- [x] 在 1440 与 390 各补 14 个稳定状态：Home loading/empty；Search loading/empty/error；PostDetail long-markdown/delete-dialog；Compose preview/uploading；Chat typing/citations；Mine drawer；Login register/error，共 28 张补充截图，输出至独立 `p6-states` 目录。
- [x] 生成 comparison.html 并排查看 P0/P6；动态 AI 用固定完成消息/annotation，动画禁用。
- [x] 人工检查 248/80/底 tab、safe-area、无重叠、长文本、按钮稳定尺寸、focus、disabled、reduced-motion、Dialog/Drawer/portal。

**完成条件：** 56 张 P6 截图齐全；审查结论写入报告。不得用 Playwright `toHaveScreenshot` 或像素阈值充当产品判断。

**执行状态（2026-07-17，已通过）：** 默认态与补充态均为 `28/28`，尺寸清单 `BAD_DIMENSIONS=0`，comparison 索引已生成。代表性人工抽查覆盖四档 App Shell、移动固定评论栏、长 Markdown、Dialog/Drawer、Compose preview/uploading、Chat citations、loading/error；未发现页面级横向溢出、双滚动、遮挡、底栏冲突或 portal 层级问题。宽表格/代码块保留正文局部横滚，不扩张页面。

**最终评审修正（2026-07-17）：** 用户复核发现 390px Compose preview 实际被 `min-w-lg` 表格通过 grid intrinsic minimum 撑到页面 `scrollWidth=606`，推翻了首轮“仅局部滚动”的判断。经确认后，Compose 预览直接 grid item 增加 `min-w-0`；复验页面为 `390/390`，预览项 282px，table scroller 为 `242/512`，即页面不溢出、仅表格局部横滚。补充态 28/28 已重拍，定向 lint 0/0、build 2456、全量 lint 3/0、Playwright 41/41。P6.3 技术阻塞关闭，但第四期仍等待用户最终确认。

### Task P6.4：静态、安全与运维审计

- [x] 复跑 P0 静态命令：Geist/旧暗色值、页面直接色阶、柔阴影、非语义圆角、页面渐变、inline style、confirm/alert、localhost、class active/liked、私有重复组件。
- [x] 允许项必须逐条说明：HEX/cover gradient 仅在 App.css token，rounded-full 仅 pill/avatar，localhost 仅 env 示例/文档；业务 src 无例外。
- [x] 执行 Markdown/XSS 样例、弱密钥启动失败、非法 URL/CORS、限流用户/IP、SSE 限额内、cleanup 真实库 dry-run、35 帖/13 评论/31 点赞/10 File/35 个 1536 维 3-small 向量只读检查；cleanup apply、双轮 seed/full 与备份恢复只复核 P5 已验收证据，不重复真实写入或外部调用。
- [x] 比较 P0/P6 Git 路径，确认没有修改 prototype、schema/migration 或非目标页面/路由。

**完成条件：** 静态命中达到约定零值/允许值，安全与维护检查全部有命令和输出摘要。

**执行状态（2026-07-17，已通过）：** 安全/运维/数据/备份与 Git 路径证据均已闭合：聚焦测试前端 19、后端 33、生产入口 1 均通过；真实库 dry-run 为 orphan 0/referenced 22/control 4，终态 35/13/31/10/1、五游戏各 7、35/35×1536；备份 A/B 哈希及归档目录一致。首轮静态扫描发现未引用 `src/assets/react.svg` 含直接 HEX，按纪律暂停并获用户授权后仅删除该旧资产；复扫 HEX 仅 `App.css` 56 处，其他清零/允许项均符合口径。删除后 build 2456、P6 文件 lint 0/0、全量 lint 3/0、Playwright 41/41。localhost 最终允许项按 P5 已确认契约为集中 `config/env.ts` 的唯一开发默认及其测试，不是散落业务 URL。

### Task P6.5：文档回填与最终人工验收门禁

- [x] 对照 04 第十四章逐条链接到本计划任务和 P6 证据；任何未通过项保持 unchecked，不能用文字解释替代。
- [x] 04 回填真实文件、版本、偏差与验收结果；全部通过后状态改为“已实现、已人工验收通过”。
- [x] 确认 `AGENTS.md` 阶段、范围和真实实现状态一致；只有用户确认且实施事实发生变化时才修改。
- [x] 用户最终确认后关闭第四期规划；不自动进入第五期或额外功能。

**建议 commit 边界：** `test(phase4): record full regression and visual review` 与 `docs(phase4): finalize implementation status` 分开；只暂存 P6 QA/文档，任何修复回原责任 commit。  
**批次完成条件：** 第十四章全勾选、自动化全绿、56 张截图人工通过、主链路用户确认、文档/AGENTS/代码事实一致。

**执行状态（2026-07-17，已完成并人工验收通过）：** 用户独立复核 Compose 390px 修复、目标端口清理和 `git diff --check` 后，明确确认 P6 与第四期整批通过。P6.0～P6.5、04 第十四章和 `AGENTS.md` 最终状态均已同步；历史 lint 债登记为独立工程任务。不自动进入第五期，未提交 Git。

**最终环境复核修正（2026-07-17）：** 用户发现本项目 production PID 13520 仍监听 3000；根因是执行者使用的受限 `Get-NetTCPConnection` 漏报，`netstat -ano` 与 HTTP 实际均证明服务存在。经用户明确要求后，提升权限核验其父 cmd PID 33092 与仓库内 `dist/src/main` 命令行，仅终止该父子树。最终 `netstat -ano` 对 3000/3106/3107/4173/5173 无命中，两个 PID 均已停止，3000 HTTP 不可达。以后端口门禁以 `netstat -ano` 为准。

---

## 第十四章验收项映射

| 04 最终验收组 | 实施任务 |
|---|---|
| 只迁移 7 页、无新增路由/schema/migration | Global Constraints、P0.1、P3.1～P3.7、P6.4 |
| App Shell/store/API/JWT/SSE/前三期保持 | P2.1～P2.5、各 P3 保留项、P5.5、P6.1/6.2 |
| viewCount 只读、评论无伪时间、Chat 单会话 | P3.3、P3.5、P5.7、P6.2 |
| token/Inter/7 页旧皮肤清理 | P1.1、P1.5、P3.1～P3.7、P6.3/6.4 |
| 既有/新增全局组件契约 | P1.2～P1.5、P2.2～P2.5 |
| data-state/focus/disabled/reduced-motion/长文本 | P1.1～P1.5、P2、P3、P6.3 |
| 248/80/移动底 tab | P2.1、P6.3 |
| loading/empty/error/disabled/success | P3 状态槽、P4.1/4.2、P6.2/6.3 |
| confirm/alert 清零与评论 AlertDialog | P4.1/4.5、P6.4 |
| Compose/PostDetail 共享 MarkdownRenderer 与 XSS | P4.3～P4.5、P6.2/6.4 |
| URL 配置与业务模块 localhost 清零（集中 config/test 例外） | P5.1/P5.3/P5.4、P6.4 |
| 登录/注册/AI/上传限流 | P5.5、P6.2/6.4 |
| 强密钥和启动校验 | P5.2/P5.8、P6.4 |
| 文件清理安全规则 | P5.6/P5.8、P6.4 |
| 35 帖 seed、评论/点赞/viewCount/embedding | P5.7/P5.8、P6.2/6.4 |
| build/lint/test、41 基线、主链路、四视口 | P0.2/P0.3、P6.1～P6.3 |
| 文档与 AGENTS 最终一致 | P6.5 |

## 实施与评审节奏

1. 每批先由执行者提交“将改哪些文件、保持哪些行为、如何验”的简短施工方案；用户确认后实施。
2. P0、P1、P2 各自人工验收；P3 每页独立验收并独立 commit；P4 反馈与 Markdown 分开 review；P5 按 8 个安全/维护子任务逐个 review；P6 只验收不开发。
3. 每个批次的自动化通过不等于人工视觉/交互通过；人工未通过时不补该功能新增 e2e，也不进入下一批。
4. 发现设计偏差先回填 `docs/design/04-phase4-visual-polish.md` 并请求确认，再修改代码。

## 计划交付边界

- 本计划完成后停止，不自动执行 P0。
- 本计划不包含任何实际 commit；实施时所有建议 commit 均需精确 `git add -- <paths>`，禁止 `git add .`。
- 当前没有需要重新拍板的范围问题；实施中只有“扩大范围、改变业务语义、需要 migration、与权威文档实质冲突”四类情况才重新请求决策。
