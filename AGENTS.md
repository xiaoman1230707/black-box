# 一期至四期均已实现并人工验收通过；当前未自动进入第五期

> 一期（前端骨架 + 数据奠基）、二期（核心社交 + 数据正确性）、三期（游戏化 + AI 精简）、四期（视觉落地 + 工程收尾）均已实现并人工验收通过。第四期权威设计为 `docs/design/04-phase4-visual-polish.md`，实施与最终证据见 `docs/plans/04-phase4-implementation-plan.md`、`docs/qa/phase4/p6-regression-report.md`。当前不自动进入第五期；新的功能或工程批次仍遵守“先方案确认、后改代码”。

## 四期完成状态（细节见 04 设计与 P6 QA）
- **已完成**：foundation token + Inter + Neo-Brutalism 浅色视觉；全局组件与 Home/Search/PostDetail/Compose/Chat/Mine/Login 七页迁移；Markdown 安全渲染；toast/Dialog/统一状态；URL 配置、限流、强密钥校验、安全文件清理、丰富演示 seed；全量回归与多视口截图验收。
- **保持成立**：前三期路由、接口字段、状态管理和业务语义；App Shell 的 248/80/移动底 tab 结构；Search/Chat AI 检索与 SSE；Home tag×game 筛选与滚动恢复。
- **仍属非目标/后续债务**：profile/edit-profile/my-posts/my-likes；浏览量自增；评论 createdAt/migration；游戏专区/详情；多会话 AI；预设头像；正文 embedding；改帖；暗色入口。
- **独立工程债**：前端历史 lint 3 errors / 0 warnings 与后端历史 lint 债未在视觉迁移中扩范围清理；后续应单独立项，不影响第四期验收结论。

## e2e 工程质量保障(贯穿各期,不计入任一期功能范围)
- **跨期身份**:引入 Playwright、编写与维护 e2e、为测试加 `data-testid` 锚点,属**工程质量保障**,贯穿各期;在任意期"补 e2e / 加 testid 锚点"**不视为越界做他期内容**。
- **补 e2e 时机**:每完成一个功能并经**用户人工验收通过后**,才补该功能 e2e(e2e 用于锁定已确认正确的行为)。功能未经用户确认通过前**不写其 e2e**;写前先等用户那句"验收通过",**不自行判定**。
- **范围**:只测可程序化断言的关键链路(操作→可断言结果:守卫、表单提交、数据持久化、接口被调用等);**不写布局 / 视觉 / 像素断言**(靠人工验收 + 后续截图回归)。
- **组织**:按功能模块分文件、增量新增,**不重写或破坏已有 e2e**。
- **稳定性**:断言基于 URL / 文本 / `data-testid`,**避免 CSS 类名 / DOM 结构 / 像素**(防四期视觉改动后大面积失败);加 `data-testid` 仅作锚点、不改页面其他实现(守"碰壳不碰内"精神)。
- **现状**：`frontend/black_box/e2e/` 共 7 个 spec、41 条 Playwright 用例；`pnpm e2e` 运行，webServer 自动起 vite dev，现有用例主要通过路由拦截 mock 后端，无需起后端与数据库。

## 设计文档进度
- `docs/design/00-foundation.md` **已完成** —— 设计层(token / 全局组件契约 / App Shell / 路由约定 / data-state)的**单一事实来源**;各期功能设计须**引用它、不得另起一套**。
- `docs/design/01-phase1-skeleton.md`（一期）、`02-phase2-social.md`（二期）、`03-phase3-ai-gamification.md`（三期）均**已设计、已实现、已人工验收通过**。
- `docs/design/04-phase4-visual-polish.md`（四期）**已设计、已实现、已人工验收通过**。
- 依赖链：`01-分期概要设计.md`（总纲）→ `00-foundation.md`（底座）→ 01/02/03/04（均为已实现事实）。
- **实现纪律**:设计文档是实现的事实来源;**实现中若发现设计需调整,先更新设计文档、再改对应代码**,保持文档与代码一致,不让代码脱离文档先行。

## 下方架构描述是重构前现状、冲突以概要设计为准


# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack social media/posts application with AI capabilities:

- **Backend**: NestJS (Node.js) with PostgreSQL (Prisma ORM), JWT authentication, LangChain AI integration
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui

## Project Structure

```
black_box/
├── backend/backend/posts/     # NestJS backend (port 3000)
│   ├── src/
│   │   ├── ai/               # AI services (DeepSeek chat + semantic search)
│   │   ├── auth/             # JWT authentication
│   │   ├── posts/            # Posts CRUD
│   │   ├── prisma/           # Prisma service
│   │   └── users/            # User management
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── uploads/              # Static files (avatars, post images)
└── frontend/black_box/       # React frontend (port 5173 default)
    ├── src/
    │   ├── api/              # API client (axios with token refresh)
    │   ├── components/ui/    # shadcn/ui components
    │   ├── pages/            # Route pages
    │   ├── store/            # Zustand state management
    │   └── router/           # React Router config
    └── mock/                 # (Optional) vite-plugin-mock directory
```

## Common Commands

### Backend (from `backend/backend/posts/`)

```bash
# Development (watch mode)
pnpm start:dev

# Production build
pnpm build
pnpm start:prod

# Database
npx prisma migrate dev      # Run migrations
npx prisma generate         # Generate Prisma client
npx prisma studio           # Open Prisma Studio

# Testing
pnpm test                   # Unit tests (Jest)
pnpm test:e2e              # E2E tests
pnpm test:cov              # Coverage report

# Lint/Format
pnpm lint
pnpm format
```

### Frontend (from `frontend/black_box/`)

```bash
# Development
pnpm dev                    # Vite dev server (port 5173)

# Production build
pnpm build
pnpm preview

# Lint
pnpm lint
```

## Architecture Details

### Backend (NestJS)

- **API Prefix**: All routes prefixed with `/api`
- **Static Files**: Served from `/uploads` (avatars at `/uploads/avatar/resized/`, post images at `/uploads/resized/`)
- **Global Validation**: Uses `ValidationPipe` with `class-validator` for DTO validation
- **CORS**: Uses the validated `FRONTEND_ORIGIN`; production requires explicit origin, development defaults to `http://localhost:5173`

**Key Modules:**
- `AuthModule`: JWT strategy with access/refresh tokens
- `PostsModule`: Pagination with Prisma, includes user avatars, tags, likes, comments counts
- `AIModule`: DeepSeek 流式 chat + 标题向量语义搜索；embedding 由独立 `EmbeddingModule` 提供。DALL-E/RAG/Git AI 已在三期物理删除。
- `PrismaModule`: Database access via PrismaClient

**Environment Variables** (see `.env`):
- `DATABASE_URL`: PostgreSQL connection
- `TOKEN_SECRET`: JWT signing secret
- `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`: LLM provider
- `OPENAI_API_KEY` / `OPENAI_BASE_URL`: Title embeddings (`text-embedding-3-small`)
- `PUBLIC_BASE_URL` / `FRONTEND_ORIGIN`: Public media URL construction and exact CORS origin
- `VITE_API_BASE_URL`: Frontend API base, injected explicitly for build/CI

### Frontend (React + Vite)

- **Base Path**: API calls are constructed by `src/config/runtime.ts` from `VITE_API_BASE_URL`
- **Path Alias**: `@/` maps to `src/`
- **State Management**: Zustand with persistence (user store in localStorage)
- **Styling**: Tailwind CSS v4 (no config file, uses CSS `@theme`)
- **UI Components**: shadcn/ui (base-nova style)
- **Route Protection**: `RequireAuth` 在路由层保护 `/search`、`/chat`、`/mine`、`/compose`

**Key Patterns:**
- Token refresh is handled transparently in axios interceptors (`api/config.ts`)
- Route-based code splitting with `React.lazy()` (react-activation/keep-alive removed in phase 2 — it was misdiagnosed as the cause of an `insertBefore` white-screen crash and removed, but was actually innocent; kept removed anyway since 0.13.4 is unadapted to React 19. Home state kept in store; scroll restored via sessionStorage, saved in real time on `scroll`)
- Zustand stores: `useUserStore`、`useHomeStore`、`search`、`useChatStore`；rag/git store 已删除

## Testing

### Backend Unit Tests

Tests are co-located with source files as `*.spec.ts`. Run with:
```bash
pnpm test              # All tests
pnpm test -- --testNamePattern="create"  # Specific test
```

Jest config is embedded in `package.json`:
- Root dir: `src`
- Test regex: `.*\.spec\.ts$`
- Transform: `ts-jest`

### Backend E2E Tests

Located in `test/` directory with `.e2e-spec.ts` suffix. Config in `test/jest-e2e.json`.

### Frontend

Playwright 已配置于 `frontend/black_box/playwright.config.ts`，当前基线为 7 个 spec、41 条用例；运行 `pnpm e2e`。视觉回归在四期采用多视口人工验收与截图基线，不把 CSS/DOM/像素写入行为 e2e。

## Database Schema (Prisma)

Key entities:
- `User`: Authentication, has posts, comments, likes, avatars, files
- `Post`: Content with tags, likes, comments, files
- `Comment`: Nested replies (self-referential)
- `Tag`: Many-to-many with posts via `PostTag`
- `UserLikePost`: Junction table for post likes
- `Avatar` / `File`: Upload metadata with image dimensions

Relations use `onDelete: Cascade` or `SetNull` appropriately.

## AI Features

The AI service (`ai.service.ts`) provides:
1. **Chat**：DeepSeek 流式回答，使用站内标题向量检索并通过 annotation 引用真实帖子；JWT 保护，单会话由前端内存 store 保持。
2. **Search**：`text-embedding-3-small` 标题向量存库，查询时查库并在应用层计算余弦相似度；JWT 保护。

DALL-E 头像、开发文档 RAG、Git commit 生成器及其前端入口/store/API 已在三期物理删除。

## Important Notes

- Backend runs on port 3000, frontend on port 5173 (Vite default)
- Public image URLs are constructed by the backend `publicMediaUrl()` helper from validated `PUBLIC_BASE_URL`
- Token refresh logic queues concurrent requests during refresh
- The `insertBefore` white-screen crash on navigate / portal-commit is caused by **browser translation extensions mutating the DOM** (breaking React 19's strict fiber↔DOM correspondence — confirmed by the crash disappearing once extensions are disabled), hardened with `<body translate="no">` (covers both the `#root` navigate path and body-level portal popups) + a global `ErrorBoundary` (reload-to-recover, no white screen). react-activation/keep-alive was **removed** in phase 2 — it was only "present" on the error stack and wrongly blamed (not the culprit), but kept removed since 0.13.4 is unadapted to React 19. Home list state is preserved by `useHomeStore` (global, survives unmount); scroll restored via sessionStorage (saved in real time on `scroll`); detail-page like/comment counts propagate via `useHomeStore.patchPost`, and newly created posts via `useHomeStore.prependPost`


# 重要
`docs/prototype` 作为第四期视觉与交互意图参照，只读；视觉数值以 `docs/prototype/css/system.css` 为准，业务实现与范围以 `docs/design/04-phase4-visual-polish.md` 为准。不得直接复制原型假数据、DOM 脚本、inline style 或未实现页面能力。
