# Black-box 四期后 UX 优化批次 O1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task with the user checkpoints defined below. Do not use subagents unless the user separately authorizes them.

**Goal:** 物理移除 App Shell 全局 Topbar 搜索区，并让 Chat assistant 复用唯一安全 MarkdownRenderer 做流式紧凑排版，同时保持 Home/Search、Sidebar、AI 协议和第四期行为基线。

**Architecture:** MainLayout 从 `Sidebar + Topbar + Outlet` 收口为 `Sidebar + Outlet`，搜索职责继续留在 Home/Search 页面。MarkdownRenderer 增加默认兼容的 `article|chat` variant；Chat 仅按 message role 选择呈现方式，hook/store/backend/annotation 数据流保持不变。

**Tech Stack:** React 19、React Router 7、TypeScript 5.9、Tailwind CSS v4、`@ai-sdk/react@1.2.12`、`react-markdown@10.1.0`、`remark-gfm`、`remark-breaks`、`rehype-sanitize`、Vitest、Playwright。

## Global Constraints

- 权威设计：`docs/design/05-post-phase4-ux-optimization.md`；只覆盖其明确列出的两处历史契约。
- O1 是第四期后的独立优化批次，不代表第五期启动。
- 不修改后端、数据库、schema/migration、API、路由、JWT、SSE、AI prompt/模型/阈值/timeout、store 业务语义、依赖、lockfile、原型或 `AGENTS.md`。
- 不删除、回滚、覆盖或格式化前三期/第四期现有未提交改动。
- 不在人工验收前新增或修改 O1 Playwright e2e；实施期只允许新增/修改聚焦 Vitest 与 QA 脚本。
- O1 新增/修改 TS/TSX lint 必须 `0 errors / 0 warnings`；前端全量不得高于第四期基线 `3 errors / 0 warnings`，剩余只允许 `src/components/ui/badge.tsx` 1 条和 `src/utils/index.ts` 2 条。
- 实施前 Playwright 必须保持 7 files/41 tests；用户人工验收后才增量到计划的 8 files/46 tests。
- 不提交 Git；每个任务以文件责任边界和验证证据作为 review/回滚单位。

---

## 文件矩阵

### 产品代码

| 路径 | 动作 | 任务 | 职责 |
|---|---|---|---|
| `frontend/black_box/src/layouts/MainLayout.tsx` | 修改 | O1.1 | 移除 Topbar import/render，保留 Shell 其余结构 |
| `frontend/black_box/src/components/Topbar.tsx` | 删除 | O1.1 | MainLayout 移除后物理删除零引用壳 |
| `frontend/black_box/src/pages/Chat.tsx` | 修改 | O1.1、O1.3 | 重算无 Topbar 高度；assistant Markdown/user 纯文本/引用独立 |
| `frontend/black_box/src/components/MarkdownRenderer.tsx` | 修改 | O1.2 | 增加 `article|chat` variant，共享安全管线 |

### 实施期测试与 QA

| 路径 | 动作 | 任务 | 职责 |
|---|---|---|---|
| `frontend/black_box/src/components/MarkdownRenderer.test.tsx` | 修改 | O1.2 | variant、前缀容错、安全与 article 回归 |
| `frontend/black_box/src/pages/Chat.test.tsx` | 新增 | O1.3 | assistant/user 角色分流和 citation 顺序 |
| `frontend/black_box/scripts/capture-post-phase4-ux-chat.mjs` | 新增 | O1.4 | 稳定 mock SSE，捕获四视口 Chat Markdown 完成态 |
| `docs/qa/post-phase4-ux-optimization/baseline.md` | 新增 | O1.0 | 工作树、测试、双搜索框和纯文本基线 |
| `docs/qa/post-phase4-ux-optimization/protected-files-before.sha256` | 新增 | O1.0 | 冻结禁改前端、后端、依赖、schema 与原型文件内容 |
| `docs/qa/post-phase4-ux-optimization/protected-files-after.sha256` | 新增 | O1.4 | 与实施前清单逐项比较，证明 O1 未越界触碰 |
| `docs/qa/post-phase4-ux-optimization/implementation-report.md` | 新增 | O1.4 | 自动结果、截图、人工串验和差异记录 |
| `docs/qa/phase4/screenshots/o1-before/`、`docs/qa/phase4/screenshots/o1/` | 新增 | O1.0/O1.4 | 复用既有 capture 脚本的固定输出根，保存 O1 前后七页默认态 |
| `docs/qa/post-phase4-ux-optimization/screenshots/o1-chat/` | 新增 | O1.4 | O1 专项脚本保存 Chat Markdown 四视口完成态 |

### 人工验收后才允许修改

| 路径 | 动作 | 任务 | 职责 |
|---|---|---|---|
| `frontend/black_box/e2e/app-shell-ux.spec.ts` | 新增 | O1.5 | 搜索框数量、q 消费和无 Topbar 页面 |
| `frontend/black_box/e2e/ai-chat.spec.ts` | 增量修改 | O1.5 | assistant Markdown、user 纯文本与 citation 共存 |
| `docs/design/00-foundation.md` | 事实回填 | O1.5 | App Shell 无 Topbar、MarkdownRenderer variant |
| `docs/design/05-post-phase4-ux-optimization.md` | 状态回填 | O1.4/O1.5 | 实现、人工验收和 e2e 终态 |
| `.planning/post-phase4-ux-optimization/*` | 更新 | 全程 | 检查点、发现、验证与关闭记录 |

### 明确禁止触碰

- `SearchBar.tsx`、`Home.tsx`、`Search.tsx`、`Sidebar.tsx`、`router/index.tsx`
- `useChatBot.ts`、`useChatStore.ts`、`lib/markdown.ts`
- Compose/PostDetail 产品接线、全部后端文件、package/lock、prototype

若实施中证明上述禁止触碰文件必须改变，立即停止并回到设计评审；不得自行扩大矩阵。

---

## O1.0：范围冻结与基线

**Files:**
- Create: `docs/qa/post-phase4-ux-optimization/baseline.md`
- Create: `docs/qa/post-phase4-ux-optimization/protected-files-before.sha256`
- Create: `docs/qa/phase4/screenshots/o1-before/`
- Modify: `.planning/post-phase4-ux-optimization/task_plan.md`
- Modify: `.planning/post-phase4-ux-optimization/progress.md`

**Produces:** 可复核的实施前工作树、自动测试和四视口视觉基线；后续任务不得把历史脏工作树归为 O1 所有。

- [x] **Step 1：记录只读工作树和运行环境**

在仓库根目录记录：

```powershell
git rev-parse HEAD
git branch --show-current
git status --short
git diff --stat
node --version
pnpm --version
```

不读取或记录 `.env`、token、数据库连接串或 AI key。将 O1 预计触碰文件与现有历史改动分栏记录。

同一工作树已有跨期未提交改动，不能用普通 `git diff` 判断 O1 是否越界。对本计划明确禁止触碰的文件及目录生成实施前内容清单：

```powershell
$protectedPaths = @(
  'frontend/black_box/src/components/SearchBar.tsx',
  'frontend/black_box/src/pages/Home.tsx',
  'frontend/black_box/src/pages/Search.tsx',
  'frontend/black_box/src/components/Sidebar.tsx',
  'frontend/black_box/src/router/index.tsx',
  'frontend/black_box/src/hooks/useChatBot.ts',
  'frontend/black_box/src/store/useChatStore.ts',
  'frontend/black_box/src/lib/markdown.ts',
  'frontend/black_box/package.json',
  'frontend/black_box/pnpm-lock.yaml',
  'backend/backend/posts/src',
  'backend/backend/posts/package.json',
  'backend/backend/posts/pnpm-lock.yaml',
  'backend/backend/posts/prisma',
  'docs/prototype'
)
$protectedFiles = foreach ($path in $protectedPaths) {
  if (Test-Path -LiteralPath $path -PathType Container) {
    Get-ChildItem -LiteralPath $path -File -Recurse
  } else {
    Get-Item -LiteralPath $path
  }
}
$root = (Get-Location).Path
$protectedFiles |
  Sort-Object FullName |
  ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    $relative = $_.FullName.Substring($root.Length + 1)
    "$hash  $relative"
  } |
  Set-Content -Encoding utf8 docs/qa/post-phase4-ux-optimization/protected-files-before.sha256
```

清单只含文件哈希和仓库相对路径，不含 `.env`；如任一路径缺失或读取失败，停止并记录，不能以不完整清单进入 O1.1。

- [x] **Step 2：运行前端 unit/build/lint 基线**

```powershell
cd frontend/black_box
pnpm test:unit
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm lint
```

期望：unit 至少保持第四期终态 12 files/29 tests；build 成功；全量 lint 不高于 3/0且路径清单不变。若不成立，只调查并记录，不进入 O1.1。

- [x] **Step 3：运行 Playwright 清单与 41 条基线**

先确认 5173 监听进程所有权。用户保留的服务不得擅自终止；若可使用当前服务，必须确认它来自当前工作树且 `App.css` 无 500。否则经用户允许后只停止对应进程，让 Playwright webServer 启动干净 Vite。

```powershell
pnpm exec playwright test --list
pnpm e2e
```

期望：7 files/41 tests，41 passed。失败时停止并记录，不修改既有 e2e。

- [x] **Step 4：记录当前结构证据**

```powershell
rg -n "Topbar" src
rg -n '<SearchBar|role="search"' src/layouts src/components src/pages
rg -n "whitespace-pre-wrap|MarkdownRenderer|annotations" src/pages/Chat.tsx src/components/MarkdownRenderer.tsx
```

期望基线：Topbar 仅被 MainLayout 引用；Home/Topbar/Search 各有 SearchBar；Chat user/assistant 当前共用纯文本。

- [x] **Step 5：生成 O1 前默认态 28 张截图**

```powershell
pnpm visual:capture -- --stage=o1-before --base-url=http://localhost:5173
```

记录 1440×1000、900×1000、390×844、320×740 下 Home 双搜索框、其他业务页全局顶栏和 Chat 纯文本现状。不得修改截图脚本或页面来“修”基线。

**Checkpoint O1.0:** 用户确认基线证据可用后进入 O1.1；无确认不改产品代码。

---

## O1.1：物理移除 Topbar 与重算 Chat 高度

**Files:**
- Modify: `frontend/black_box/src/layouts/MainLayout.tsx`
- Delete: `frontend/black_box/src/components/Topbar.tsx`
- Modify: `frontend/black_box/src/pages/Chat.tsx`（只改高度公式）

**Consumes:** foundation Sidebar/内容容器 token、05 §六页面矩阵。  
**Produces:** 无全局搜索区的 App Shell；Chat 不保留旧 Topbar 高度。

- [x] **Step 1：用现状失败证据锁定目标**

通过 O1-before 截图和一次性浏览器检查记录：Home search landmark 为 2；Chat/PostDetail/Compose/Mine 为 1。该检查只写 QA 结果，不注册 Playwright spec。

- [x] **Step 2：最小修改 MainLayout**

目标结构必须等价于：

```tsx
<div data-testid="app-shell" className="...existing grid...">
  <Sidebar />
  <main className="...existing main...">
    <div className="...existing container...">
      <Outlet />
    </div>
  </main>
</div>
```

只删除 Topbar import 和 `<Topbar />`；外层 grid、Sidebar、main、移动 bottom padding、container max/gutter/padding 原样保留。不增加替代 header、margin 或占位。

- [x] **Step 3：确认零引用并物理删除 Topbar**

```powershell
rg -n "Topbar" frontend/black_box/src
```

确认除定义文件外零引用后删除 `src/components/Topbar.tsx`。删除后再次扫描必须零命中。

- [x] **Step 4：只调整 Chat 视口高度公式**

将旧 Topbar 4.5rem 从高度扣减中移除：

```text
桌面/窄桌面：100dvh - 3rem
移动：100dvh - var(--bottombar-h) - 3rem - env(safe-area-inset-bottom)
```

保留 `min-h`、flex、message `overflow-y-auto`、header/form 和所有 testid；本步骤不接 Markdown、不改消息循环。

- [x] **Step 5：定向验证**

```powershell
pnpm exec eslint src/layouts/MainLayout.tsx src/pages/Chat.tsx
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm exec playwright test e2e/home.spec.ts e2e/auth-guard.spec.ts e2e/ai-chat.spec.ts
```

期望：定向 lint 0/0、build 成功、既有相关用例全绿。浏览器四视口确认 Home/Search 各 1 个搜索框，其他业务页 0 个，Login 不变；Chat 输入栏不被底 tab 遮挡且无双滚动。

**Checkpoint O1.1:** 只评审 Shell/高度。失败时恢复 MainLayout+Topbar+旧高度这一组，不触碰后续 Markdown。

---

## O1.2：MarkdownRenderer `article|chat` 单一契约

**Files:**
- Modify: `frontend/black_box/src/components/MarkdownRenderer.test.tsx`
- Modify: `frontend/black_box/src/components/MarkdownRenderer.tsx`

**Consumes:** `lib/markdown.ts` 的现有 plugins/schema/URL policy。  
**Produces:** 默认兼容 article 与紧凑 chat 两种语义表现，安全管线仍唯一。

- [x] **Step 1：先写 variant 失败测试**

扩展 props 编译契约：

```ts
type MarkdownRendererVariant = 'article' | 'chat'

interface MarkdownRendererProps {
  content: string
  variant?: MarkdownRendererVariant
  className?: string
  empty?: ReactNode
}
```

新增测试分别断言：

1. 默认调用仍输出 article 的 h1/p/table/pre 语义。
2. `variant="chat"` 支持标题、强调、列表、引用、链接、代码块和表格。
3. chat variant 对第四期 XSS fixture 仍不输出 script/iframe/event/dangerous URL。
4. 下列每个流式前缀均可独立 `renderToStaticMarkup` 且不抛错：

```ts
const prefixes = [
  '**未闭合',
  '[链接](https://example.com',
  '`未闭合代码',
  '```ts\nconst value = 1',
  '| 名称 | 状态 |\n| ---',
]
```

运行：

```powershell
pnpm exec vitest run --config vitest.config.ts src/components/MarkdownRenderer.test.tsx
```

期望：新 variant/type 测试先因未实现失败；既有四条继续通过。

- [x] **Step 2：实现默认兼容 variant**

要求：

- `variant` 默认 `article`。
- 外层增加稳定 `data-variant`，仅用于语义/QA，不作为业务状态。
- plugins、rehype sanitize、URL transform、图片组件保持单一调用点。
- 通过 variant 选择 typography class 映射；不得复制第二个 `<ReactMarkdown>` 或第二份 components 安全逻辑。
- chat 标题/段落/列表/引用间距收紧；table/pre 继续局部横滚；`min-w-0/max-w-full` 完整。
- 导出 `MarkdownRendererVariant` 与现有 props type，保留默认导出。

- [x] **Step 3：验证 article 无回归与 chat 安全**

```powershell
pnpm exec vitest run --config vitest.config.ts src/components/MarkdownRenderer.test.tsx src/lib/markdown.test.ts
pnpm exec eslint src/components/MarkdownRenderer.tsx src/components/MarkdownRenderer.test.tsx
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
```

期望：定向 unit 全绿、lint 0/0、build 成功。使用 gallery/Compose preview/PostDetail 人工抽查 article 排版没有变化。

**Checkpoint O1.2:** renderer 可独立评审；安全测试任一失败则整体回滚 variant，不放宽 `lib/markdown.ts`。

---

## O1.3：Chat assistant Markdown 接线

**Files:**
- Create: `frontend/black_box/src/pages/Chat.test.tsx`
- Modify: `frontend/black_box/src/pages/Chat.tsx`（只改正文呈现/import）

**Consumes:** O1.2 `MarkdownRenderer variant="chat"`。  
**Produces:** assistant Markdown、user 纯文本、citation 独立的角色呈现契约。

- [x] **Step 1：先写 Chat 角色分流失败测试**

Vitest 使用 `vi.mock('@/hooks/useChatBot')` 提供固定 messages，并在 `MemoryRouter` 中 SSR `Chat`。覆盖：

```ts
const user = { id: 'u1', role: 'user', content: '**用户原文** [链接](/post/1)' }
const assistant = {
  id: 'a1',
  role: 'assistant',
  content: '## 回答\n\n- 第一点\n- **第二点**',
  annotations: [{ id: 39, title: '站内攻略' }],
}
```

断言：

- assistant 输出 h2/list/strong。
- user 输出包含 `**用户原文**` 和 Markdown 源字符，不生成 strong/站内 Markdown Link。
- citation Link 仍为 `/post/39`，且在 assistant 正文输出之后。
- 既有 `chat-message/chat-citations/chat-citation-link` 均存在。

运行：

```powershell
pnpm exec vitest run --config vitest.config.ts src/pages/Chat.test.tsx
```

期望：旧纯文本实现导致 assistant 语义测试失败。

- [x] **Step 2：最小接入 MarkdownRenderer**

消息正文只按精确角色分流：

```tsx
{message.role === 'assistant' ? (
  <MarkdownRenderer content={message.content} variant="chat" />
) : (
  <p className="break-words whitespace-pre-wrap">{message.content}</p>
)}
```

保持：

- article key 仍为 `message.id`。
- annotations 的读取、过滤、Link chip 和 DOM 顺序不动。
- 气泡、avatar、loading/error、input/form、handleSubmit 不动。
- 不 import 或调用 `useChatStore`、Markdown policy、SSE helper。

- [x] **Step 3：运行 Chat 聚焦回归**

```powershell
pnpm exec vitest run --config vitest.config.ts src/pages/Chat.test.tsx src/components/MarkdownRenderer.test.tsx src/hooks/useChatBot.test.ts
pnpm exec eslint src/pages/Chat.tsx src/pages/Chat.test.tsx
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm exec playwright test e2e/ai-chat.spec.ts
```

期望：unit 全绿、lint 0/0、build 成功、既有 ai-chat 3/3；现有 e2e 文件不修改。

**Checkpoint O1.3:** 评审只看呈现接线。若 store/JWT/SSE/timeout/annotation 文件出现 diff，视为越界并停止。

---

## O1.4：完整回归、截图与人工门禁

**Files:**
- Create: `frontend/black_box/scripts/capture-post-phase4-ux-chat.mjs`
- Create: `docs/qa/post-phase4-ux-optimization/protected-files-after.sha256`
- Create: `docs/qa/post-phase4-ux-optimization/implementation-report.md`
- Create: `docs/qa/phase4/screenshots/o1/`
- Create: `docs/qa/post-phase4-ux-optimization/screenshots/o1-chat/`
- Modify: `docs/design/05-post-phase4-ux-optimization.md`（只回填实施状态，不标人工通过）
- Modify: `.planning/post-phase4-ux-optimization/*`

- [x] **Step 1：建立四视口 Chat Markdown QA fixture**

新脚本只做 QA，不进入 `e2e/`、不注册产品路由、不调用真实 AI。要求：

- 复用 Playwright chromium、reduced-motion 和显式登录 store。
- route mock `/api/ai/chat` 返回 AI SDK v1 body：`8:` citation + 多个 `0:` Markdown 文本 + `d:` finish。
- Markdown fixture 覆盖 h1/h2、段落、强调、列表、引用、站内/外链、代码块、宽表格。
- 输出四张完成态到 `docs/qa/post-phase4-ux-optimization/screenshots/o1-chat/{viewport}/chat-markdown.png`。
- 每档检查 `document.scrollWidth === document.clientWidth`，table/pre 的 `scrollWidth >= clientWidth` 仅允许局部横滚。
- 脚本结束关闭自己创建的 browser/server；不终止用户已有服务。

- [x] **Step 2：运行全量自动门禁**

```powershell
pnpm test:unit
pnpm exec eslint src/layouts/MainLayout.tsx src/pages/Chat.tsx src/pages/Chat.test.tsx src/components/MarkdownRenderer.tsx src/components/MarkdownRenderer.test.tsx
pnpm lint
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm exec playwright test --list
pnpm e2e
```

期望：O1 定向 0/0；全量不高于 3/0且历史路径不变；build 成功；实施前 Playwright 仍为 7 files/41 passed；unit 现有 29 条和新增条目全部通过。

- [x] **Step 3：运行静态边界扫描**

```powershell
rg -n "Topbar" src
rg -n "dangerouslySetInnerHTML|rehype-raw" src
```

期望：Topbar 零命中；危险渲染零新增。

随后使用 O1.0 完全相同的 `$protectedPaths`、排序和 SHA-256 逻辑生成 `protected-files-after.sha256`，只将末尾输出路径改为：

```powershell
docs/qa/post-phase4-ux-optimization/protected-files-after.sha256
```

比较前后清单：

```powershell
Compare-Object `
  (Get-Content -Encoding utf8 docs/qa/post-phase4-ux-optimization/protected-files-before.sha256) `
  (Get-Content -Encoding utf8 docs/qa/post-phase4-ux-optimization/protected-files-after.sha256)
```

期望无输出。任何差异都视为 O1 越界或外部并发修改：先定位所有权并停止门禁，不覆盖用户改动，也不能用重新生成 before 清单掩盖差异。

- [x] **Step 4：生成截图**

```powershell
pnpm visual:capture -- --stage=o1 --base-url=http://localhost:5173
node scripts/capture-post-phase4-ux-chat.mjs --base-url=http://localhost:5173
```

输出默认态 28/28 + Chat Markdown 4/4。与 P6/O1-before 并排检查，不用像素阈值替代人工判断。

- [x] **Step 5：人工串验准备与代理侧串验**

按 1440/900/390/320 执行：

1. Home 只有一个 SearchBar，提交中文及 `& ? # %` 后只编码一次。
2. Search 只有页内 SearchBar，q/category/debounce/history/clear/retry 正常。
3. PostDetail/Compose/Chat/Mine 无 search landmark、空 header 或顶部占位。
4. Chat 使用真实 AI 流：生成中能看到 Markdown 前缀逐步成形，结束后标题/列表/代码/引用/链接稳定。
5. user 输入 Markdown 符号保持原文；annotation chip 在正文后可点。
6. 未闭合语法不崩溃；危险 URL/HTML 不执行；长代码/表格局部横滚。
7. Chat 切走返回保持、刷新可丢、有限失败/降级、输入 busy、移动底 tab 与双滚动均正常。

**Checkpoint O1.4（硬门禁）:** 自动验证、截图与代理侧串验已完成；当前停止实施并等待用户明确“人工验收通过”。不得自动进入 O1.5。

---

## O1.5：人工验收后的 Playwright 锁定与文档关闭

> 只有用户已明确确认 O1 人工验收通过时才能执行本任务。

**Files:**
- Create: `frontend/black_box/e2e/app-shell-ux.spec.ts`
- Modify: `frontend/black_box/e2e/ai-chat.spec.ts`
- Modify: `docs/design/00-foundation.md`
- Modify: `docs/design/05-post-phase4-ux-optimization.md`
- Modify: `docs/qa/post-phase4-ux-optimization/implementation-report.md`
- Modify: `.planning/post-phase4-ux-optimization/*`

- [x] **Step 1：新增 App Shell 三条稳定行为测试**

`app-shell-ux.spec.ts` 使用现有 route mock/登录 store 方式，断言：

1. Home `role=search` 数量为 1，提交后 URL 为正确编码的 `/search?q=`。
2. Search `role=search` 数量为 1，q 初始化只触发现有搜索语义。
3. 依次访问 PostDetail/Compose/Chat/Mine，页面内 `role=search` 数量为 0；Login 仍无 App Shell。

不断言 CSS class、Topbar 文件名、DOM 层级或像素。

- [x] **Step 2：在 ai-chat 增加两条行为测试**

复用现有 data stream mock：

1. 将多个 `0:` chunk 组合成 Markdown assistant 内容，并带原 `8:` citation；断言完成后标题/列表/代码语义可见且 citation href 不变。
2. 用户发送 `**原文** [链接](/post/1)`；断言用户气泡显示源字符，不产生用户消息内的可点击 Markdown Link。

不测试 AI 内容质量、不写 CSS/像素断言、不删除或弱化原 3 条 chat 用例。

- [x] **Step 3：运行增量与全量门禁**

```powershell
pnpm exec playwright test e2e/app-shell-ux.spec.ts e2e/ai-chat.spec.ts
pnpm exec playwright test --list
pnpm e2e
pnpm test:unit
pnpm lint
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
```

期望：新增 5 条通过；总基线更新为 8 files/46 passed；unit/build 通过；lint 仍满足差分门禁。

- [x] **Step 4：回填共享事实并关闭 O1**

- foundation App Shell 结构改为无 Topbar；SearchBar 复用页明确为 Home/Search。
- foundation MarkdownRenderer 改为 `article|chat`，Chat assistant 纳入唯一安全 renderer。
- 05 标记“已实现、已人工验收通过”；记录最终测试、截图和人工结果。
- planning 四文件关闭，明确不自动进入第五期。

**Final Gate:** O1.4 已由用户人工复验通过，O1.5 最终达到 8 files/46 passed 并完成文档回填；O1 关闭，不提交 Git，也不自动进入第五期。

---

## 失败处置与回滚原则

1. O1.0 基线失败：停止，不改产品代码。
2. O1.1 Shell/高度失败：恢复 MainLayout、Topbar、Chat 高度这一组；不进入 Markdown。
3. O1.2 安全或 article 回归：整体回滚 renderer variant；禁止放宽 schema。
4. O1.3 Chat 行为回归：回滚 Chat Markdown 接线，保留已独立通过的 renderer variant。
5. O1.4 视觉或真实流失败：只返回对应责任任务，不补新功能、不修改协议。
6. O1.5 e2e 失败：修正测试揭示的已确认行为缺口；不得弱化断言来追求 46 passed。
7. 任一步发现必须修改后端、依赖、store、路由或 Search/Home 业务语义：暂停并请求重新评审 05 设计范围。

---

## 计划评审结论

- 计划完整覆盖 05 的两个产品目标和全部非目标。
- Shell、renderer、Chat 接线可独立 review/回滚。
- unit 测试在实现期按 TDD 编写；Playwright 严格延后至用户人工验收后。
- 四视口、XSS、未闭合流式前缀、宽内容、annotation 和 Chat 高度均有明确证据入口。
- 当前没有需要新增产品拍板的事项。
- 本计划获用户确认前，不执行 O1.0 之后的任何施工动作。
