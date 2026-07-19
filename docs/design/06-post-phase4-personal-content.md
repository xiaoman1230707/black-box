# Black-box 四期后个人内容批次 O2 详细设计

> 状态：已实现、已人工验收通过（2026-07-18）
> 批次身份：第四期完成后的独立功能优化 O2，不代表第五期启动
> 设计对象：Mine 内“我的发布”“我的收藏”入口，以及两个当前用户私有帖子列表

---

## 一、文档定位与事实优先级

### 1.1 文档定位

本文是 O2 的唯一权威详细设计，只定义以下窄范围能力：

1. Mine 增加“我的发布”和“我的收藏”两个真实可达入口。
2. 新增两个登录保护列表页，分别展示当前 JWT 用户发布、点赞过的帖子。
3. 两页复用现有帖子卡片、状态、分页、App Shell 和详情页。
4. 现有接口不足时，增加 Posts 模块内最小只读接口。

本文不是实施计划，不包含逐文件施工步骤，不授权直接修改代码；设计获用户确认后再单独编写实施计划。

### 1.2 事实来源优先级

发生冲突时按以下顺序判断：

1. 用户对 O2 已拍板的产品边界。
2. `docs/design/00-foundation.md` 的 token、组件、App Shell、响应式与交互契约。
3. `docs/design/04-phase4-visual-polish.md` 的第四期终态及非目标边界。
4. `docs/design/05-post-phase4-ux-optimization.md` 的 O1 已关闭事实。
5. `docs/design/01-phase1-skeleton.md`、`02-phase2-social.md`、`03-phase3-ai-gamification.md` 的既有业务语义。
6. 当前真实前后端代码和 Prisma schema，用于验证实际落地状态。
7. `docs/prototype/` 只表达历史视觉意图；O2 不修改、不复制其假数据和未实现业务。

### 1.3 术语

- **我的发布**：`Post.userId` 等于当前 JWT 用户 id 的帖子。
- **我的收藏**：当前 JWT 用户在 `UserLikePost` 中存在关系的帖子。收藏只是 UI 文案，后端和数据层继续使用 like/liked 语义。
- **当前用户**：后端从通过 `JwtAuthGuard` 验证的 `req.user.id` 取得的用户，不来自 URL、query、body 或前端 store 传参。
- **个人内容列表**：本文两个私有列表页的合称，不等于完整个人中心。

---

## 二、背景与真实差距

### 2.1 历史边界

第四期明确不新增 profile、edit-profile、my-posts、my-likes，并将完整个人中心登记为后续债务。P3 因当时没有路由和后端能力，删除了 Mine 中不可达的“我的帖子”视觉死入口。

O2 在第四期和 O1 均验收关闭后，窄范围覆盖这项债务中的两个列表页。第四期“不在 P0～P6 新增个人中心页面”的历史结论仍然正确；本文只定义后继批次，不回写或篡改第四期范围。

### 2.2 当前前端

- `frontend/black_box/src/pages/Mine.tsx` 只有账户摘要、头像上传 Drawer 和退出登录，无个人内容入口。
- `frontend/black_box/src/router/index.tsx` 仅有 `/mine`，没有本人发布或点赞列表路由。
- `frontend/black_box/src/components/Sidebar.tsx` 只有首页、攻略助手、发帖、我的四个一级导航。
- `PostItem` 已提供完整帖子列表呈现、图片 fallback、键盘 Enter 和 `/post/:id` 跳转。
- `PageState`、`InfiniteScroll`、`BackToTop`、`Loading/Skeleton` 已覆盖本批次所需状态和滚动职责。
- `fetchPosts` 会把异常折叠成空列表，不能支撑 O2 区分 empty 与 error；不能直接复用其错误处理。

### 2.3 当前后端

- `GET /api/posts` 只支持 page、limit、tag、gameId，没有当前用户过滤。
- UsersController 只有注册接口，没有个人内容查询。
- PostsService 已有帖子列表关联查询、媒体 URL、统计、`likedByMe` 和 `{ items, total }` 映射，但逻辑内联在 `findAll()`。
- 现有 `like` / `unlike` 是 JWT 保护写接口，数据源为 `UserLikePost`。

### 2.4 当前数据模型

- `Post.userId` 可空，已有 `@@index([userId])`；用户删除后 Post 作者置空，帖子保留。
- `UserLikePost` 使用 `@@id([userId, postId])`，保证一个用户对一篇帖子最多一条关系。
- `UserLikePost` 对 User/Post 都使用 Cascade；帖子删除时关系同步删除，不存在孤立收藏。
- `@@index([postId])` 支撑按帖子查询和计数；复合主键前缀支撑按 userId 查询。
- `UserLikePost` 没有 createdAt/likedAt，因此无法准确提供收藏时间或按收藏时间排序。

### 2.5 测试基线

2026-07-17 实测：

- 前端 Vitest：13 files / 39 passed。
- 后端 Jest：15 suites / 64 passed。
- Playwright 列表：8 files / 46 tests。
- Playwright Chromium 全量：46 passed。

---

## 三、目标、非目标与固定决议

### 3.1 目标

- Mine 提供两个语义明确、可键盘访问的个人内容入口。
- 当前用户能查看自己发布和点赞过的帖子。
- 两页能持续加载后续页并进入现有 PostDetail。
- 收藏列表在用户从详情取消点赞后重新进入时读取后端权威关系，不展示已取消项。
- 复用第四期和 O1 的 App Shell、组件、token、JWT 与媒体 URL 契约。
- 不新增数据库语义或第二套收藏状态。

### 3.2 非目标

O2 不实现：

- profile、edit-profile、公开用户主页或任意 userId 的内容列表。
- 编辑帖子、删除帖子入口、批量删除、批量取消收藏。
- 列表搜索、筛选、排序控件、统计看板。
- 收藏时间、收藏文件夹、Favorite 表或“点赞 + 收藏”两套关系。
- Mine 入口预取、实时计数、WebSocket/跨标签页同步。
- 个人列表持久化、详情返回页码/滚动恢复。
- 新的点赞、评论、Home、Search、Chat、SSE 或 AI 行为。
- Prisma schema、migration、seed 或原型修改。

### 3.3 固定决议

1. 前端路由为 `/mine/posts` 和 `/mine/likes`。
2. 后端接口为 `GET /api/posts/mine` 和 `GET /api/posts/liked`。
3. 两条接口均使用 `JwtAuthGuard`，只读取 `req.user.id`，不接受 userId。
4. 两页使用 offset page/limit，与现有帖子分页一致；默认 page=1、limit=10。
5. 两页按帖子 `id desc` 排序。收藏页不是“最近收藏”，不显示收藏时间。
6. 返回结构继续是 `{ items: Post[], total: number }`。
7. Mine 入口不显示数量，避免为入口额外发起两个查询；进入列表后可展示同一分页响应中的准确 total。
8. 页面状态使用本地内存，不接入 `useHomeStore`，不新增持久化 store。
9. 人工验收通过前不新增 Playwright；unit/Jest 可随实现按 TDD 增加。

---

## 四、方案比较

### 4.1 采用：Posts 模块最小私有查询 + 前端共享列表页

后端在 PostsController/PostsService 增加两条当前用户查询，复用统一帖子列表查询与映射。前端 Mine 增加两个入口，两个薄页面共享一个 `PersonalPostListPage`。

优点：

- 权限边界在后端，前端无法枚举他人 userId。
- 直接复用 Post、PostItem、媒体 URL、统计和分页结构。
- 不引入 Favorite 表、全局 store 或 UsersModule 反向依赖。
- 两页状态和视觉只维护一套。

### 4.2 淘汰：给公共 `GET /posts` 增加 userId/likedByUserId

淘汰原因：任意用户 id 过滤会扩大公开查询面，与“只读取当前 JWT 用户自己的数据”冲突；即使前端不暴露，接口本身仍会泄露私有列表语义。

### 4.3 淘汰：客户端过滤 Home 列表或本地点赞状态

淘汰原因：Home 只持有已加载分页子集，无法得到完整列表和准确 total；刷新后状态不完整，也无法处理其他设备产生的点赞关系。

### 4.4 淘汰：新增 Favorite 表

淘汰原因：产品已经定义“收藏 = 点赞”，新增表会制造两套状态、双写和迁移成本，并改变已拍板业务语义。

### 4.5 淘汰：完整个人中心与一级导航扩容

淘汰原因：profile/edit-profile、统计看板和公开主页均超出 O2。Sidebar 保持四个一级目的地，两个入口只属于 Mine 内部信息架构。

### 4.6 淘汰：个人内容持久化 store

淘汰原因：持久化已加载页会让详情取消点赞后的收藏一致性变复杂，并需要 PostDetail 反向维护第二份列表。O2 选择重新进入即重取，准确性优先于返回位置保持。

---

## 五、路由、Mine 入口与页面结构

### 5.1 路由契约

| 路由 | 守卫 | Shell | 页面职责 |
|---|---|---|---|
| `/mine` | RequireAuth | MainLayout | 账户摘要、两个内容入口、头像上传、退出 |
| `/mine/posts` | RequireAuth | MainLayout | 当前用户发布帖子列表 |
| `/mine/likes` | RequireAuth | MainLayout | 当前用户点赞帖子列表，UI 名称“我的收藏” |

两条新路由作为 MainLayout 的 sibling route 接入，不创建嵌套 Outlet，不改 `/mine` 路由语义。Sidebar 的 `/mine` NavLink 在子路径下继续保持 active，不增加全局导航项。

匿名访问由 RequireAuth 重定向 `/login`；后端仍独立返回 401，不能只依赖前端守卫。

### 5.2 Mine 入口

在账户摘要 Card 与退出按钮之间增加“我的内容”section：

- “我的发布”：FileText 类图标、标题和“查看我发布的帖子”辅助文本，链接 `/mine/posts`。
- “我的收藏”：Heart 类图标、标题和“查看我点赞收藏的帖子”辅助文本，链接 `/mine/likes`。
- 使用语义化 Link 与既有 Button/Card 契约，不使用 `div onClick`。
- 入口触控目标不少于 44px，保留 focus-visible、disabled/reduced-motion 规则。
- 不显示数量徽章，不在 Mine mount 时预取两个列表。
- 头像 Drawer→关闭→Loading、上传反馈、退出按钮时序完全不变。

### 5.3 共享列表页

新增一个共享页面容器 `PersonalPostListPage`，通过 `kind: 'published' | 'liked'` 接受以下配置：

| 配置 | 我的发布 | 我的收藏 |
|---|---|---|
| H1 | 我的发布 | 我的收藏 |
| 描述 | 我发布过的社区内容 | 我点赞收藏的社区内容 |
| fetcher | fetchMyPosts | fetchMyLikedPosts |
| 空态标题 | 还没有发布帖子 | 还没有收藏帖子 |
| 空态说明 | 发布内容后会显示在这里 | 在帖子详情点赞后会显示在这里 |
| 空态动作 | 前往 `/compose` | 前往 `/` |

页面结构：返回 Mine 的图标按钮 → H1/说明/准确 total → 状态区或 PostItem 网格 → InfiniteScroll 尾部 → BackToTop。

两个路由入口使用薄页面文件传入固定 kind，不在单个组件里解析 pathname，不复制列表实现。

### 5.4 组件复用

- `PostItem`：唯一帖子卡片，props、testid、详情跳转、键盘语义均不变。
- `PageState`：首屏 loading、empty、error；加载更多失败使用 compact error。
- `Skeleton`：首屏可使用与 PostItem 稳定尺寸一致的列表骨架；不使用全屏 Loading 遮住 Shell。
- `InfiniteScroll`：只负责 sentinel 与加载尾部，页面提供 guard 和 `onLoadMore`。
- `BackToTop`：窗口滚动超过阈值后显示，移动端继续避开 72px bottom tab 和 safe-area。
- `Button`/`Card`/`Avatar`：Mine 入口和页面头部继续使用 P1 契约，不新增 NavTile 或个人中心私有组件体系。

---

## 六、后端接口与查询契约

### 6.1 查询 DTO

新增共享 `PostPageQueryDto`，只承载现有分页规则：

- page：可选整数，最小 1，默认 1，字符串经 transform 转 number。
- limit：可选整数，最小 1，默认 10，字符串经 transform 转 number。

现有 `PostQueryDto` 继承该 DTO 并继续声明 tag/gameId；公共 `GET /posts` 的请求语义不变。两条 O2 接口只使用 `PostPageQueryDto`，因此没有 userId、tag、gameId、sort 字段。全局 ValidationPipe 继续 whitelist 非 DTO 字段，服务层绝不读取被过滤的 userId。

### 6.2 GET `/api/posts/mine`

- Guard：JwtAuthGuard。
- 用户来源：`Number(req.user.id)`。
- Query：page、limit。
- Where：`{ userId }`。
- Order：`{ id: 'desc' }`。
- Success：200 `{ items, total }`。

### 6.3 GET `/api/posts/liked`

- Guard：JwtAuthGuard。
- 用户来源：`Number(req.user.id)`。
- Query：page、limit。
- Where：`{ likes: { some: { userId } } }`。
- Order：`{ id: 'desc' }`。
- Success：200 `{ items, total }`。

接口名和内部方法继续使用 liked 术语，避免把 UI 文案“收藏”误写成新的数据模型。

### 6.4 返回 Post 结构

每个 items 元素与现有 `GET /posts` 列表项一致：

- id、title、brief、publishedAt、viewCount。
- user `{ id, name, avatar }`。
- tags。
- totalLikes、totalComments、likedByMe。
- thumbnail。

媒体 URL 必须继续经 `publicMediaUrl()` 构造；头像和缩略图沿用现有三元判空。前端不拼接 localhost 或 uploads 路径。

### 6.5 共享查询与映射

PostsService 抽取私有帖子分页查询/映射边界，接受 where、page、limit、currentUserId，并统一执行：

1. 同一 where 的 count 与 findMany。
2. user/tags/_count/files include。
3. 当前页 likedByMe 批量查询，禁止 N+1。
4. publishedAt、brief、媒体 URL 和统计映射。
5. `{ items, total }` 返回。

现有 `findAll()` 改为调用该共享边界，但 tag×game AND、默认分页、`id desc`、匿名 likedByMe=false 和返回字段必须逐项回归，不借抽取改变公共接口。

### 6.6 错误语义

| 情况 | HTTP | 页面处理 |
|---|---:|---|
| 正常有数据 | 200 | 渲染列表 |
| 正常无数据 | 200 | `{ items: [], total: 0 }`，显示 EmptyState |
| page/limit 非法 | 400 | ErrorState，不伪装空态 |
| 缺失、过期且刷新失败的 JWT | 401 | 沿用 axios logout/login 流程 |
| 意外数据库错误 | 500 | ErrorState，可重试 |

本批次没有 403 业务分支，也不返回“用户不存在”细节。

---

## 七、前端数据流与分页状态

### 7.1 API helper

新增 `api/personal-posts.ts`：

- `fetchMyPosts(page = 1, limit = 10)` → GET `/posts/mine`。
- `fetchMyLikedPosts(page = 1, limit = 10)` → GET `/posts/liked`。
- 返回统一 `PostPageResponse = { items: Post[]; total: number }`。
- 使用现有 axios instance，让拦截器注入/刷新 JWT。
- 不 catch 后返回空数组；错误必须向页面传播。

公共 `fetchPosts`、Home store 和 Search API 不改。

### 7.2 页面状态

共享页面本地维护：

- items、total、nextPage。
- initialLoading、loadingMore。
- initialError、loadMoreError。
- request generation/unmounted guard，避免过期首屏请求覆盖重试结果。

不新增 Zustand store，不 persist，不向 `useHomeStore` 写入个人列表。

### 7.3 首屏流程

1. mount 后请求 page=1、limit=10。
2. 加载中显示稳定 skeleton/status，不清空 App Shell。
3. 成功后设置 items、total、nextPage=2。
4. `hasMore = items.length < total`。
5. 失败显示 ErrorState 与“重试”动作；重试重新请求第一页。

### 7.4 加载更多

- 仅在 `hasMore && !loadingMore` 时请求 nextPage。
- 成功后按 post.id 去重追加，更新 total 和 nextPage。
- `hasMore` 使用合并后唯一 items 数与最新 total 比较。
- 加载更多失败保留已显示帖子，在列表尾部显示 compact ErrorState；重试同一页，不递增 page。
- 新请求不抢焦点，不把滚动位置拉回顶部。

### 7.5 详情跳转与返回

- PostItem 继续导航 `/post/:id`，不传复制的详情数据。
- 个人列表页面不做 keep-alive；离开后本地状态销毁。
- 返回 `/mine/posts` 或 `/mine/likes` 时重新请求第一页并使用最新后端关系。
- 因此 O2 不承诺保留已加载页和 scrollY；该取舍保证收藏关系准确且避免第二套缓存一致性维护。

---

## 八、收藏一致性与并发边界

### 8.1 详情取消点赞

同一标签页标准流程：收藏列表 → PostDetail → 取消点赞 → 返回收藏列表。

- PostDetail 继续调用现有 `DELETE /posts/:id/like`，不改乐观更新、toast 或 Home patch。
- 收藏列表在重新 mount 时请求 `/posts/liked`，已取消关系不会返回。
- 不要求 PostDetail import 个人列表 store，也不发送自定义事件。

### 8.2 点赞失败

PostDetail 现有失败回滚保持。关系未删除时，返回收藏列表仍能看到该帖，与后端权威状态一致。

### 8.3 帖子删除

- Post 删除会 Cascade 删除 UserLikePost；后续列表请求不会返回该帖。
- 若帖子在列表加载后被并发删除，点击卡片进入现有 PostDetail“帖子不可用或不存在”状态。
- 加载下一页时按 id 去重，降低 offset 数据变动导致的重复呈现；不新增 tombstone。

### 8.4 跨标签页与跨设备

O2 不做实时同步。重新进入页面或刷新后读取最新关系；当前已打开页面在无本地操作时保持当前快照。这是明确的一致性边界，不伪装为实时收藏。

---

## 九、页面状态与内容边界

### 9.1 Loading

- 首屏使用列表 skeleton/status；不使用全屏 Loading 遮住 Sidebar。
- 下一页只在列表尾部显示 loading，已加载内容保持可读。
- `aria-live=polite`，reduced-motion 下停用非必要动画。

### 9.2 Empty

- 我的发布：说明尚未发布，可链接现有 `/compose`。
- 我的收藏：说明尚未点赞收藏，可链接现有首页 `/`。
- 空态不显示错误措辞，不伪造“0 条统计卡”。

### 9.3 Error

- 首屏错误占据内容区并提供重试。
- 下一页错误位于尾部，不能清空已加载帖子。
- 文案通过现有 `getApiErrorMessage` 取得可展示信息；未知错误使用统一兜底。

### 9.4 Unauthorized

- 路由层 RequireAuth 阻止匿名进入。
- API 401 继续由 axios refresh；刷新失败 logout 并跳 Login。
- 页面不创建第二套“无权限卡片”，也不暴露 JWT 或用户 id。

### 9.5 作者、长文本与图片失败

- Post.user 已删除时沿用现有空作者/fallback 口径，不新增“账号注销”字段。
- 标题和 brief 使用 PostItem 现有 line-clamp、break-words。
- 图片加载失败使用 PostItem 的 React 状态和 token cover fallback，无 inline style。
- viewCount 只读，不因进入个人列表或详情新增自增。

---

## 十、响应式、滚动与可访问性

### 10.1 四视口

| 视口 | Mine 入口 | 列表 |
|---|---|---|
| 1440×1000 | 两列入口，账户摘要和退出结构不变 | 两列 PostItem 网格 |
| 900×1000 | 两列入口，80px Sidebar | 单列 PostItem |
| 390×844 | 单列入口，避开 72px bottom tab/safe-area | 单列、无页面横向溢出 |
| 320×740 | 单列入口，文案可换行、目标不压缩 | 单列、长词/统计不撑宽 |

页面内容使用 MainLayout 既有 container gutter，不新增固定宽度或第二滚动容器。滚动主体仍是 window，InfiniteScroll sentinel 位于列表尾部。

### 10.2 可访问性

- Mine 的“我的内容”使用 section + heading；两个入口为真实 link。
- 页面 H1 唯一，返回 Mine 的图标按钮有可访问名称。
- PostItem 继续 `role=link`、tabIndex 和 Enter 行为。
- PageState 延续 status/alert 语义。
- 新加载内容不自动抢焦点；错误重试后焦点留在原按钮，页面通过 live region 报告状态。
- 所有点击目标至少 44px，focus-visible 使用 foundation ring。
- 交互状态通过 data-state/data-busy 表达，不用页面私有颜色分支。

---

## 十一、安全与隐私边界

1. 两条后端接口必须使用 JwtAuthGuard。
2. userId 只来自 `req.user.id` 并转换为 number。
3. query/body/path 均不定义 userId；即使客户端附加同名字段，服务层也不读取。
4. 不提供 `/users/:id/posts`、`/users/:id/likes` 或公开个人列表。
5. 返回字段与公共 Post 列表一致，不泄露密码、邮箱、token、内部文件路径或 embedding。
6. “我的收藏”不返回 UserLikePost 行本体，不暴露复合键或其他用户关系。
7. 不增加日志中的 token、连接串或用户敏感信息。
8. 本批次不改变限流、CORS、JWT refresh、媒体 URL 或强密钥校验。

---

## 十二、文件职责矩阵

### 12.1 前端

| 文件 | 状态 | O2 职责 |
|---|---|---|
| `src/pages/Mine.tsx` | 需要改造 | 增加两个真实 Link 入口；保留头像/退出时序 |
| `src/pages/MyPosts.tsx` | 需要新增 | 薄包装，固定 `kind='published'` |
| `src/pages/MyLikes.tsx` | 需要新增 | 薄包装，固定 `kind='liked'`，UI 标题“我的收藏” |
| `src/pages/personal/PersonalPostListPage.tsx` | 需要新增 | 两页唯一列表状态、分页、状态与组件组合 |
| `src/api/personal-posts.ts` | 需要新增 | 两条 JWT 只读 API helper，错误透传 |
| `src/types/index.ts` | 需要改造 | 统一导出准确 `PostPageResponse`；不改 Post 字段语义 |
| `src/router/index.tsx` | 需要改造 | lazy 接入两条 RequireAuth 路由 |
| `src/components/PostItem.tsx` | 已存在、保持 | 唯一帖子卡片与详情跳转 |
| `src/components/PageState.tsx` | 已存在、保持 | loading/empty/error/retry |
| `src/components/InfiniteScroll.tsx` | 已存在、保持 | 后续页触发与尾部 loading |
| `src/components/BackToTop.tsx` | 已存在、保持 | 返回顶部与移动端避让 |
| `src/components/Sidebar.tsx` | 已存在、保持 | 四个一级目的地不变；Mine 子路由保持 active |
| `src/store/useHomeStore.ts` | 明确不改 | 不承载个人列表或收藏缓存 |

### 12.2 后端

| 文件 | 状态 | O2 职责 |
|---|---|---|
| `src/posts/dto/post-page-query.dto.ts` | 需要新增 | 共享 page/limit 校验与默认值 |
| `src/posts/dto/post-query.dto.ts` | 需要改造 | 继承分页 DTO，现有 tag/gameId 行为不变 |
| `src/posts/posts.controller.ts` | 需要改造 | 在 `:id` 前增加 mine/liked 静态 JWT 路由 |
| `src/posts/posts.service.ts` | 需要改造 | 共享列表查询映射；新增本人发布/点赞查询 |
| `src/users/*` | 明确不改 | 不把帖子聚合塞入 UsersModule |
| `prisma/schema.prisma` | 明确不改 | 当前关系和索引足够 |
| `prisma/migrations/*` | 明确不改 | O2 无数据库迁移 |

### 12.3 测试与文档

| 文件 | 时机 | 职责 |
|---|---|---|
| `src/posts/posts.service.spec.ts` | 实现期 TDD | where、分页、排序、映射、likedByMe、无 N+1 |
| `src/posts/posts.controller.spec.ts` | 实现期 TDD | JWT 用户来源、静态路由参数、无 userId 信任 |
| `src/pages/personal/PersonalPostListPage.test.tsx` | 实现期 TDD | loading/empty/error/append/retry/dedupe |
| `src/pages/Mine.test.tsx` | 实现期 TDD | 两入口语义、链接与既有动作不回归 |
| `e2e/personal-content.spec.ts` | 人工验收后 | 只锁定稳定用户链路，共 5 条 |
| `docs/design/06-post-phase4-personal-content.md` | 本轮 | O2 权威设计 |

O2 不删除业务文件，不修改原型、依赖、配置、AGENTS 或数据库文件。

---

## 十三、建议实施批次与依赖

本文只定义后续实施的合理拆分，不等于已授权施工计划。

### O2.0 范围与基线

冻结当前工作树、13/39 unit、15/64 Jest、8/46 Playwright 和 Mine/两目标页四视口基线。确认不触碰 O1、Home、Search、Chat、数据库与原型。

### O2.1 后端只读能力

先以 Jest 锁定共享列表查询和两条 JWT 接口，再实现 DTO、controller、service。完成条件是公共 GET /posts 无回归、mine/liked 分页准确、无 userId 越权、无 schema 变化。

### O2.2 前端 API 与共享列表

以 unit 锁定 API 参数、错误透传、首屏状态、下一页和去重，再接共享页面和两个薄页面路由。完成条件是两页能真实分页并进入 PostDetail。

### O2.3 Mine 入口与响应式

增加两个语义 Link，保持头像上传/退出时序和 Sidebar 三态。完成四视口检查后停在人工验收门禁。

### O2.4 整体人工验收

串验登录、Mine 入口、分页、详情、取消点赞返回、空态、错误态、移动底栏和旧功能回归。用户确认前不新增 Playwright。

### O2.5 行为锁定与文档关闭

人工验收通过后新增 `personal-content.spec.ts` 五条稳定用例：

1. 匿名访问两条路由均重定向 Login。
2. Mine 两入口分别进入正确页面。
3. 我的发布加载后续页并可进入详情。
4. 我的收藏加载后续页并可进入详情。
5. 收藏页进入详情取消点赞，返回后该帖不再出现。

既有 8 files/46 tests 不删除、不弱化；新增后目标为 9 files/51 tests。

---

## 十四、验证与人工验收

### 14.1 自动验证

- 前端新增/修改 TS/TSX 定向 lint 0 errors / 0 warnings。
- 前端全量 lint 不增加已登记历史债。
- 后端新增文件 lint 0/0；历史文件按差分门禁不新增问题。
- 前端 unit 全量通过，并增加个人列表与 Mine 入口覆盖。
- 后端 Jest 全量通过，并增加 Posts controller/service 覆盖。
- 前后端 build 通过。
- 人工验收前 Playwright 为 8 files/46 passed，既有断言零修改。
- 人工验收后新增 5 条，终态实测为 9 files/51 passed。

### 14.2 接口验收

- 匿名 GET mine/liked → 401。
- 登录用户 A 请求 mine，只返回 `Post.userId=A`。
- 登录用户 A 即使附加 `userId=B`，仍只返回 A。
- liked 只返回 A 的 UserLikePost 关联；B 的关系不可见。
- page/limit、total、id desc、最后一页与空页准确。
- items 字段、媒体 URL、统计、likedByMe 与公共列表一致。
- 公共 GET /posts 的 tag×game、分页和匿名读取无回归。

### 14.3 四视口人工验收

在 1440×1000、900×1000、390×844、320×740 检查：

- Mine 两入口可见、无重复全局导航、头像和退出结构不被挤压。
- 两列表标题、total、状态和卡片无横向页面溢出。
- 1440 两列；900/390/320 单列。
- 长标题、长作者名、无图/坏图、三项统计不撑宽。
- 移动页面不被 72px bottom tab 或 safe-area 遮挡。
- InfiniteScroll 只出现一个页面滚动，BackToTop 不盖住底部导航。
- Tab/Shift+Tab、Enter、focus-visible、重试和空态动作可用。

### 14.4 主链路人工串验

1. 登录 → Mine → 我的发布 → 加载更多 → 进入详情 → 返回。
2. Mine → 我的收藏 → 加载更多 → 进入详情 → 取消点赞 → 返回后消失。
3. 无发布/无收藏用户分别看到准确空态。
4. 模拟首屏失败与下一页失败，确认错误不伪装空态且可重试。
5. 并发删除列表中的帖子，确认详情显示既有不可用状态，刷新列表后移除。
6. 回归头像上传 Drawer→Loading、退出、Home、Search、Chat、点赞、评论和 O1 搜索/Markdown 行为。

---

## 十五、风险、回滚与后续债务

### 15.1 主要风险

| 风险 | 控制 |
|---|---|
| 静态路由被 `:id` 捕获 | mine/liked 方法声明在 `@Get(':id')` 前，并有 controller 测试 |
| 列表映射抽取改坏公共 GET /posts | 共享 helper 前先锁定现有返回；回归 tag×game 与 likedByMe |
| 收藏页出现已取消项 | 页面不持久化；返回时重新请求权威关系 |
| offset 数据变动导致重复项 | 前端 append 按 post.id 去重，total 采用最新响应 |
| Mine 入口破坏头像上传时序 | 入口 section 与 Drawer 状态隔离，保留既有测试和人工链路 |
| 把收藏实现成第二套状态 | API、代码和 schema 继续使用 liked/UserLikePost 命名 |
| userId 越权 | DTO 无 userId，controller 只传 req.user.id，服务测试覆盖恶意 query |

### 15.2 回滚原则

- 前端可按“Mine 入口 + 两路由 + 共享列表 + API helper”整体回滚，不影响现有 Mine 头像和退出。
- 后端可按“两静态路由 + service 查询 + DTO/共享映射”整体回滚，不影响现有点赞写接口。
- 无 schema/migration/data 写入，回滚不需要数据库恢复。
- 不以回滚为理由改动 Home store、JWT、PostDetail 或 O1 文件。

### 15.3 明确保留的后续债务

- profile、edit-profile、公开用户主页和资料编辑。
- 编辑/删除本人帖子与批量管理。
- 独立 Favorite 语义、收藏夹和收藏时间。
- 个人列表搜索、筛选、排序和统计看板。
- 个人列表详情返回的页码、数据与 scrollY 保持。
- 跨标签页/跨设备实时同步。

---

## 十六、最终可核对清单

### 范围

- [x] 只新增 Mine 两入口、两列表、详情跳转和分页。
- [x] 不新增 profile/edit-profile、编辑、批量、筛选、排序或公开主页。
- [x] 收藏继续等于点赞；无 Favorite 表、schema 或 migration。
- [x] Sidebar、Home、Search、Chat、SSE、JWT、评论和 O1 行为不变。

### 数据与接口

- [x] 两条接口均由 JwtAuthGuard 保护，只使用 req.user.id。
- [x] mine/liked 静态路由不会被 `:id` 捕获。
- [x] 返回 `{ items, total }` 和现有 Post 列表字段。
- [x] 两页 page/limit 与 `id desc` 准确，收藏页不伪造收藏时间。
- [x] 媒体 URL、统计和 likedByMe 复用现有映射。

### 前端

- [x] Mine 入口是语义 Link，不预取数量。
- [x] 两页复用唯一 PostItem、PageState、InfiniteScroll、BackToTop。
- [x] loading/empty/error/load-more error 不互相伪装。
- [x] 取消点赞后返回收藏页读取后端权威状态。
- [x] 四视口无横向溢出、双滚动或底部导航遮挡。

### 质量门禁

- [x] 前后端 unit/Jest、build 和差分 lint 达标。
- [x] 人工验收前保持 8 files/46 Playwright 全通过且不新增用例。
- [x] 用户人工验收通过后新增 5 条，终态 9 files/51 passed。
- [x] 设计、QA 与 planning 最终状态一致。

本文所定义的 O2 已实现并经用户人工验收通过；O2.5 已用 5 条稳定 Playwright 锁定验收行为，终态为 9 files/51 passed。O2 已关闭，未自动开启第五期。
