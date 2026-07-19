# O2.1 后端只读能力实施证据

> 日期：2026-07-18
> 状态：O2.1 已实施并经用户确认；后续已进入 O2.2～O2.4

## 1. 范围

O2.1 仅新增：

- `GET /api/posts/mine`：当前 JWT 用户发布的帖子。
- `GET /api/posts/liked`：当前 JWT 用户点赞过的帖子，UI 后续称“我的收藏”。
- `PostPageQueryDto`：page/limit 共用分页 DTO。
- PostsService 私有 `findPostPage()`：公共列表与两条本人列表共用关联查询、统计、媒体 URL、`likedByMe` 和返回映射。

未修改 Prisma schema/migration/data、点赞写接口、前端产品文件、既有 Playwright、依赖或配置。

## 2. TDD 证据

### 2.1 RED

先新增 `posts.service.spec.ts` 与 `posts.controller.spec.ts`，实现前运行：

```powershell
pnpm test -- --runInBand src/posts/posts.service.spec.ts src/posts/posts.controller.spec.ts
```

结果：2 suites failed，10 tests 中 8 failed / 2 passed。

- service 明确因 `findMine` / `findLiked` 不存在失败。
- HTTP 请求 `/posts/mine`、`/posts/liked` 实际命中动态 `:id` 并返回 `{ route: 'dynamic-id' }`。
- 未登录请求因落到 OptionalJwtAuthGuard 动态路由而错误返回 200。

失败原因与 O2.1 缺失能力一致，不是测试配置或语法错误。

### 2.2 GREEN

最小实现后定向结果：

```text
Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

覆盖：

- public `findAll()` 的 tag×game AND、skip/take、`id desc`。
- 列表字段、真实时间、viewCount、匿名作者、avatar/thumbnail URL。
- 登录态本页 postId 一次性批量查询 `likedByMe`；同页多帖无 N+1。
- 匿名公共列表不查询点赞关系且 `likedByMe=false`。
- mine 只使用 `{ userId: JWT id }`；liked 使用 `likes.some.userId`。
- HTTP 静态路由优先于 `:id`，恶意 query `userId=999` 被 whitelist 移除。
- 默认分页、未登录 401、service 异常保持 500 而非伪装空列表。

## 3. 实现映射

| 文件 | 变更 |
|---|---|
| `src/posts/dto/post-page-query.dto.ts` | 新增 page/limit 默认值、数字转换、Int/Min(1) 校验 |
| `src/posts/dto/post-query.dto.ts` | 继承分页 DTO，继续只定义 tag/gameId |
| `src/posts/posts.controller.ts` | 在 `@Get(':id')` 前增加 mine/liked + JwtAuthGuard；显式使用 `req.user.id` |
| `src/posts/posts.service.ts` | 抽取 `findPostPage`，增加 `findMine` / `findLiked` |
| `src/posts/posts.controller.spec.ts` | 最小 Nest HTTP app 锁定路由、guard、whitelist 与异常语义 |
| `src/posts/posts.service.spec.ts` | 锁定公共回归、私有 where、分页、映射与无 N+1 |

路由声明顺序实测/静态核对：

```text
@Get('tags')   line 41
@Get('mine')   line 47
@Get('liked')  line 57
@Get(':id')    line 67
```

两条新 DTO/接口均没有 userId 输入字段；controller 只向 service 传入 `Number(req.user.id)`。

## 4. 自动门禁

### 4.1 Jest 与 build

```text
定向 Jest：2 suites / 10 passed
后端全量：17 suites / 74 passed
Nest build：成功
```

相对 O2.0 的 15 suites / 64 tests，净新增 2 suites / 10 tests，既有 64 条全部保留。

### 4.2 差分 lint

新增文件直接 ESLint：

```text
post-page-query.dto.ts     0 errors / 0 warnings
posts.controller.spec.ts  0 errors / 0 warnings
posts.service.spec.ts     0 errors / 0 warnings
```

修改历史文件使用同一 ESLint stdin 口径比较 HEAD 与 CURRENT：

| 文件 | HEAD | CURRENT | 差值 |
|---|---:|---:|---:|
| `post-query.dto.ts` | 22/0 | 1/0 | -21/0 |
| `posts.controller.ts` | 55/0 | 55/0 | 0/0 |
| `posts.service.ts` | 241/0 | 225/0 | -16/0 |

直接文件扫描中 `post-query.dto.ts` 为 0/0；stdin 的 1 条来自末尾换行归一差异。三个历史文件均未增加 lint 债。没有运行带 `--fix` 的全量 lint，也未格式化未触及业务区。

## 5. 只读与越界核对

- mine/liked 只执行 count、findMany 和本页 likedByMe 查询，无 create/update/delete/upsert。
- 现有 `create()`、`like()`、`unlike()` 未修改。
- `backend/backend/posts/prisma`、auth、ai、users 无 O2 diff。
- `frontend/black_box/src`、`frontend/black_box/e2e`、package/lock、原型、AGENTS 无 O2 diff。
- O2.0 受保护清单复核 65 files / 0 mismatches，`CLAUDE.md` 保持用户原改动。
- `git diff --check` 通过，仅有既存 `.planning/.active_plan` 换行提示。

## 6. 门禁结论

O2.1 的后端只读能力、公共列表回归、JWT 私有边界、路由优先级、测试、build 与差分 lint 已形成证据并经用户确认。O2.1 本身未修改前端、未提交 Git、未开启第五期。
