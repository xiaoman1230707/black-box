# Black-box 四期后个人内容批次 O2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to execute O2.0～O2.5 task-by-task and stop at every user checkpoint. Use `test-driven-development` before product implementation and `verification-before-completion` before any completion claim. Do not use subagents unless the user separately authorizes them.

**Goal:** 在不增加数据库语义的前提下，为当前 JWT 用户提供“我的发布”和“我的收藏（点赞）”两个可分页列表，并从 Mine 提供真实入口。

**Architecture:** Posts 模块新增两条 JWT 保护的只读静态路由，复用从 `findAll()` 抽出的帖子分页、关联和映射边界；前端以两个薄路由页配置同一个 `PersonalPostListPage`，使用页面本地状态、现有 `PostItem`、`PageState`、`InfiniteScroll` 与 `BackToTop`。收藏继续读取 `UserLikePost`，不建立第二套收藏表或 store。

**Tech Stack:** NestJS 11、Prisma 6、PostgreSQL、React 19、React Router 7、TypeScript 5.9、Zustand 5、Tailwind CSS v4、Vitest 4、Jest 30、Playwright 1.61。

---

## 一、执行总则

1. 权威设计为 `docs/design/06-post-phase4-personal-content.md`，终态为“已实现、已人工验收通过”。O2 是第四期后的独立功能批次，不代表第五期启动。
2. 严格保持五个责任边界：
   - O2.1：后端最小只读能力；
   - O2.2：前端共享列表、API、路由；
   - O2.3：Mine 两入口；
   - O2.4：完整回归和用户人工验收；
   - O2.5：人工验收通过后才新增 5 条 Playwright。
3. 不修改 Prisma schema、migration、seed、依赖、lockfile、运行配置、原型、`AGENTS.md`、AI、JWT 策略、SSE、Home store、Search、Chat、点赞写接口或评论语义。
4. “收藏”只用于 UI 文案；代码、API 和数据库继续使用 `liked` / `UserLikePost`。不得新增 Favorite 表、第二套收藏状态或同步写入。
5. 两条私有接口只从 `req.user.id` 取用户身份；DTO、路径、query 和 body 均不接受任意 `userId`。
6. 保留当前工作树的用户改动，尤其不得编辑、格式化、删除或覆盖 `CLAUDE.md`。O2.0 记录其 SHA-256，O2.4 再核对。
7. 人工验收通过前，Playwright 必须保持 8 files / 46 tests；不得新增、删除、改写或放宽既有 e2e。
8. 不自动提交 Git。每个批次结束只形成可审查 diff 与验证证据；用户另行授权后才执行提交。

### 1.1 差分 lint 门禁

- O2 新增或修改的前端 TS/TSX 文件必须 `0 errors / 0 warnings`。
- 前端全量 lint 不高于已批准基线 `3 errors / 0 warnings`；剩余问题只允许来自 `src/components/ui/badge.tsx` 1 条和 `src/utils/index.ts` 2 条，不表述为“全仓 lint 通过”。
- 后端新增文件必须 `0 errors / 0 warnings`；修改的历史文件不得新增 lint 问题。
- 后端 `pnpm lint` 自带 `--fix`，实施与验收使用 `pnpm exec eslint <O2 文件>` 做无写入定向检查，不用全量 `pnpm lint` 改写历史文件。

### 1.2 固定接口与页面契约

```ts
// 后端分页 DTO
export class PostPageQueryDto {
  page?: number = 1
  limit?: number = 10
}

// 前端响应
export interface PostsResponse {
  items: Post[]
  total: number
}

export type PersonalPostListKind = "published" | "liked"
```

| 能力 | 固定路径 | 鉴权 | 排序 | 响应 |
|---|---|---|---|---|
| 我的发布 API | `GET /api/posts/mine` | `JwtAuthGuard` | `Post.id desc` | `{ items, total }` |
| 我的收藏 API | `GET /api/posts/liked` | `JwtAuthGuard` | `Post.id desc` | `{ items, total }` |
| 我的发布页面 | `/mine/posts` | `RequireAuth` | 服务端顺序 | 共享列表页 |
| 我的收藏页面 | `/mine/likes` | `RequireAuth` | 服务端顺序 | 共享列表页 |

分页默认 `page=1`、`limit=10`；两条静态 controller 路由必须声明在 `@Get(':id')` 前。公共 `GET /posts` 的 tag×game、匿名读取、`likedByMe` 与返回字段保持不变。

---

## 二、文件职责矩阵

### 2.1 后端产品与测试

| 路径 | 动作 | 批次 | 职责 |
|---|---|---|---|
| `backend/backend/posts/src/posts/dto/post-page-query.dto.ts` | 新增 | O2.1 | 仅定义 page/limit 及转换、最小值校验 |
| `backend/backend/posts/src/posts/dto/post-query.dto.ts` | 修改 | O2.1 | 继承分页 DTO，继续定义 tag/gameId |
| `backend/backend/posts/src/posts/posts.controller.ts` | 修改 | O2.1 | 在 `:id` 前增加 mine/liked JWT 只读路由 |
| `backend/backend/posts/src/posts/posts.service.ts` | 修改 | O2.1 | 抽取共享分页映射，新增本人发布/点赞查询 |
| `backend/backend/posts/src/posts/posts.service.spec.ts` | 新增 | O2.1 | 公共列表回归、mine/liked where、分页、映射、likedByMe |
| `backend/backend/posts/src/posts/posts.controller.spec.ts` | 新增 | O2.1 | 静态路由、JWT 用户边界、参数传递与错误透传 |

### 2.2 前端产品与实现期单测

| 路径 | 动作 | 批次 | 职责 |
|---|---|---|---|
| `frontend/black_box/src/types/index.ts` | 修改 | O2.2 | 补齐统一 `PostsResponse.total` 与列表 kind 类型 |
| `frontend/black_box/src/api/personal-posts.ts` | 新增 | O2.2 | 两条不吞异常的 JWT 只读 API helper |
| `frontend/black_box/src/api/personal-posts.test.ts` | 新增 | O2.2 | URL、page/limit、错误透传 |
| `frontend/black_box/src/pages/personal/personal-post-list-state.ts` | 新增 | O2.2 | 纯函数去重、分页完成判断，便于 Node 单测 |
| `frontend/black_box/src/pages/personal/PersonalPostListPage.tsx` | 新增 | O2.2 | 两页唯一容器、请求竞态、分页与状态组合 |
| `frontend/black_box/src/pages/personal/PersonalPostListPage.test.tsx` | 新增 | O2.2 | SSR 状态呈现、重试、去重与分页纯逻辑 |
| `frontend/black_box/src/pages/MyPosts.tsx` | 新增 | O2.2 | 固定 `kind="published"` 的薄页面 |
| `frontend/black_box/src/pages/MyLikes.tsx` | 新增 | O2.2 | 固定 `kind="liked"` 的薄页面 |
| `frontend/black_box/src/router/index.tsx` | 修改 | O2.2 | lazy 加载两页并以 RequireAuth 接线 |
| `frontend/black_box/src/pages/Mine.tsx` | 修改 | O2.3 | 添加两个语义 Link 入口，不预取计数 |
| `frontend/black_box/src/pages/Mine.test.tsx` | 新增 | O2.3 | 两入口 href、文案及现有账户操作存在性 |

### 2.3 QA、设计与规划记录

| 路径 | 动作 | 批次 | 职责 |
|---|---|---|---|
| `docs/qa/post-phase4-personal-content/baseline.md` | 新增 | O2.0 | HEAD、脏工作树、版本、自动基线与历史 lint |
| `docs/qa/post-phase4-personal-content/protected-files-before.sha256` | 新增 | O2.0 | 冻结 `CLAUDE.md` 与所有 O2 禁改文件 |
| `docs/qa/post-phase4-personal-content/backend-report.md` | 新增 | O2.1 | Jest、build、定向 lint 与接口审查证据 |
| `docs/qa/post-phase4-personal-content/frontend-report.md` | 新增 | O2.2～O2.3 | unit、build、lint、路由与 Mine 回归证据 |
| `frontend/black_box/scripts/capture-personal-content-screenshots.mjs` | 新增 | O2.4 | 稳定 mock 两 API，捕获 Mine/两列表四视口 |
| `docs/qa/post-phase4-personal-content/screenshots/` | 新增 | O2.4 | 1440、900、390、320 的默认态与专项状态证据 |
| `docs/qa/post-phase4-personal-content/implementation-report.md` | 新增 | O2.4 | 全量门禁、人工链路、越界检查和待验收状态 |
| `docs/qa/post-phase4-personal-content/protected-files-after.sha256` | 新增 | O2.4 | 与 before 逐项比较 |
| `docs/design/06-post-phase4-personal-content.md` | 状态回填 | O2.4～O2.5 | 已实施待验收、人工通过、e2e 终态 |
| `docs/design/00-foundation.md` | 事实回填 | O2.5 | 人工验收后登记两条二级路由与共享列表契约 |
| `.planning/post-phase4-personal-content/*` | 更新 | 全程 | 检查点、发现、结果与关闭记录 |

### 2.4 人工验收后才允许新增

| 路径 | 动作 | 批次 | 职责 |
|---|---|---|---|
| `frontend/black_box/e2e/personal-content.spec.ts` | 新增 | O2.5 | 5 条稳定行为用例，终态 9 files / 51 tests |

### 2.5 明确禁止触碰

- `CLAUDE.md`、`AGENTS.md`、`docs/prototype/`
- 前后端 `package.json`、lockfile、Vite/Playwright/Nest 配置
- `backend/backend/posts/prisma/` 全部 schema、migration 与 seed
- `backend/backend/posts/src/users/`、`src/ai/`、`src/auth/`
- `frontend/black_box/src/pages/Home.tsx`、`Search.tsx`、`Chat.tsx`、`Compose.tsx`、`post/index.tsx`
- `frontend/black_box/src/components/Sidebar.tsx`、`PostItem.tsx`、`PageState.tsx`、`InfiniteScroll.tsx`、`BackToTop.tsx`
- `frontend/black_box/src/store/`、现有点赞/评论 API、既有 Playwright（O2.5 前）

若实现证明禁改文件必须改变，停止对应批次并回到设计评审，不自行扩大矩阵。

---

## 三、O2.0：范围冻结与基线

**Files:**
- Create: `docs/qa/post-phase4-personal-content/baseline.md`
- Create: `docs/qa/post-phase4-personal-content/protected-files-before.sha256`
- Create: `docs/qa/phase4/screenshots/o2-before/`
- Modify: `.planning/post-phase4-personal-content/task_plan.md`
- Modify: `.planning/post-phase4-personal-content/progress.md`

**完成目标：** 建立可复核的代码、测试、lint 与用户改动基线；基线不成立则不进入 O2.1。

- [x] **Step 1：记录工作树和工具版本**

在仓库根目录执行并把输出写入 baseline：

```powershell
git rev-parse HEAD
git branch --show-current
git status --short
git diff --stat
node --version
pnpm --version
```

按“用户已有改动 / O2 文档与 planning / O2 预计产品文件”分栏记录。不得读取或记录 `.env` 内容、数据库连接串、token 或 key。

- [x] **Step 2：生成禁改文件内容清单**

```powershell
$protectedPaths = @(
  'CLAUDE.md',
  'AGENTS.md',
  'docs/prototype',
  'frontend/black_box/package.json',
  'frontend/black_box/pnpm-lock.yaml',
  'frontend/black_box/vite.config.ts',
  'frontend/black_box/playwright.config.ts',
  'frontend/black_box/src/pages/Home.tsx',
  'frontend/black_box/src/pages/Search.tsx',
  'frontend/black_box/src/pages/Chat.tsx',
  'frontend/black_box/src/pages/Compose.tsx',
  'frontend/black_box/src/pages/post',
  'frontend/black_box/src/components/Sidebar.tsx',
  'frontend/black_box/src/components/PostItem.tsx',
  'frontend/black_box/src/components/PageState.tsx',
  'frontend/black_box/src/components/InfiniteScroll.tsx',
  'frontend/black_box/src/components/BackToTop.tsx',
  'frontend/black_box/src/store',
  'backend/backend/posts/package.json',
  'backend/backend/posts/pnpm-lock.yaml',
  'backend/backend/posts/prisma',
  'backend/backend/posts/src/users',
  'backend/backend/posts/src/ai',
  'backend/backend/posts/src/auth'
)
$root = (Get-Location).Path
$protectedFiles = foreach ($path in $protectedPaths) {
  if (Test-Path -LiteralPath $path -PathType Container) {
    Get-ChildItem -LiteralPath $path -File -Recurse
  } else {
    Get-Item -LiteralPath $path
  }
}
$protectedFiles |
  Sort-Object FullName |
  ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    $relative = $_.FullName.Substring($root.Length + 1)
    "$hash  $relative"
  } |
  Set-Content -Encoding utf8 docs/qa/post-phase4-personal-content/protected-files-before.sha256
```

清单必须包含 `CLAUDE.md` 且不含 `.env`。任一路径缺失或哈希失败即停止。

- [x] **Step 3：运行前端现状基线**

```powershell
cd frontend/black_box
pnpm test:unit
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm lint
pnpm exec playwright test --list
pnpm e2e
```

期望：Vitest 13 files / 39 tests；build 成功；lint 为批准的 3/0 且路径不变；Playwright 8 files / 46 tests，46 passed。若数字漂移，先按真实结果调查并更新 baseline，不通过时不修改产品代码。

- [x] **Step 4：运行后端现状基线**

```powershell
cd ../../backend/backend/posts
pnpm test -- --runInBand
pnpm build
pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
```

期望：Jest 15 suites / 64 tests，build 成功；无 `--fix` 的全量 ESLint 只记录历史问题总数与路径，不据此扩大 O2。后端测试或 build 基线失败时停止，不用 O2 顺手修历史问题。

- [x] **Step 5：冻结真实引用与接口基线**

```powershell
cd ../../..
rg -n "@Get\(':id'\)|findAll\(|UserLikePost|user_like_posts" backend/backend/posts/src backend/backend/posts/prisma/schema.prisma
rg -n "path='mine'|RequireAuth|PostItem|InfiniteScroll|PageState|BackToTop" frontend/black_box/src
rg -n "mine/posts|mine/likes|posts/mine|posts/liked" frontend/black_box/src backend/backend/posts/src
```

期望最后一条无产品实现命中；若已有同名能力，停止并重新核对设计，不重复实现。

- [x] **Step 6：生成实施前视觉基线**

复用现有 `visual:capture` QA 脚本，不修改截图脚本、页面或产品路由。使用稳定 route mock、固定登录态和 reduced-motion，生成 Home、Search、PostDetail、Compose、Chat、Mine、Login 七页在 1440×1000、900×1000、390×844、320×740 下的 28 张默认态截图：

```powershell
cd frontend/black_box
pnpm visual:capture -- --stage=o2-before --base-url=http://localhost:5173
```

截图输出到 `docs/qa/phase4/screenshots/o2-before/`。人工抽查 Mine 四视口及其 App Shell 上下文，记录当前无个人内容入口、无横向页面溢出、移动底栏不遮挡；O2 尚不存在的两页不伪造截图。截图失败或数量不是 28 时停止，不进入 O2.1。

**Checkpoint O2.0：** 提交 baseline 与哈希证据供用户确认；未经确认不进入 O2.1。

---

## 四、O2.1：后端最小只读能力

**Files:**
- Create: `backend/backend/posts/src/posts/dto/post-page-query.dto.ts`
- Modify: `backend/backend/posts/src/posts/dto/post-query.dto.ts`
- Modify: `backend/backend/posts/src/posts/posts.controller.ts`
- Modify: `backend/backend/posts/src/posts/posts.service.ts`
- Create: `backend/backend/posts/src/posts/posts.service.spec.ts`
- Create: `backend/backend/posts/src/posts/posts.controller.spec.ts`
- Create/Modify: `docs/qa/post-phase4-personal-content/backend-report.md`
- Modify: `.planning/post-phase4-personal-content/*`

**完成目标：** 两条 JWT 只读接口准确分页当前用户数据，同时公共 `GET /posts` 行为逐项回归。

- [x] **Step 1：先写失败的 service 测试**

用 Prisma mock 锁定以下行为：

1. `findAll()` 仍把 tag 与 gameId 合并为 AND，并保持 `id desc`、skip/take 和 `{items,total}`。
2. `findMine(query, userId)` 的 where 仅为 `{ userId }`。
3. `findLiked(query, userId)` 的 where 为 `{ likes: { some: { userId } } }`，不查询或返回收藏时间。
4. 三条列表路径使用同一关联结构、媒体 URL、统计、匿名作者 fallback 和字段映射。
5. 登录用户对本页 postId 批量查询 `UserLikePost`，不产生 N+1；匿名公共列表全部 `likedByMe=false`。
6. page/limit 形成正确 skip/take；空页返回空 items 和准确 total。
7. 传入 O2 方法的用户 id 只来自方法第二参数，where 不读取 query 上的额外字段。

先运行：

```powershell
cd backend/backend/posts
pnpm test -- --runInBand src/posts/posts.service.spec.ts
```

期望：因为方法和 DTO 尚不存在而失败。记录失败摘要后再实现。

- [x] **Step 2：先写失败的 controller 测试**

使用 `@nestjs/testing` + `supertest` 建立最小 Nest app，override `JwtAuthGuard` 注入固定 `req.user.id='7'`，并 mock PostsService。测试：

1. `GET /posts/mine?page=2&limit=5` 命中 `findMine({page:2,limit:5}, 7)`，不是 `getPostById('mine')`。
2. `GET /posts/liked` 命中 `findLiked({page:1,limit:10}, 7)`，不是动态 id 路由。
3. query 中附带 `userId=999` 时，全局 ValidationPipe whitelist 后 service 仍只收到 JWT 用户 7 和 page/limit。
4. 未通过 guard 时返回 401；service 异常保持现有 Nest 错误语义，不伪装为空列表。

```powershell
pnpm test -- --runInBand src/posts/posts.controller.spec.ts
```

期望：静态路由和方法尚不存在而失败。

- [x] **Step 3：实现共享分页 DTO**

`post-page-query.dto.ts` 只包含：

```ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PostPageQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
```

`PostQueryDto extends PostPageQueryDto`，只保留 tag/gameId 声明。不得新增 userId、sort、visibility 或业务过滤字段。

- [x] **Step 4：抽取 PostsService 私有查询/映射边界**

将 `findAll()` 现有的 count/findMany、include、likedByMe 批量查询和 map 原样迁入：

```ts
private async findPostPage(
    where: Prisma.PostWhereInput,
    { page = 1, limit = 10 }: PostPageQueryDto,
    currentUserId?: number,
) {
    // 现有 skip、count/findMany include、likedSet 与 map 只迁移不改语义
}
```

公开方法保持窄职责：

```ts
async findAll(query: PostQueryDto, userId?: number) {
    // 保留现有 tagFilter + gameFilter AND
    return this.findPostPage(where, query, userId);
}

async findMine(query: PostPageQueryDto, userId: number) {
    return this.findPostPage({ userId }, query, userId);
}

async findLiked(query: PostPageQueryDto, userId: number) {
    return this.findPostPage(
        { likes: { some: { userId } } },
        query,
        userId,
    );
}
```

不改 `findOne/create/like/unlike`，不触碰 embedding。`liked` 列表中的每项自然为 `likedByMe=true`，但仍由共享批量查询计算，不硬编码。

- [x] **Step 5：实现 controller 静态路由**

在 `@Get(':id')` 前声明：

```ts
@Get('mine')
@UseGuards(JwtAuthGuard)
async getMyPosts(@Query() query: PostPageQueryDto, @Req() req) {
    return this.postsService.findMine(query, Number(req.user.id));
}

@Get('liked')
@UseGuards(JwtAuthGuard)
async getLikedPosts(@Query() query: PostPageQueryDto, @Req() req) {
    return this.postsService.findLiked(query, Number(req.user.id));
}
```

不得接收 userId 参数，不改公开列表 OptionalJwtAuthGuard，也不把路由放入 UsersController。

- [x] **Step 6：运行后端定向与全量验证**

```powershell
pnpm test -- --runInBand src/posts/posts.service.spec.ts src/posts/posts.controller.spec.ts
pnpm test -- --runInBand
pnpm build
pnpm exec eslint src/posts/dto/post-page-query.dto.ts src/posts/dto/post-query.dto.ts src/posts/posts.controller.ts src/posts/posts.service.ts src/posts/posts.controller.spec.ts src/posts/posts.service.spec.ts
git diff --check -- src/posts
```

期望：新增测试全部通过；全量不少于基线 15 suites / 64 tests 且零失败；build 成功；O2 后端文件 lint 0/0；无补丁错误。记录实际 suite/test 数，不用预估数替代实测数。

- [x] **Step 7：接口只读审查**

静态核对：

```powershell
rg -n "@Get\('mine'\)|@Get\('liked'\)|@Get\(':id'\)" src/posts/posts.controller.ts
rg -n "create\(|update\(|delete\(|upsert\(" src/posts/posts.service.ts
git diff -- prisma src/users src/auth src/ai
```

确认新增路径没有 Prisma 写操作，且 schema/users/auth/ai 无 diff。写入 `backend-report.md`。

**Checkpoint O2.1：** 用户确认后端只读能力、公共列表回归与测试证据后进入 O2.2。未经确认不改前端产品文件。

---

## 五、O2.2：前端共享列表、API 与路由

**Files:**
- Modify: `frontend/black_box/src/types/index.ts`
- Create: `frontend/black_box/src/api/personal-posts.ts`
- Create: `frontend/black_box/src/api/personal-posts.test.ts`
- Create: `frontend/black_box/src/pages/personal/personal-post-list-state.ts`
- Create: `frontend/black_box/src/pages/personal/PersonalPostListPage.tsx`
- Create: `frontend/black_box/src/pages/personal/PersonalPostListPage.test.tsx`
- Create: `frontend/black_box/src/pages/MyPosts.tsx`
- Create: `frontend/black_box/src/pages/MyLikes.tsx`
- Modify: `frontend/black_box/src/router/index.tsx`
- Create/Modify: `docs/qa/post-phase4-personal-content/frontend-report.md`
- Modify: `.planning/post-phase4-personal-content/*`

**完成目标：** 两条受保护路由共享一套准确区分 loading/empty/error/load-more-error 的列表实现，不接入全局 store。

- [x] **Step 1：先写 API 失败测试**

mock `@/api/config` 的 axios instance，断言：

1. `fetchMyPosts(2, 10, signal)` 调用 `/posts/mine`，params 只有 page/limit，并透传 signal。
2. `fetchLikedPosts(3, 5, signal)` 调用 `/posts/liked`。
3. API reject 原样向上抛，不折叠为 `{items:[],total:0}`。
4. helper 不读取 userId 或手动拼 Authorization；JWT 继续由现有 interceptor 注入。

```powershell
cd frontend/black_box
pnpm exec vitest run --config vitest.config.ts src/api/personal-posts.test.ts
```

期望：模块尚不存在而失败。

- [x] **Step 2：先写共享状态/视图失败测试**

当前 Vitest 使用 Node 环境且项目没有 DOM Testing Library，不新增测试依赖。测试采用现有 `renderToStaticMarkup` + `MemoryRouter`，并把纯数据逻辑放在 `.ts` helper：

1. initial loading 输出 `PageState loading`。
2. 首屏成功但 items 为空输出准确 empty 文案。
3. 首屏失败输出 error 与重试按钮，不伪装 empty。
4. 已有 items 时下一页失败保留原列表并显示局部 retry，不替换整页。
5. published/liked 两种配置显示正确标题、总数和空态文案。
6. `mergeUniquePosts` 按 id 保留首次顺序并去重 offset 重叠项。
7. `hasMore` 以去重后 items.length 与最新 total 判断；total 下降时不会继续无限请求。
8. 每个 PostItem 继续拿完整 Post，不创建私有卡片结构。

```powershell
pnpm exec vitest run --config vitest.config.ts src/pages/personal/PersonalPostListPage.test.tsx
```

期望：组件和 helper 尚不存在而失败。

- [x] **Step 3：实现类型与专用 API**

统一公开类型：

```ts
export interface PostsResponse {
  items: Post[]
  total: number
}

export type PersonalPostListKind = "published" | "liked"
```

专用 API 不 catch：

```ts
export function fetchMyPosts(page = 1, limit = 10, signal?: AbortSignal) {
  return instance.get<never, PostsResponse>("/posts/mine", {
    params: { page, limit },
    signal,
  })
}

export function fetchLikedPosts(page = 1, limit = 10, signal?: AbortSignal) {
  return instance.get<never, PostsResponse>("/posts/liked", {
    params: { page, limit },
    signal,
  })
}
```

不修改会吞异常的 `fetchPosts`，避免改变 Home 行为。

- [x] **Step 4：实现共享列表状态机**

页面本地状态至少区分：

```ts
type RequestState = "loading" | "ready" | "error"

interface PersonalPostListState {
  items: Post[]
  total: number
  page: number
  requestState: RequestState
  isLoadingMore: boolean
  loadMoreError: string | null
}
```

实现规则：

- mount 时请求第一页；unmount 用 AbortController 取消，Abort 不显示错误。
- 首屏失败保留 `requestState='error'`，retry 重发第一页。
- 加载更多失败保留已有 items，只显示局部 retry；成功后按 id 去重并更新 total/page。
- 用递增 request id 或等价机制拒绝过期响应；同一页 busy 时不重复请求。
- `hasMore = items.length < total`；无更多时 InfiniteScroll 不再观察。
- 不写 sessionStorage、不接 useHomeStore、不承诺详情返回页码和 scrollY。
- 两页配置只决定标题、说明、empty 文案和 API 函数，状态实现只有一份。

- [x] **Step 5：组合现有组件与薄页面**

`PersonalPostListPage` 使用：

- 页面 `<main>` 与现有 App Shell 内容宽度；
- `PageState` 展示首屏 loading/empty/error；
- `PostItem` 展示列表并保持 `/post/:id`、键盘与图片 fallback；
- `InfiniteScroll` 触发下一页；
- 继承 `App.tsx` 中全局唯一的 `BackToTop` 处理长列表，不在页面重复渲染第二个实例；
- `Button` 提供首屏/下一页 retry；
- 不新增个人列表 Card、Skeleton 或私有反馈体系。

薄页面只传固定 kind：

```tsx
export default function MyPosts() {
  return <PersonalPostListPage kind="published" />
}

export default function MyLikes() {
  return <PersonalPostListPage kind="liked" />
}
```

- [x] **Step 6：接线路由守卫**

在 router 中 lazy import 两页，在现有 MainLayout 子路由中增加：

```tsx
<Route path="mine/posts" element={<RequireAuth><MyPosts /></RequireAuth>} />
<Route path="mine/likes" element={<RequireAuth><MyLikes /></RequireAuth>} />
```

保持 `/mine` 原路由、Sidebar 四项、Login redirect 语义和其他路由不变。

- [x] **Step 7：运行前端定向验证**

```powershell
pnpm exec vitest run --config vitest.config.ts src/api/personal-posts.test.ts src/pages/personal/PersonalPostListPage.test.tsx
pnpm exec eslint src/types/index.ts src/api/personal-posts.ts src/api/personal-posts.test.ts src/pages/personal/personal-post-list-state.ts src/pages/personal/PersonalPostListPage.tsx src/pages/personal/PersonalPostListPage.test.tsx src/pages/MyPosts.tsx src/pages/MyLikes.tsx src/router/index.tsx
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm exec playwright test --list
pnpm e2e
```

期望：O2.2 unit 全过，定向 lint 0/0，build 成功，Playwright 仍为 8 files / 46 passed。此时尚无 Mine 入口，只允许用直接 URL 做开发核对。

**Checkpoint O2.2：** 用户确认共享实现、两路由、状态边界和 46 条回归后进入 O2.3。

---

## 六、O2.3：Mine 两个真实入口

**Files:**
- Modify: `frontend/black_box/src/pages/Mine.tsx`
- Create: `frontend/black_box/src/pages/Mine.test.tsx`
- Modify: `docs/qa/post-phase4-personal-content/frontend-report.md`
- Modify: `.planning/post-phase4-personal-content/*`

**完成目标：** 在不破坏账户摘要、头像 Drawer→Loading 和退出时序的前提下，提供两个语义清晰、可键盘访问的 Mine 内部入口。

- [x] **Step 1：先写 Mine 入口失败测试**

使用当前 Node/SSR 测试模式：设置 `useUserStore` 的稳定用户快照，在 `MemoryRouter` 中渲染 Mine，断言：

1. `data-testid="mine-posts-link"` 的 href 为 `/mine/posts`。
2. `data-testid="mine-likes-link"` 的 href 为 `/mine/likes`。
3. 文案明确为“我的发布”“我的收藏”，收藏不出现独立 Favorite 技术词。
4. 原 `mine-avatar`、`avatar-upload-btn` 和“退出登录”仍存在。
5. 入口不展示虚构数量，不在渲染时调用个人列表 API。

```powershell
pnpm exec vitest run --config vitest.config.ts src/pages/Mine.test.tsx
```

期望：入口尚不存在而失败。

- [x] **Step 2：实现 Mine 入口 section**

在账户 Card 与退出按钮之间增加一个“个人内容” section：

- 两个入口都使用 React Router `Link` 语义，可用 P1 `Button render={<Link />}` 或现有 Card 组合，但不得新增基础组件。
- 图标使用现有 lucide `FileText` 与 `Heart`，文字和辅助说明可换行。
- 1440/900 可两列，390/320 单列；每个交互目标最小 44px，不产生页面横向滚动。
- 使用 token，不写 inline style、旧色阶、柔阴影或私有圆角。
- 不请求、缓存或伪造计数。
- 不改变头像 Drawer 的 `open`、上传前关闭、随后 Loading、成功/失败反馈和 logout handler。

- [x] **Step 3：运行 Mine 与整体现有回归**

```powershell
pnpm exec vitest run --config vitest.config.ts src/pages/Mine.test.tsx
pnpm test:unit
pnpm exec eslint src/pages/Mine.tsx src/pages/Mine.test.tsx
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm e2e
```

期望：Mine 定向 lint 0/0；全量 unit 通过；build 成功；现有 46 条 Playwright 全过且未改 e2e。

**Checkpoint O2.3：** 用户确认 Mine 入口与头像/退出回归后进入 O2.4。

---

## 七、O2.4：完整回归、截图与人工验收门禁

**Files:**
- Create: `frontend/black_box/scripts/capture-personal-content-screenshots.mjs`
- Create: `docs/qa/post-phase4-personal-content/screenshots/**`
- Create/Modify: `docs/qa/post-phase4-personal-content/implementation-report.md`
- Create: `docs/qa/post-phase4-personal-content/protected-files-after.sha256`
- Modify: `docs/design/06-post-phase4-personal-content.md`
- Modify: `.planning/post-phase4-personal-content/*`

**完成目标：** 用稳定 mock 和真实只读串验形成自动、视觉、安全、数据一致性证据；只标记“已实施，待人工验收”。

- [x] **Step 1：执行前后端完整自动矩阵**

```powershell
cd backend/backend/posts
pnpm test -- --runInBand
pnpm build
pnpm exec eslint src/posts/dto/post-page-query.dto.ts src/posts/dto/post-query.dto.ts src/posts/posts.controller.ts src/posts/posts.service.ts src/posts/posts.controller.spec.ts src/posts/posts.service.spec.ts

cd ../../../frontend/black_box
pnpm test:unit
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm exec eslint src/types/index.ts src/api/personal-posts.ts src/api/personal-posts.test.ts src/pages/personal/personal-post-list-state.ts src/pages/personal/PersonalPostListPage.tsx src/pages/personal/PersonalPostListPage.test.tsx src/pages/MyPosts.tsx src/pages/MyLikes.tsx src/pages/Mine.tsx src/pages/Mine.test.tsx src/router/index.tsx
pnpm lint
pnpm exec playwright test --list
pnpm e2e
```

门禁：O2 定向 lint 0/0；前端全量不高于 3/0且历史路径不变；build 均成功；全部 unit/Jest 通过；Playwright 仍为 8 files / 46 passed。

- [x] **Step 2：生成稳定截图**

新增 QA 脚本只做测试路由 mock，不注册产品路由、不放入 `e2e/`、不写像素断言、不调用真实后端。固定登录态、图片响应、第一页/第二页数据和 reduced-motion；等待 `data-testid` 稳定锚点而非固定 sleep。

默认态捕获 3 页 × 4 视口共 12 张：

- 1440×1000
- 900×1000
- 390×844
- 320×740

页面：Mine、MyPosts、MyLikes。另捕获 MyPosts empty、MyLikes error、MyLikes loaded+load-more-error 的专项状态，不计入 12 张默认态。

```powershell
node scripts/capture-personal-content-screenshots.mjs --base-url=http://localhost:5173
```

人工检查：无页面横向溢出、双滚动、底部 72px 导航遮挡；长标题/作者名可断行或截断；图片失败使用 PostItem token fallback；PageState 和 retry 不跳布局。

- [x] **Step 3：人工串验关键链路**

使用可控登录账号与真实只读 API，不记录密码/token：

1. Mine → 我的发布 → 加载更多 → PostDetail → 返回后第一页重取。
2. Mine → 我的收藏 → 加载更多 → PostDetail → 取消点赞 → 返回后该帖消失。
3. 两页分别验证 empty、首屏 error+retry、下一页 error+retry。
4. 匿名访问两条页面均被 RequireAuth 导向 Login；匿名 API 返回 401。
5. API query 注入 userId 不改变当前 JWT 用户边界。
6. 删除帖子或用户关系并发变化时，重新请求不出现孤立收藏；帖子详情继续沿用现有不可用状态。
7. 回归 Mine 头像 Drawer→关闭→Loading、退出、Home tag×game、Search、Chat、点赞/评论与 O1 Markdown。

真实串验只读取个人列表；除用户主动在既有详情页取消点赞的验收动作外，不运行数据维护脚本或批量写入。

- [x] **Step 4：复核禁改文件 SHA-256**

用 O2.0 同一脚本生成 `protected-files-after.sha256`，再执行：

```powershell
Compare-Object `
  (Get-Content -Encoding utf8 docs/qa/post-phase4-personal-content/protected-files-before.sha256) `
  (Get-Content -Encoding utf8 docs/qa/post-phase4-personal-content/protected-files-after.sha256)
```

期望无输出，尤其 `CLAUDE.md` 哈希一致。任何差异先暂停定位，不能以用户改动或格式化解释带过。

- [x] **Step 5：回填“已实施，待人工验收”**

更新 06 设计实现状态、QA 和 planning，记录实际测试数字、截图清单、已知历史 lint 债与人工串验结果。不得写“人工验收通过”，不得进入 O2.5。

**Checkpoint O2.4：** 用户逐项人工验收。只有用户明确回复验收通过，才允许新增 Playwright 并进入 O2.5。

---

## 八、O2.5：人工验收后 Playwright 锁定与文档关闭

**前置硬门禁：** 用户已明确确认 O2.4 人工验收通过。没有该确认，本章全部步骤禁止执行。

**Files:**
- Create: `frontend/black_box/e2e/personal-content.spec.ts`
- Modify: `docs/design/00-foundation.md`
- Modify: `docs/design/06-post-phase4-personal-content.md`
- Modify: `docs/qa/post-phase4-personal-content/implementation-report.md`
- Modify: `.planning/post-phase4-personal-content/*`

**完成目标：** 用 5 条稳定行为测试锁定已人工确认的功能，终态为 9 files / 51 passed，并关闭 O2。

- [x] **Step 1：新增 5 条稳定 Playwright**

使用 route mock 和已有登录 helper，不依赖真实数据库；只断言 URL、请求 query、testid、可见文本和关键行为，不断言 CSS 类、DOM 层级或像素：

1. **匿名守卫**：表驱动访问 `/mine/posts`、`/mine/likes`，均重定向 `/login`，合并为 1 条用例。
2. **Mine 入口**：登录后两个入口存在；点击“我的发布”到 `/mine/posts`，返回后点击“我的收藏”到 `/mine/likes`。
3. **我的发布分页与详情**：首屏 10 条、哨兵触发第二页、请求带 page/limit、列表 append 去重，点击卡片进入 `/post/:id`。
4. **我的收藏分页与详情**：只使用 `/posts/liked`，显示 liked 数据，加载下一页并进入详情。
5. **取消点赞返回一致性**：从收藏页进入详情，mock DELETE like 成功；返回收藏页确认重新请求第一页且已取消帖子不再出现。

测试不新增批量取消、筛选、排序或收藏状态写接口，也不修改既有 46 条断言。

- [x] **Step 2：运行 Playwright 增量与全量**

```powershell
cd frontend/black_box
pnpm exec playwright test e2e/personal-content.spec.ts
pnpm exec playwright test --list
pnpm e2e
```

期望：新文件 5 passed；列表 9 files / 51 tests；全量 51 passed。

- [x] **Step 3：运行最终全量门禁**

```powershell
pnpm test:unit
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
pnpm lint

cd ../../backend/backend/posts
pnpm test -- --runInBand
pnpm build

cd ../../..
git diff --check
git status --short
```

如实记录：O2 定向 lint 0/0；前端全量最多为历史 3/0而非全仓通过；后端无新增 lint；所有 unit/Jest/build/51 Playwright 通过；`git diff --check` 无补丁错误。

- [x] **Step 4：回填权威文档与关闭 planning**

- `00-foundation.md`：增加 `/mine/posts`、`/mine/likes` 二级受保护路由和共享个人列表事实，不把它们加入 Sidebar 一级导航。
- `06-post-phase4-personal-content.md`：标记“已实现、已人工验收通过”，记录真实测试终态。
- QA：记录 5 条 e2e 名称与最终门禁。
- planning：全部任务 complete，说明未启动第五期、未自动提交 Git。

**Checkpoint O2.5：** 向用户提交最终闭环报告；不进入其他功能批次，不提交 Git。

---

## 九、风险、失败处置与回滚

| 风险 | 预防与失败处置 |
|---|---|
| `/mine`、`/liked` 被 `:id` 捕获 | 静态路由在 `:id` 前；controller HTTP 测试直接证明命中正确 handler |
| 抽取映射改坏公共列表 | service 测试先锁 tag×game、字段、URL、likedByMe；O2.1 单独验收 |
| 任意 userId 越权 | DTO 无 userId；ValidationPipe whitelist；controller 只传 JWT id；恶意 query 测试 |
| 收藏被实现成第二套状态 | API/代码使用 liked，查询 UserLikePost；schema 哈希与 diff 必须不变 |
| offset 分页重复或竞态覆盖 | append 按 id 去重；request id/AbortController 拒绝过期响应；busy 防重复 |
| 下一页失败清空已加载内容 | 首屏错误和 load-more error 分离，后者保留 items 并局部 retry |
| 详情取消点赞后收藏仍显示 | 页面不持久化；路由返回时重新 mount 并请求第一页权威数据 |
| Mine 改动破坏头像时序 | 入口 section 与 Drawer state 隔离；Mine unit、46 e2e 与人工链路回归 |
| 用户现有工作被覆盖 | `CLAUDE.md` 纳入 SHA-256 前后比较；禁止 reset/checkout/clean/stash |

回滚按责任边界执行：

1. O2.3 可单独回滚 Mine 入口，不影响已有账户、头像和退出。
2. O2.2 可整体回滚两路由、共享页、API 和类型，不影响 Home/PostDetail。
3. O2.1 可整体回滚两静态接口、共享 DTO/映射抽取，不影响点赞写接口。
4. O2 无 schema、migration、seed 或数据写入，不需要数据库恢复。
5. 回滚不得恢复或改写 `CLAUDE.md`，也不得借机清理历史 lint 债。

---

## 十、建议审查与提交边界

本计划不自动提交 Git。用户以后授权提交时，建议按以下审查单元拆分：

1. `feat(posts): add current-user post list queries`：O2.1 后端与 Jest。
2. `feat(personal): add shared published and liked pages`：O2.2 前端共享列表与 unit。
3. `feat(mine): add personal content entries`：O2.3 Mine 与 unit。
4. `test(personal): lock accepted personal content flows`：O2.5 Playwright 与文档关闭。

任一提交前重新运行该单元定向测试和 `git diff --check`；未经用户授权不执行 `git add` 或 `git commit`。

---

## 十一、最终可核对门禁

### 范围与安全

- [ ] 只增加两入口、两只读列表、分页与详情跳转。
- [ ] 收藏继续等于点赞；无 Favorite 表、schema、migration 或新 store。
- [ ] 两 API 只用 `req.user.id`，不接受任意 userId。
- [ ] `CLAUDE.md` 与全部禁改文件 SHA-256 前后一致。
- [ ] Home、Search、Chat、SSE、点赞写接口、评论和 O1 行为无变化。

### 行为与状态

- [ ] mine/liked API 分页、排序、媒体、统计、likedByMe 与公共 Post 结构一致。
- [ ] 两页 loading、empty、首屏 error、下一页 error、retry 各自准确。
- [ ] offset 重叠项去重，过期响应不覆盖当前列表。
- [ ] 取消点赞后返回收藏页读取权威关系并移除帖子。
- [ ] Mine 头像 Drawer→Loading 与退出时序不回归。

### 响应式与可访问性

- [ ] Mine、MyPosts、MyLikes 在 1440/900/390/320 无横向页面溢出、双滚动和底栏遮挡。
- [ ] 入口、帖子卡片、重试均可键盘访问并有 focus-visible。
- [ ] 长标题、作者、图片失败和分页 loading 不撑宽页面。

### 自动与人工门禁

- [ ] O2 新增/修改前端文件 lint 0/0；全量不高于历史 3/0。
- [ ] 后端新增文件 lint 0/0，修改文件无新增问题。
- [ ] 前后端 unit/Jest 与 build 全部通过。
- [ ] 人工验收前保持 8 files / 46 Playwright 全过且不新增。
- [ ] 用户人工验收后新增 5 条，终态 9 files / 51 passed。
- [ ] 06 设计、foundation、QA、planning 的最终状态一致。

本文是已确认设计的实施计划草案；当前停在实施计划评审门禁，未授权修改产品代码，也未自动开启第五期。
