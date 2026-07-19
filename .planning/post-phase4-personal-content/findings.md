# O2 调研发现

## 已知边界

- “收藏”仅为 UI 名称，数据语义继续使用 `UserLikePost`。
- 只允许当前 JWT 用户读取自己的发布与点赞帖子。
- 原则上不修改 Prisma schema 或 migration；现有接口不足时仅新增最小只读接口。
- 04 将完整个人中心列为非目标；O2 只对 `my-posts` / `my-likes` 作窄范围后继覆盖。

## 核对清单（已完成）

- Mine 当前入口结构与响应式容器：已核对。
- RequireAuth 与新路由接线模式：已核对。
- PostItem/Post/分页字段与详情跳转契约：已核对。
- 后端按用户/点赞关系查询能力与索引现状：已核对。
- 当前测试脚本和实测基线：已核对并实跑。

## 方案结论

- 采用 `/mine/posts`、`/mine/likes` 两个 RequireAuth 页面，入口只位于 Mine。
- 采用 `GET /api/posts/mine`、`GET /api/posts/liked` 两个 Posts 模块 JWT 只读接口。
- 采用共享 `PostPageQueryDto` 与 PostsService 私有分页/映射边界，公共 GET /posts 语义不变。
- 前端使用一个参数化 PersonalPostListPage 和页面本地状态；不新增个人内容 store。
- 收藏页返回重取保证取消点赞一致性；不承诺详情返回的分页/scrollY 保持。
- Mine 不预取或显示入口计数；列表响应中的 total 可准确展示。
- 人工验收后新增 1 个 Playwright spec、5 条稳定用例，目标 9 files/51 passed。

## 权威文档核对

- `04-phase4-visual-polish.md` §2.3/§13.3 将完整个人中心（profile/edit-profile/my-posts/my-likes）整体列为第四期非目标和后续债务。
- 同文 §7.7 的 Mine 已实现边界是用户摘要、头像上传和退出；当时的不可达“我的帖子”不得在第四期伪装成功能。
- O2 是在第四期完成后对 `my-posts`、`my-likes` 两页的窄范围后继覆盖，不覆盖 profile/edit-profile，也不回写第四期历史范围。
- `05-post-phase4-ux-optimization.md` 已关闭的 O1 只物理删除全局 Topbar 并为 Chat assistant 接入共享 MarkdownRenderer；Mine 数据能力、路由守卫、帖子/点赞语义均未改。
- `00-foundation.md`/04 要求继续复用 App Shell、PostItem、PageState、Loading、InfiniteScroll、BackToTop、token、data-state 和四视口契约。

## 前端真实实现

- `pages/Mine.tsx` 当前只有“我的账户”标题、账户摘要、头像 Drawer 上传和退出按钮；不存在“我的帖子”或“我的收藏”入口，也没有入口计数。
- `router/index.tsx` 的业务页都在 `MainLayout` 下；受保护页采用逐路由 `<RequireAuth>` 包裹。适合新增 `/mine/posts`、`/mine/likes` 两条 sibling route，并保持 `/mine` 本身不变。
- `RequireAuth` 只依赖 `useUserStore.isLogin`，匿名时以 `replace` 跳 `/login` 并记录 `location.pathname`；O2 不需要新的鉴权层。
- `PostItem` 接受 `Post`、整卡跳 `/post/:id`，保留 link role、键盘 Enter、图片失败 token fallback、统计只读展示和现有 testid；新列表不应复制卡片。
- `Post` 已含列表所需 user/tags/thumbnail/publishedAt/totalLikes/totalComments/viewCount/likedByMe；`PostsResponse` 的真实 API 形态是 `{ items, total }`，现有公共 type 中的简版定义未被统一使用。
- `InfiniteScroll` 以 `hasMore/isLoading/onLoadMore` 工作，`PageState` 支持 loading/empty/error/action，`BackToTop` 已处理 reduced-motion 与移动底栏避让。
- 现有 `fetchPosts` 会吞异常并折叠为空列表，不适合 O2 的可区分 ErrorState；O2 应新增不吞异常的专用只读 API helper，不改变 Home 现有 helper 语义。
- 两个新列表宜使用页面本地分页状态，不接入 `useHomeStore`。从 PostDetail 返回会重新挂载并重取第一页，因此取消点赞后收藏列表不会保留已取消项；不建立第二套收藏 store。

## 后端与数据模型真实实现

- `GET /posts` 仅支持 page/limit/tag/gameId；UsersController 仅有注册；当前没有按 JWT 用户读取本人发布或点赞帖子的 API。
- `PostsController` 已有 Optional/JWT guard 和 `req.user.id → Number` 口径；O2 最小接口应继续放在 PostsController/PostsService，避免 UsersModule 反向依赖帖子聚合。
- `PostsService.findAll` 已定义列表关联、媒体 URL、统计、`likedByMe` 和 `{ items, total }` 返回形态，但查询与映射内联；O2 设计应抽取私有共享分页查询/映射，供公共列表和两条本人列表复用且保持现有语义。
- Post 有 `@@index([userId])`，本人发布可用 `where: { userId }`；排序沿用现有 `id desc`。
- `UserLikePost` 使用 `@@id([userId, postId])` 保证每用户每帖唯一，复合主键前缀可支撑按 userId 查询；`@@index([postId])` 支撑按帖计数/关联。无需新 schema 或 migration。
- UserLikePost 对 User/Post 都是 Cascade；帖子删除会自动删除收藏关系，不产生悬空收藏。Post 对 User 为 SetNull，作者删除后帖子保留并沿用现有匿名作者映射。
- UserLikePost 没有 createdAt/likedAt，因此“我的收藏”不能按收藏时间排序或显示收藏时间；采用帖子 `id desc` 的确定性顺序，与公共帖子分页一致。
- 静态本人路由必须声明在 `@Get(':id')` 之前，避免 `/posts/mine` 一类路径被动态 id 捕获。推荐 API 为 `GET /posts/mine` 和 `GET /posts/liked`，均用 JwtAuthGuard 且不接受 userId。

## 补充兼容事实

- Sidebar 仍只有首页、攻略助手、发帖、我的四个一级目的地；O2 入口应只放 Mine，不增加第五/第六个全局导航项，也不改变 248/80/72 三态。
- Axios 实例会从 `useUserStore.getState()` 注入 token，并沿用现有 refresh/logout 语义；O2 API helper 不自行读取 token。
- 现有 P1 Button 支持 Base UI `render` 接线，可用于语义化 Link 入口；不需要新增 NavTile 基础组件。
- 历史差异：三期文档曾记录“我的帖子入口保留”，四期 P3 已因无真实路由/handler 将其删除；当前代码无入口是最新事实。O2 新增的是两条真实可达入口。
- Prisma migration 与 schema 一致：`posts_userId_idx`、`user_like_posts` 复合主键和 `user_like_posts_postId_idx` 已实际创建。

## 测试基线（2026-07-17 实测）

- 前端 Vitest：13 files / 39 passed。
- 后端 Jest：15 suites / 64 passed。
- Playwright `--list`：8 files / 46 tests；全量 Chromium：46 passed（6.9s）。
- O2 功能获用户人工验收前不新增 Playwright；实施时可先新增前后端 unit/Jest，人工确认后再锁定入口、守卫、分页、详情跳转和收藏回取行为。

## 实施计划核对结论

- 06 设计已获用户确认，现阶段不存在需要扩大范围、改变“收藏＝点赞”或新增数据库语义的问题。
- 前端现有 Vitest 是 Node 环境，依赖中没有 Testing Library/jsdom；实施计划使用 SSR 视图测试和独立纯函数测试覆盖状态，不为 O2 增加测试依赖。
- `fetchPosts` 会吞异常，O2 必须新建专用只读 helper 并保留 reject，才能准确区分 empty 与 error；该选择不改变 Home API 语义。
- PostsService 适合抽取一个私有 `findPostPage(where, query, currentUserId)`；公开列表和两条私有列表共用 include、媒体 URL、统计、likedByMe 和映射，where 各自留在公开方法中。
- controller 集成测试应通过真实 HTTP 路由证明 `/posts/mine`、`/posts/liked` 未被 `:id` 捕获，并覆盖恶意 `userId` query 不改变 JWT 用户边界。
- 个人列表使用 AbortController/request id 防过期响应，offset append 按 post id 去重；首屏错误与下一页错误分离，后者不得清空已有列表。
- O2.4 才做稳定 mock 截图与真实只读串验；O2.5 严格等待用户人工验收后新增 5 条 Playwright。
- `CLAUDE.md` 是现有用户改动，不属于 O2；计划已把它列为 SHA-256 保护文件。
