# 第四期 P0 行为与工作树基线

> 采集日期：2026-07-14（Asia/Hong_Kong）  
> 阶段：P0 范围冻结；本文不得记录 `.env` 内容或密钥。

## 1. 范围与禁止操作

- 权威依据：`AGENTS.md`、`docs/design/04-phase4-visual-polish.md`、`docs/plans/04-phase4-implementation-plan.md`。
- 第四期只迁移 Home、Search、PostDetail、Compose、Chat、Mine、Login 七页。
- 批次固定为 P0 → P1 → P2 → P3 → P4 → P5 → P6；本轮只执行 P0。
- 不新增 profile/edit-profile/my-posts/my-likes，不增加浏览量写入、Comment.createdAt/migration、游戏专区/详情、多会话 AI、预设头像、正文 embedding、改帖或暗色入口。
- 保持前三期路由、接口字段、JWT、SSE、Zustand 主数据流和 App Shell 三断点语义。
- 禁止 `git reset/checkout/clean/stash`，禁止删除、覆盖或回滚既有未提交改动，禁止提交 Git。
- `docs/prototype/` 只读；P0 不修改业务源码、运行配置、依赖、lockfile、schema/migration、既有测试或断言。
- 既存缺口：Topbar 导航到 `/search?q=...`，Search 尚未消费 `q`；只登记，P0 不修，按计划在 P2/P3 接线。

## 2. Git 与工具链

| 项目 | 基线值 |
|---|---|
| HEAD | `f29ea940dfb7f4492a09119303c3cf78864f7e2b` |
| 分支 | `main` |
| Node | `v24.18.0` |
| pnpm | `11.7.0` |
| `git status --porcelain=v1` | 79 项：36 modified、12 deleted、31 untracked |
| `git diff --stat` | 47 个 tracked 文件；1482 insertions、43402 deletions |
| 受保护树文件数 | 128 |
| P0 开始前受保护树 SHA-256 | `b6fd1e703f9425f89d73369aab9b10eb3754c7e70eb4d826efe7c6f929f9678c` |

受保护树包含：后端 `src/`、`prisma/`、`test/`、nest/package/lock；前端 `src/`、`e2e/`、index、Playwright 配置、lockfile；以及 `docs/prototype/`。计算时排除 `node_modules/dist/test-results/playwright-report/uploads`。P0 只允许改前端 `package.json` 的一个 QA script，因此该文件不纳入受保护树指纹；其前后差异单独核对。

### 2.1 原始 `git status --short`

```text
 M CLAUDE.md
 M backend/backend/posts/nest-cli.json
 M backend/backend/posts/package.json
 M backend/backend/posts/pnpm-lock.yaml
 M backend/backend/posts/prisma/migrations/migration_lock.toml
 M backend/backend/posts/prisma/schema.prisma
 M backend/backend/posts/src/ai/ai.controller.ts
 M backend/backend/posts/src/ai/ai.module.ts
 M backend/backend/posts/src/ai/ai.service.ts
 M backend/backend/posts/src/app.module.ts
 M backend/backend/posts/src/auth/auth.service.ts
 D backend/backend/posts/src/data/posts-embedding.json
 M backend/backend/posts/src/posts/dto/post-query.dto.ts
 M backend/backend/posts/src/posts/posts.controller.ts
 M backend/backend/posts/src/posts/posts.module.ts
 M backend/backend/posts/src/posts/posts.service.ts
 D backend/backend/posts/src/scripts/regenerate-embeddings.ts
 M backend/backend/posts/src/users/dto/create-users.dto.ts
 M frontend/black_box/index.html
 M frontend/black_box/package.json
 M frontend/black_box/pnpm-lock.yaml
 M frontend/black_box/src/App.tsx
 D frontend/black_box/src/api/git.ts
 M frontend/black_box/src/api/posts.ts
 D frontend/black_box/src/api/rag.ts
 M frontend/black_box/src/api/user.ts
 D frontend/black_box/src/components/BottomNav.tsx
 D frontend/black_box/src/components/KeepAliveChat.tsx
 D frontend/black_box/src/components/KeepAliveHome.tsx
 M frontend/black_box/src/components/PostItem.tsx
 M frontend/black_box/src/components/ui/scroll-area.tsx
 M frontend/black_box/src/hooks/useChatBot.ts
 M frontend/black_box/src/layouts/MainLayout.tsx
 D frontend/black_box/src/layouts/PostLayout.tsx
 M frontend/black_box/src/main.tsx
 M frontend/black_box/src/pages/Chat.tsx
 D frontend/black_box/src/pages/Git.tsx
 M frontend/black_box/src/pages/Home.tsx
 M frontend/black_box/src/pages/Login.tsx
 M frontend/black_box/src/pages/Mine.tsx
 D frontend/black_box/src/pages/RAG.tsx
 M frontend/black_box/src/pages/post/index.tsx
 M frontend/black_box/src/router/index.tsx
 D frontend/black_box/src/store/git.ts
 D frontend/black_box/src/store/rag.ts
 M frontend/black_box/src/store/useHomeStore.ts
 M frontend/black_box/src/store/useUserStore.ts
 M frontend/black_box/src/types/index.ts
?? .planning/
?? AGENTS.md
?? backend/backend/posts/pnpm-workspace.yaml
?? backend/backend/posts/prisma/migrations/20260617092158_add_game_and_post_fields/
?? backend/backend/posts/src/auth/guard/optional-jwt-auth.guard.ts
?? backend/backend/posts/src/comments/
?? backend/backend/posts/src/embedding/
?? backend/backend/posts/src/game/
?? backend/backend/posts/src/posts/dto/create-post.dto.ts
?? backend/backend/posts/src/scripts/backfill-embeddings.ts
?? backend/backend/posts/src/scripts/rebuild-tags.ts
?? backend/backend/posts/src/scripts/seed-demo-posts.ts
?? backend/backend/posts/src/scripts/seed-games.ts
?? backend/backend/posts/src/upload/
?? backend/backend/posts/test-results/
?? docs/
?? frontend/black_box/e2e/
?? frontend/black_box/playwright.config.ts
?? frontend/black_box/pnpm-workspace.yaml
?? frontend/black_box/src/api/comments.ts
?? frontend/black_box/src/api/games.ts
?? frontend/black_box/src/api/likes.ts
?? frontend/black_box/src/api/upload.ts
?? frontend/black_box/src/components/ErrorBoundary.tsx
?? frontend/black_box/src/components/RequireAuth.tsx
?? frontend/black_box/src/components/Sidebar.tsx
?? frontend/black_box/src/components/Topbar.tsx
?? frontend/black_box/src/pages/Compose.tsx
?? frontend/black_box/src/store/useChatStore.ts
?? frontend/black_box/test-results/
?? test-results/
```

## 3. 工作树分类

### 3.1 前三期历史业务改动（只读）

- 后端：AI/Embedding、Auth、Comments、Game、Posts、Upload、Prisma schema/migration、seed/backfill/rebuild 脚本及后端 package/lock。
- 前端：路由/App Shell、Home/Search/PostDetail/Compose/Chat/Mine/Login、API/store/types、错误边界、守卫、Playwright 配置与 7 个既有 spec，以及删除的 rag/git/旧 keep-alive 文件。
- 仓库说明：`CLAUDE.md`、`AGENTS.md` 和前三期/第四期已有设计记录。

### 3.2 生成/结果目录（只记录，不删除）

- `backend/backend/posts/test-results/`
- `frontend/black_box/test-results/`
- `test-results/`

### 3.3 第四期预计触碰文件

- P0 白名单：本 QA 目录、P0 截图脚本、前端 package 的 `visual:capture`、实施计划与 `.planning/`。
- P1～P6 预计文件以实施计划“主要文件职责矩阵”为准；P0 不提前修改。

## 4. 行为基线

### 4.1 可用命令

- 前端：`pnpm build`、`pnpm lint`、`pnpm exec playwright test --list`、`pnpm e2e`。
- 后端：`pnpm build`、`pnpm test`、`pnpm test:e2e`；后端 `pnpm lint` 带 `--fix`，P0 不运行它修改代码。

### 4.2 Playwright 列表与全量结果

- `pnpm exec playwright test --list`：退出 0，`Total: 41 tests in 7 files`。
- 7 个 spec：`ai-chat.spec.ts`（3）、`auth-guard.spec.ts`（11）、`auth.spec.ts`（7）、`compose.spec.ts`（5）、`game-filter.spec.ts`（4）、`home.spec.ts`（4）、`social.spec.ts`（7）。
- `pnpm e2e`：退出 0，`41 passed (11.6s)`，14 workers。
- 测试运行中的 `/git`、`/rag` “No routes matched” 是对应删除守卫用例的预期 console warning，不是失败。
- 环境差异：受限沙箱中的 pnpm 无权创建/访问用户级 store，初次 `--list` 报 `playwright is not recognized`；证据显示 `.bin/playwright.cmd` 和 lock 依赖均存在。经允许在沙箱外运行同一只读命令后列表与全量均通过，根因是执行权限，不是项目代码。
- 抽查测试断言使用 URL、文本、role、`data-testid`、`data-state` 和请求参数；未发现 CSS 类、DOM 层级或像素断言。

## 5. 视觉基线

- manifest：`docs/qa/phase4/screenshot-manifest.json`，固定 7 页 × 4 视口。
- 命令：`pnpm visual:capture -- --stage=p0`；退出 0，输出 `28/28`，脚本自行启动并停止 Vite。
- 输出：`docs/qa/phase4/screenshots/p0/{1440x1000,900x1000,390x844,320x740}/`，每档 7 个 PNG；全部像素尺寸与目录名一致，文件均非空。
- 稳定性：每个页面使用独立 context；受保护页注入现有 `user-store`；Search 注入稳定历史；API、评论、帖子、标签、游戏和外部轮播图全部 route mock；不调用真实 AI；轮播长定时器在 init 阶段冻结，context 使用 `reducedMotion: reduce`；等待锚点、字体和图片完成，不使用固定 sleep。

### 5.1 四视口人工抽查

- 1440×1000：7 页均非空；业务页显示 248px 展开 Sidebar，Home/PostDetail 图片、Search 历史、Compose、Chat、Mine 数据稳定；Login 独立双栏且无 App Shell。
- 900×1000：7 页均非空；业务页显示 80px 图标 rail，主内容未被 rail 遮挡；Login 仍独立双栏。
- 390×844：7 页均非空；业务页显示移动底 tab，当前项与路由一致；Login 独立单栏。
- 320×740：7 页均非空；移动底 tab 与固定评论输入可见，Login 独立单栏。
- P0 捕获的旧视觉/响应式现状：320px Chat 标题省略、Home 卡片正文/标题截断、PostDetail 日期换行，固定评论栏占据底部；均无页面崩溃，但作为 P2/P3/P6 的迁移比较点，不在 P0 修复。

## 6. P0 结束复核

- P0 结束时受保护树仍为 128 个文件，SHA-256 为 `b6fd1e703f9425f89d73369aab9b10eb3754c7e70eb4d826efe7c6f929f9678c`，与开始前完全一致。
- 该指纹覆盖前后端业务源码、前端 e2e、后端 test、schema/migration、前后端 lockfile、后端 package/config、前端 index/Playwright 配置和只读 prototype；证明这些受保护路径未被 P0 改写。允许修改的前端 `package.json` 单独核对，不包含在该指纹中。
- 前端 `package.json` 的 P0 允许差异仅为新增 `"visual:capture": "node scripts/capture-phase4-screenshots.mjs"`；未安装依赖，lockfile 指纹未变。
- 28 张截图尺寸/非空检查为 `28/28`，聚合 SHA-256 为 `b174901163f16301e51640ddb4e6e5bda1869e1721486f6ea419704e3d0f8b92`；截图服务结束后 5173 无监听残留。
- `pnpm e2e` 会按 Playwright 默认行为重建既有未跟踪的 `frontend/black_box/test-results/` 结果目录；P0 未手工清理该目录，也未把它作为业务差异。由于 P0.1 只记录到目录级状态、未保存其旧内容哈希，不能声称该生成目录内容前后逐字节一致。
- P0 未新增 e2e、未修改设计文档（本轮白名单不含设计文档）、未提交 Git。技术门禁已满足；用户人工确认前不进入 P1。
