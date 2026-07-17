# 二期功能详细设计:核心社交功能 + 数据正确性

> 版本:v1 · 日期:2026-06-18 · 状态:已确认范围,据此实现
> 上游:`01-分期概要设计.md` 第六章(二期权威范围)、第十一章(11.5 裁定);`docs/design/00-foundation.md`(设计底座,下称 **foundation**);`docs/design/01-phase1-skeleton.md`(一期产物,下称 **一期**)。

---

## 一、文档定位与依赖

**本文件是什么**:二期「核心社交功能 + 数据正确性」的功能详细设计。二期业务直接长在**一期已建好的 App Shell** 上(从一开始即最终布局,无后续迁移),消费**一期 migration** 已落地的 `Game` 表 / `Post.{createdAt,updatedAt,viewCount,gameId,titleEmbedding}` / `Tag` 内容类型,并把一期的 `Compose` 占位替换为真实发帖页。

**依赖与引用纪律**:
- 凡 foundation 已定义者(token、全局组件契约、App Shell、`data-state`、交互反馈约定),**本文件引用其节号、不重述**。
- 凡一期已交付者(App Shell 挂载、路由与守卫、migration 字段),**本文件承接、不重建**。
- 本文件只设计二期。三期(语义搜索 / AI 助手 / 游戏化前端 / rag-git-avatar 物理删除)、四期(Neo-Brutalism 视觉落地 / token 接入 Tailwind / 去硬编码 / 限流强密钥 / Markdown 富文本)的内容,一律进第十一章「留给后续」,不在此展开。

**本期产出定位**:让应用"像个真社区"——可注册登录、发帖(选游戏 + 类型 + 配图)、列表显示真实时间与封面、详情可嵌套评论、点赞持久化、浏览量真实、刷新不丢数据。

**关键边界(本期反复引用)**:
1. **写接口同期加鉴权**:每个写接口(评论/点赞/上传/发帖)实现时**同步加** `@UseGuards(JwtAuthGuard)`(复用一期既有守卫,见 §九),不留到最后统一加。
2. **数据修复只碰指定行**:仅修 §八 逐条列出的位置,不顺手重构 `posts.service.ts` 其他逻辑。
3. **硬编码 URL 不动**:`http://localhost:3000/uploads` 现状硬编码**保留**,二期新写接口**延续此风格**;统一抽 env 归四期收尾。
4. **视觉精还原留四期**:本期组件以"功能可用 + 复用 foundation 契约骨架"为度,Neo-Brutalism 像素级还原归四期。

---

## 二、后端接口总表

> 全局前缀 `/api`(一期/现状既定,main.ts)。鉴权列 √ = 加 `JwtAuthGuard`;**可选**=匿名可访问但登录态附加字段(见 §四 `likedByMe`)。

| 模块 | 方法 · 路径 | 入参 | 出参(要点) | 鉴权 |
|------|-----------|------|------------|------|
| 评论 | `GET /api/posts/:id/comments` | path `id` | `{ items: CommentNode[] }` 两层树 | 可选 |
| 评论 | `POST /api/posts/:id/comments` | path `id`;body `{ content, parentId? }` | 新建的评论节点 | √ |
| 评论 | `DELETE /api/comments/:id` | path `id` | `{ success: true }` | √(仅本人) |
| 点赞 | `POST /api/posts/:id/like` | path `id` | `{ liked: true, totalLikes }` | √ |
| 点赞 | `DELETE /api/posts/:id/like` | path `id` | `{ liked: false, totalLikes }` | √ |
| 上传 | `POST /api/upload/avatar` | `multipart/form-data` field `file` | `{ id, url }` 头像信息 | √ |
| 上传 | `POST /api/upload/image` | `multipart/form-data` field `file` | `{ id, url, thumbnailUrl }` 帖子图 | √ |
| 发帖 | `POST /api/posts`(**扩展现有**) | body `{ title, content, gameId?, tagIds?, fileIds? }` | 新帖 `{ id }` | √(现已有) |
| 游戏 | `GET /api/games` | — | `Game[]`(`{id,name,cover,description}`) | 公开 |
| 帖子 | `GET /api/posts`、`GET /api/posts/:id`(**改造现有**) | 同现状 + 详情 `likedByMe`/`viewCount` | 见 §四、§八 | 可选(为 `likedByMe`) |
| 注册 | `POST /api/users/register`(**仅改 DTO**) | body `{ name, password }` | `{ id, name }` | 公开 |

**模块组织**:新建 `CommentModule`、`LikeModule`(或并入 `PostsModule`,见 §四)、`UploadModule`、`GameModule`,在 `app.module.ts` 注册;各模块 `imports: [AuthModule]` 以复用导出的 `JwtAuthGuard`(一期 auth.module 已 `exports`)。新增依赖:`sharp`;补 `@types/multer`(`multer` 随 `@nestjs/platform-express` 内置)。新建磁盘目录 `uploads/`(含 `avatar/resized/`、`resized/`),提交 `.gitkeep`。

**可选鉴权守卫(供 `likedByMe` 用)**:新增 `OptionalJwtAuthGuard extends AuthGuard('jwt')`,override `handleRequest(err, user)` 返回 `user ?? null`(**不抛 401**)。挂在 `GET /posts`、`GET /posts/:id` 上:有有效 token → `req.user` 有值,据此算 `likedByMe`;匿名 → `req.user = null`,`likedByMe = false`。

---

## 三、评论功能详细设计(D1:两层树)

### 3.1 数据形态与接口

`Comment` 表结构不变(一期既有:`id/content/postId/userId/parentId` 自引用,`onDelete: Cascade`)。**两层模型约定**:
- **顶层评论**:`parentId = null`。
- **回复**:`parentId = 顶层评论 id`。**回复的回复也挂到所属顶层评论**(`parentId` 仍指向顶层),不产生第三层。
- **"@某人"**:"回复某条回复"时,前端把 `@对方昵称 ` 作为 `content` 前缀提交(原型交互),**不新增 schema 字段**(`replyTo` 不持久化),零迁移。

**`GET /api/posts/:id/comments`** 返回:
```ts
type CommentNode = {
  id: number; content: string;   // Comment 表无 createdAt 字段(见 §11.2 后续待办),二期不返回时间、评论项暂不显示精确时间
  user: { id: number; name: string; avatar: string };  // avatar 走 §五 头像 URL 规则(判空)
  replies: CommentNode[];   // 仅顶层含 replies;回复项 replies 恒为 []
};
// 响应:{ items: CommentNode[] }   // items = 顶层评论(按 id 升序 ≈ 时间序,见 3.3)
```
service 实现:一次查询 `where: { postId }` 全部评论(含 `user.avatars`),`orderBy:{ id:'asc' }`(自增 id ≈ 时间序),按 `parentId` 在内存分组建两层(顶层 + replies),避免 N+1。

**`POST /api/posts/:id/comments`**(√):
- DTO `CreateCommentDto`:`content` `@IsNotEmpty @IsString @MaxLength(1000)`;`parentId?` `@IsOptional @IsInt`。
- 入库前**规整 parentId**:若传入 `parentId` 指向的评论本身是回复(其 `parentId !== null`),则把新评论的 `parentId` 改写为该评论的顶层 `parentId`(保证只有两层)。
- `userId = req.user.id`;返回新建节点(含 user)。

**`DELETE /api/comments/:id`**(√,仅本人):
- 校验 `comment.userId === req.user.id`,否则 `ForbiddenException`。
- `onDelete: Cascade` 自动删其 replies。返回 `{ success: true }`。

### 3.2 前端评论区(改造 `pages/post/index.tsx`)

- **删除** `mockComments`(现 `post/index.tsx:23-45`),改 `useEffect` 拉 `GET /posts/:id/comments`。
- 新增 `src/api/comments.ts`:`fetchComments(postId)` / `createComment(postId, {content, parentId?})` / `deleteComment(id)`。
- 渲染:**两层,不递归**——顶层评论列表,每条下渲染其 `replies`。回复框复用 foundation Textarea(§九);提交评论接 `createComment`,成功后**重拉 `fetchComments`**(评论低频、可靠优先,不做本地乐观插入)。
- "回复"按钮:点击在该顶层评论下展开回复框,提交时 `parentId = 顶层评论 id`,若回复的是某条 reply 则 `content` 自动带 `@昵称 ` 前缀。
- **评论数·单一数据源**:评论区标题计数直接由**评论树总数(顶层 + 所有 replies)**算,**不单独维护 / 重拉 `post.totalComments`**,避免"列表条数与标题计数不一致";发/删评论后只重拉评论树,不重拉整个 `loadPost`。
- 删除:仅本人评论(`c.user.id === 当前用户 id`)显示删除入口,接 `deleteComment` → **确认用 `window.confirm`(二期功能占位)** → 重拉评论树。Dialog 组件化精修留四期。
- 未登录提交:走路由/请求守卫——`POST` 返 401 由 axios 拦截器处理;UI 侧未登录时评论框显示"登录后评论"入口(点击跳 `/login`)。

### 3.3 待定(不阻塞)
顶层评论排序(`id asc` 顺序 vs `desc` 最新在前)、是否分页(评论量大时),默认:**`id asc`**(`Comment` 无 `createdAt`,以自增 id 近似时间序)、不分页(演示量级足够),详见第十一章。

---

## 四、点赞功能详细设计(D4:合并为"赞")

> 决议 H 落地:**二期只做"赞"一个概念**,写 `UserLikePost`;**移除独立"收藏",不建收藏表**;全文措辞统一为"赞"。

### 4.1 接口

放在 `PostsController`(或新建 `LikeController`,二选一,倾向并入 `PostsModule` 以复用 `PrismaService`):

- **`POST /api/posts/:id/like`**(√):`prisma.userLikePost.upsert`(复合主键 `[userId, postId]`),**幂等**——重复点赞不报错。返回 `{ liked: true, totalLikes }`(`totalLikes` 取 `_count`)。
- **`DELETE /api/posts/:id/like`**(√):`deleteMany({ where: { userId, postId } })`,不存在时静默。返回 `{ liked: false, totalLikes }`。

### 4.2 `likedByMe` 字段

- `GET /posts`、`GET /posts/:id` 挂 `OptionalJwtAuthGuard`(§二):
  - 登录态:批量查当前用户对这批 `postId` 的 like 记录(列表用 `where: { userId, postId: { in: ids } }` 一次查出集合),逐条 `likedByMe = set.has(post.id)`。
  - 匿名:`likedByMe = false`。
- 列表项 / 详情新增字段 `likedByMe: boolean`、`totalLikes: number`(`totalLikes` 现已返回)。

### 4.3 前端(改造 `pages/post/index.tsx`)

> 本块只接**详情页**点赞;`PostItem.tsx`(列表项)点赞 UI 留后续/与列表块一并。

- 删除详情页 `liked` 假状态(现 `post/index.tsx:52,75`)与假计数算法(`(post.totalLikes||0)+(liked?1:0)`,:237),`liked` 初值改读接口 `post.likedByMe`、本地维护 `totalLikes`(初值 `post.totalLikes`)。
- 新增 `src/api/likes.ts`:`likePost(id)` / `unlikePost(id)`。
- **乐观更新**(foundation §6 反馈约定):点击即翻转本地 `liked` + 计数 ±1 → 调接口;**请求期禁用按钮防连点**;**失败则状态回滚 + inline 轻提示(按钮旁短文案,二期占位,不用 `window.alert`)**。toast 组件化精修留四期。
- **未登录**:不调接口,引导 `navigate('/login')`。
- **收藏按钮**:详情页**移除**(现 `post/index.tsx:53,79-81,245-253` 的 `bookmarked` 相关);仅保留"赞"(承决议 H)。"我的点赞列表"**不做**(见第十一章 E3)。

---

## 五、文件上传详细设计(D2)

### 5.1 后端 `UploadModule`

- 依赖:`sharp`(新增);`FileInterceptor`(来自 `@nestjs/platform-express`,补 `@types/multer`)。用 **memoryStorage**(拿到 `file.buffer`)→ `sharp` 处理 → 写盘 → 写 DB。
- 校验:`mimetype` 以 `image/` 开头,大小上限(如 ≤5MB),否则 `BadRequestException`。
- 文件名:生成基名 `base`(时间戳 + 随机后缀,**不依赖 Date.now 之外的现状风格即可**),各尺寸命名见下。

**`POST /api/upload/avatar`**(√):
- `sharp` 输出两档(像素**可微调**):`{base}-small.jpg`(≈100²)、`{base}-large.jpg`(≈400²),写入 `uploads/avatar/resized/`。
- **替换语义**:事务内先删该用户旧 `Avatar` 记录(磁盘旧文件可暂留,清理归四期)再建新记录,保证查询 `avatars[0]` 恒为当前头像(对齐现状取值)。
- `Avatar` 表写 `{ mimetype, filename: base, size, userId }`。
- 返回 `{ id, url: "http://localhost:3000/uploads/avatar/resized/{base}-small.jpg" }`(延续硬编码)。

**`POST /api/upload/image`**(√,帖子图):
- `sharp` 输出 `{base}-thumbnail.jpg`(≈400 宽,等比)写 `uploads/resized/`,并保留原图(供详情大图)。
- `File` 表写 `{ originalname, mimetype, filename: base, size, width, height, metadata?, userId, postId: null }`(发帖时再回填 `postId`,见 §六)。
- 返回 `{ id, url: 原图URL, thumbnailUrl: "...resized/{base}-thumbnail.jpg" }`。

### 5.2 磁盘与静态服务
- 新建 `uploads/`、`uploads/avatar/resized/`、`uploads/resized/`,各放 `.gitkeep`(目录现不存在)。
- 静态服务沿用 main.ts 既有 `useStaticAssets(uploads, { prefix:'/uploads' })`,**不改**。

### 5.3 前端
- 新增 `src/api/upload.ts`:`uploadAvatar(file)` / `uploadImage(file)`(`FormData`,`Content-Type` 由 axios 自动置 multipart)。
- **Mine 头像**(改造 `pages/Mine.tsx` 头像部分):复用现有 `Drawer` 改为本地选图 → `uploadAvatar` → 成功后刷新 `useUserStore.user.avatar`;**移除"AI 生成头像"按钮**(概要 129)。
- **二期 Mine 边界(只动头像,其余一律不碰)**:二期改造 `Mine.tsx` **仅限头像上传部分**;其余菜单项**一律不动**——
  - "我的帖子"入口(`Mine.tsx:111`):属个人中心体系(E3),**留后续**。
  - "AI git 工具" / "RAG" 死入口:属 rag-git 物理删除,**留三期**(E2)。
  - 即:二期 Mine 只触头像,死入口与个人中心入口均不动,分别留三期(git/RAG)与后续(我的帖子/个人中心),与 E2/E3 口径一致。
- **发帖配图**:见 §六。

---

## 六、发帖页详细设计(D6:替换 Compose 占位)

### 6.1 后端扩展

**`POST /api/posts`**(现已带 `JwtAuthGuard`,`posts.controller.ts:41-54`):
- 新建 `CreatePostDto`:`title @IsNotEmpty @MaxLength(255)`;`content @IsString`(纯文本);`gameId? @IsOptional @IsInt`;`tagIds? @IsOptional @IsArray @IsInt({each})`;`fileIds? @IsOptional @IsArray @IsInt({each})`。
- `posts.service.create` 扩展(现 `:96-108` 仅收 title/content/userId):
  - `prisma.post.create` 写 `title/content/userId/gameId`;`createdAt` 由 `@default(now())` 自动(一期字段)。
  - `tagIds` → 批量建 `PostTag`(`createMany`,**多选**,承决议 I)。
  - `fileIds` → `prisma.file.updateMany({ where:{ id:{ in:fileIds }, userId }, data:{ postId } })`(回填归属,校验文件属本人)。
  - 返回 `{ id }`。

**`GET /api/games`**(公开,`GameModule`):返回 `Game[]`(`id/name/cover/description`),`orderBy: { id: 'asc' }`。

### 6.2 games seed(E1)
- 新增 `src/scripts/seed-games.ts`:**最小量**演示游戏(如《黑神话:悟空》《原神》《艾尔登法环》《塞尔达传说》等数条),**可重复执行**(`upsert` by `name` unique),与四期"演示 seed"分开。属一期数据奠基的延续。运行 `npx ts-node src/scripts/seed-games.ts`。

### 6.3 前端发帖页(替换 `pages/Compose.tsx`)
- 路由不变(一期 `/compose`,受 `RequireAuth`)。把占位内容替换为真实表单。
- 表单字段:
  1. **标题**:Input(foundation §3.2),实时字数。
  2. **游戏**:**单选**——`GET /games` 填充选择控件(新增 `src/api/games.ts` `fetchGames`;可建最小 `useGameStore` 或组件内拉取)。
  3. **内容类型 Tag**:**多选**(决议 I),源自 `GET /posts/tags`(现有),多选 chip。
     - **实现核实要求**:该接口返回的 tag 必须是**一期 migration 重建后的五类内容类型(资讯/攻略/求助/评测/活动)**,而非残留旧游戏名 tag。实现时核实:(a) 该接口确为直读 `tags` 表(故自动返回重建后的五类);(b) 发帖页与首页标签栏(§八第 6 条修复后)用**同一 tags 数据源**;(c) 若发现任何处硬编码了旧游戏名 tag 列表,**一并指出**(不在本文档展开修复,记为实现时核实点)。
  4. **封面图**:选图 → `uploadImage` 得 `fileId` 列表,预览缩略图。
  5. **正文**:**纯文本 Textarea**(foundation §3.2)。**Markdown 渲染/预览留四期**(概要 11.6)。
- 提交流程:**先**对未上传的图调 `POST /upload/image` 收集 `fileIds` → **再** `POST /posts`(`{title,content,gameId,tagIds,fileIds}`)→ 成功 toast + 跳转新帖详情或首页。
- `src/api/posts.ts` 的 `createPosts`(现为硬编码占位)改为接收真实参数。

---

## 七、登录注册 auth 页详细设计(D3)

### 7.1 后端(仅改注册 DTO)
- `create-users.dto.ts`:`password` 的 `@MinLength(6)` → **`@MinLength(8)`** + `@Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: '密码需包含字母和数字' })`(对齐 11.5 与原型强度规则)。
- **`auth/dto/login.dto.ts` 的 `@MinLength(6)` 不改**(保旧账号 / 测试账号 `test123` 可登)——**已确认边界**。
- `users.service` bcrypt rounds(=10)、注册流程**不动**。

### 7.2 前端(改造 `pages/Login.tsx` → 分栏 auth 页)
- **布局**:据原型 `auth.html` 与一期 §3.3,**独立全屏分栏**(左品牌面板 + 右表单),**不套 App Shell**;`/login` **单路由**承载登录/注册,**不单开 `/register`**(已确认)。
- **结构**:左品牌面板(Logo + 卖点,静态);右侧 `seg` 分段控件切换「登录 / 注册」两套表单(`data-state` 选中,foundation §6.2)。
- **登录表单**:用户名 + 密码(显隐切换)→ 复用现有 `useUserStore.login`(链路不变)。
- **注册表单**:昵称 + 密码(显隐)+ **密码强度条** + 确认密码 → 新增 `src/api/user.ts` `doRegister`(`POST /users/register`)→ 成功后自动登录或切到登录 tab。
  - 新增 `useUserStore.register`(可选)或页面内直接调 `doRegister`。
- **密码强度条**(前端纯展示,原型评分):`≥8 → +1`、`含字母+数字 → +1`、`含特殊字符或≥12 → +1`,三档色(弱/中/强)。与后端 `MinLength(8)+字母数字` 对齐(强度条是 UX 提示,真正拦截在后端 DTO)。
- **视觉精还原(Neo-Brutalism / token)留四期**;本期只做分栏结构 + seg 切换 + 显隐 + 强度条 + 真实接口对接。
- `src/types` 按需补 `RegisterDto`(可复用 `Credentail`)。

---

## 八、数据正确性修复(逐条:现状 → 改为 → 位置)

> 仅改下列各点,**不重构** `posts.service.ts` 其余逻辑。硬编码 `http://localhost:3000/uploads` **保留**(归四期)。
> **定位方式(重要)**:下表「定位」列用**代码模式**描述。`posts.service` 在二期被多块反复改动(点赞块已改、上传/发帖块陆续改),**行号持续漂移、不可依赖**。实现时**一律以 grep 代码模式定位**(`-small.jpg` / `-large.jpg` / `avatars[0]` / `-thumbnail.jpg` / `tags.data` / `Math.random` / `new Date().toISOString`),**搜索结果为准**;不预先订正行号(后续块还会改 `posts.service`,订正会再次失准)。
> **实现状态(已完成)**:本表各点已于**二期数据修复块**实现并 curl 验证 —— 后端 `posts.service`(findAll/findOne 头像三元 ×2、findAll thumbnail 三元、findOne publishedAt 改 createdAt、findAll 补 publishedAt、findAll/findOne 补 viewCount)、`auth.service`(login 头像三元);前端 `useHomeStore`(tags 取值)、`PostItem` / 详情页(删 `Math.random` 改读 `viewCount`)、`types`(Post 补 `viewCount?`)。`ai.service` 的 `search()` **本期未改、留三期**;其两处头像/缩略 URL 经**三期摸底核实已三元判空、无 bug**(原记"留三期修头像"系预判未核对代码,详见 §八头像地图 `ai.service` 条订正),唯 `publishedAt` 假时间留三期(改 `search` 时顺带修读 `createdAt`)。定位仍用模式、行号不回填。

| # | 现状 | 改为 | 定位(grep 模式,行号已废) |
|---|------|------|------|
| 1 | `publishedAt: new Date().toISOString()`(伪造,每次不同) | `publishedAt: post.createdAt.toISOString()` | `posts.service` 的 **findOne** 返回对象;grep `new Date().toISOString` / `publishedAt` |
| 2 | **findAll 不返回任何时间字段**(列表无真实时间) | data 映射补 `publishedAt: post.createdAt.toISOString()`(`createdAt` 标量默认返回) | `posts.service` 的 **findAll** `posts.map` 映射块;grep `brief:` 定位映射、确认其无 `publishedAt` |
| 3 | 头像 URL 未判空 → `undefined-small.jpg` | 三元判空:`avatars[0]?.filename ? \`...-small.jpg\` : ''` | `posts.service` **两处**(findAll + findOne);grep `avatars[0]` / `-small.jpg` |
| 4 | `thumbnail: \`...-thumbnail.jpg\` \|\| ''`(`\|\|` 对模板恒真,失效) | 三元判空(对齐 findOne 的 thumbnail 正确写法):`files[0] ? \`...\` : ''` | `posts.service` 的 **findAll** thumbnail 拼接;grep `-thumbnail.jpg` 找带 `\|\| ''` 那处 |
| 5 | `viewCount` 未返回;前端用 `Math.random` 伪造浏览量 | 后端 findAll/findOne 映射补 `viewCount: post.viewCount`;前端删 `Math.random` 改读 `post.viewCount` | 后端 `posts.service` 两处映射(grep `totalLikes` 邻近、确认无 `viewCount`);前端 grep `Math.random` 于 `post/index.tsx`、`PostItem.tsx` |
| 6 | `set({ tags: tags.data \|\| [] })`(拦截器已解包返回数组本身) | `set({ tags: tags \|\| [] })` | 前端 `store/useHomeStore.ts` 的 `loadTags`;grep `tags.data` |
| 7 | 头像 URL 未判空 → `undefined-large.jpg`(与 #3 同类,位置在 `auth.service`) | 三元判空(同 #3 模式;此处用 `-large.jpg`) | `auth.service` 的 `login` 返回 `user.avatar`;grep `-large.jpg` |

> **修复前置·头像 URL 全局搜全地图(上一块上传已 grep 预演)**:头像 URL 拼接的全部分布如下,数据修复块一来即按此核对(再 grep 一次确认无新增):
> - `posts.service`(**findAll + findOne 两处**)—— `avatars[0]` / `-small.jpg` 未判空 → **二期**(#3)
> - `auth.service.login`(**一处**)—— `-large.jpg` 未判空 → **二期**(#7)
> - `ai.service`(`search()` **两处**:头像 `-small` + 缩略 `-thumbnail`)—— ⚠️ **三期摸底核实纠正(2026-06-25)**:经读 `ai.service.ts` 的 `search()`,此两处 URL 实际**均已三元判空**(`avatars[0] ? \`...-small.jpg\` : ''`、`files[0] ? \`...-thumbnail.jpg\` : ''`)、**无 bug**;原记"未判空、留三期修"系**预判、未核对代码**(git 亦显示 `ai.service.ts` 自初始提交未改动)。故三期此处**无头像 bug 可修**。`search()` 真正待修的是 `publishedAt: new Date().toISOString()`(伪造时间,同 §八#1),归三期改 `search` 时顺带修(改读 `post.createdAt`)。
> - `comments.service`(**一处**:头像 `-small`)—— 本期已写、**已三元判空、无 bug**(不需修)
>
> 数据修复块实现时:先按上图 + **再 grep 全局搜全**(`-small.jpg` / `-large.jpg` / `avatars[0]` / `/uploads/avatar/`)重新定位所有点,再逐条修;若发现表外新位置,**先更新本表(先改文档)再改代码**。`ai.service` 两处头像的二期/三期归属**已拍定(2026-06-25 三期摸底)**:经核实已判空、无 bug,**不属待修项**;`ai.service` 唯一留三期的数据修复是 `search()` 的 `publishedAt` 假时间(见上条)。
>
> **概要记述纠正(已确认)**:概要(`01-分期概要设计.md`)称"修头像 → 对齐 `findOne` 的三元判空写法",但实测 **`findOne` 的头像同样未判空**;`findOne` 真正用三元判空的是 **thumbnail**。故 #3 两处头像均需改,参照模式为 `findOne` 的 thumbnail 三元写法。
>
> **浏览量自增(二期不做,已定)**:`GET /posts/:id`、`GET /posts` 保持**纯读、无写副作用**,`viewCount` **恒为数据库现值**(四期 seed 灌入)。二期"浏览量真实"的含义 = 前端真实读取 `post.viewCount`、不再 `Math.random`,**不要求其会增长**。此举避免 GET 产生写副作用、并保证依赖它的 e2e 可对固定值稳定断言。浏览量自增能力(进详情计数 / 去重统计 / 防刷)是明确的后续待办(见 §11.2),非二期范围。第 5 条修复(返回真实 `viewCount`、删 `Math.random`)语义为"读真实值",与"不自增"一致、无冲突。

### 8.1 列表数据新鲜度(首页返回后计数即时一致)

> 评论 + 点赞验收中发现并修复。**架构变更**:原方案依赖 react-activation keep-alive 的"激活静默刷新";已**移除 react-activation**,改由 **patchPost 直接传播** + store 数据保持。(移除来龙去脉:`insertBefore` 白屏最初误诊为 react-activation 与 React 19.2 不兼容,**移除后白屏仍复现** → **真凶是浏览器翻译扩展改 DOM**,已用 `body translate="no"` + 全局 `ErrorBoundary` 加固;react-activation 仅被报错栈"在场"冤枉、非真凶,但确未适配 React 19 故保留移除。详见 `00-foundation.md` §五。)

- **现象(原)**:详情页发评论 / 点赞后返回首页,首页列表的评论数 / 点赞数**有概率**仍为旧值,刷新才更新。
- **根因(诊断确认)**:原激活刷新(`refreshLoaded`)在返回时**重读后端一次**,与详情页操作的后端写入**并发**——读可能早于写完成 → 旧值(700ms 对照实验正反证明)。(原诊断的第 ② 点"react-activation 与 React 19 DOM 冲突崩坏激活"系**误诊**——`insertBefore` 白屏真凶是浏览器翻译扩展、非 react-activation,见 §8.1 题注;计数滞后的真因仅为上述读写并发竞态。)
- **已定修法(本期处理)**:**patchPost 直接传播**——详情页点赞/评论成功后,用**接口返回的后端权威值**(`likePost` 的 `liked/totalLikes`、评论用重拉评论树后的总数)调 `useHomeStore.patchPost(id, patch)` **直接更新首页 store 中该帖**的 `totalLikes/totalComments/likedByMe`。返回首页该帖即新值——**不依赖返回时重读后端**(消除读写并发竞态)、**不依赖 react-activation 激活**(已移除)。
- **数据保持 + 滚动**:首页 `posts/page/currentTag` 在 `useHomeStore`(全局、不随卸载丢)→ 返回首页**不重拉、不闪**(`Home` mount 时 store 已有 posts 则跳过加载);滚动位置靠 **sessionStorage** 存/恢复(替代原 `saveScrollPosition`,恢复时机须等列表渲染撑高)。
- **不测**:此为状态/时序相关,e2e 不覆盖(见 §十);patchPost 的传播逻辑由人工反复操作验收。

---

## 九、复用与扩展(承 foundation §七 复用优先原则)

| 二期需求 | 复用 / 扩展 | 来源 |
|---------|-----------|------|
| 写接口鉴权 | **直接复用 `JwtAuthGuard` 守卫类**(`import` 守卫类用于 `@UseGuards`,**不需** `imports:[AuthModule]`;`JwtStrategy` 已全局注册,与现状 `PostsController` 用法一致) | 一期 auth.module 已注册 `JwtStrategy` / `exports` 守卫 |
| `likedByMe` 可选鉴权 | **新增** `OptionalJwtAuthGuard`(继承 `AuthGuard('jwt')`,handleRequest 不抛错) | 二期新增(最小) |
| 前端鉴权请求 / 401 刷新 | axios 拦截器 + token 刷新队列(不动) | `api/config.ts`(现状) |
| 评论框 / 发帖正文 | `Textarea` | foundation §3.2 |
| 表单输入 / 按钮 / 头像 | `Input` / `Button` / `Avatar` | foundation §3.1/§3.2/§3.5 |
| 发帖选游戏控件 | `Select`(foundation §3.2 标注新建);二期为达成功能可建**最小可用** Select/下拉,视觉精化留四期 | foundation §3.2 |
| 内容类型多选 / 详情标签 | `Pill` / `TagChip` | foundation §3.3/§3.4 |
| 点赞统计按钮 | `StatButton`(含 liked 态) | foundation §3.8 |
| 头像选择交互 | 现有 `Drawer`(Mine 改上传复用) | 现状 `components/ui/drawer.tsx` |
| 反馈(toast/确认框) | toast / Dialog | foundation §6.3 |

**新组件原则**(foundation §七):优先组合现有 token 与基础组件;**仅在无法满足时**新建,且承 foundation 契约骨架,不另起样式体系。二期新建上限:`OptionalJwtAuthGuard`(后端)、密码强度条(前端展示)、发帖页表单控件(在 foundation 契约下落最小可用形态)。

### 9.1 二期实现通则(后端,各块预防)
- **`req.user.id` 写 Prisma Int 字段须 `Number()` 转换**:JWT `payload.sub` 是**字符串**(`jwt.strategy.validate` 返回 `{ id: payload.sub }`),故 `req.user.id` 为字符串。凡用它操作 Prisma 的 `Int` 字段(`userId` 等)——写入(`create`/`upsert`)或比较(本人校验)——**必须先 `Number()`**,对齐现状 `posts.service.create` 的 `Number(data.userId)`。否则:写入触发 Prisma 类型错 **500**;本人校验 `number !== string` 恒真 → 误判 **403**。**评论块已踩并修(`comments.service` create/remove),点赞/上传/发帖各块照此预防。**

---

## 十、二期验收对应(概要第六章 → 可核对验收点)

> 验收链路(概要 132):**经新登录注册页注册/登录 → 发帖(选游戏+类型+配图)→ 列表显示真实时间/封面 → 详情可嵌套评论、点赞持久化、浏览量真实 → 刷新数据不丢。**

| 验收点 | 判定 | 类型 |
|--------|------|------|
| 注册(密码 ≥8 含字母数字)→ 登录成功 | 注册接口拒弱密码;登录态写入 | **e2e 可锁** + 人工 |
| 发帖:选游戏 + 多类型 + 配图 → 成功落库 | `POST /posts` 后新帖出现在列表/详情 | **e2e 可锁**(接口) + 人工(图） |
| 列表显示真实时间与封面 | `publishedAt`=真实 `createdAt`;`thumbnail` 判空正确 | **e2e 可锁** |
| 详情两层评论:发评论 / 回复 / 删除本人 | 评论出现、回复挂顶层、删除生效 | **e2e 可锁** |
| 点赞持久化:赞/取消/刷新后 `likedByMe` 正确 | toggle + 持久化 + 计数 | **e2e 可锁** |
| 浏览量真实(无 `Math.random`) | 详情/列表读取真实 `viewCount`(非随机数);二期不自增,值恒定 | **e2e 可锁**(对固定 seed 值断言)/ 人工 |
| 未登录写操作被拦(发评论/点赞/发帖) | 401 / 重定向 | **e2e 可锁**(承一期守卫 e2e 扩展) |
| 标签筛选栏恢复(`tags.data` bug) | 首页 chip 显示 | 人工 / e2e |
| 头像上传 + 缩放产物 | small/large 生成、Mine 头像更新 | **人工**(图像) |
| 密码强度条交互 | 三档变化 | 人工 |

> **补 e2e 时机**(承 CLAUDE.md 常驻规则):每个功能经**用户人工验收通过后**,才按模块增量补其 e2e(评论 / 点赞 / 发帖 / auth 各一文件),不自行判定;断言用 URL/文本/`data-testid`,沿用一期"前端路由拦截 mock 后端"或对接真实后端按需取舍。

### 10.1 二期 e2e 覆盖情况(账目清晰:测了什么、明确不测什么)

> 给二期测试一个清晰的账。下列「不做 e2e」是**经评估不适合 e2e、由人工验收覆盖**的**决策**,不是"待补"。

**已覆盖(e2e,前端路由拦截 mock 后端)**:
- `auth-guard.spec.ts`(一期守卫,11):路由保护 / 重定向 / `/rag`·`/git` 不可达。
- `social.spec.ts`(详情页评论+点赞,7):发评论 / 回复挂顶层 / 删除 / 点赞±1 / 刷新持久 / 未登录引导。
- `auth.spec.ts`(登录注册,7):登录成功离开 /login、登录失败不放行、注册成功自动登录、确认密码不一致前端拦、弱密码后端 400、seg 切换、密码显隐。
- `home.spec.ts`(首页标签栏,4):五类显示、点击筛选+高亮、**顺序切换 A→B**、toggle 取消回全部。
- `compose.spec.ts`(发帖页,5):发帖成功跳详情 / 不传图也能发 / 标题空·正文空 → 提交按钮禁用(前端拦) / **发帖成功后新帖进首页列表顶(`prependPost`:首页 → 发帖 → 导航回首页,断言列表首项为新帖、且数量 +1)**。

**明确不做 e2e、靠人工验收(时序敏感、e2e 脆弱)**:
- **首页返回后计数一致(patchPost)+ 滚动恢复(sessionStorage)**:涉及状态 / 滚动时序,归人工。注:**发帖新帖即时上顶(`prependPost`)已 e2e 覆盖**(见上 `compose.spec.ts`)——它是确定性的"列表首项 = 新帖、数量 +1"断言,不依赖滚动高度 / 时序;而**滚动恢复**依赖真实滚动高度与渲染时序(`scroll` 实时存 + 返回双 rAF `scrollTo`),e2e 难稳定断言,故归人工(承本节"时序敏感归人工"原则)。计数一致(patchPost)同理归人工。
- **快速连切 tag 的竞态**(A→B 极速点最终一致):依赖请求竞态时序(顺序切换已 e2e 覆盖;竞态归人工)。
- **无限滚动加载更多**(滚动触发 + 分页 append):依赖滚动与异步分页。
- **登录失败的错误文案显示**:现状 axios 拦截器对 401 触发 refresh(失败→重载 /login),错误文案在重载中丢失、显示不稳定;e2e 只锁"登录失败不放行",文案 UX 归人工(此为现状拦截器 UX 瑕疵,改进留后续,本期不改)。

---

## 十一、待定项 + 留给后续

### 11.1 本期待定(不阻塞,实现中再定)
- 头像三档像素(small≈100 / large≈400)、帖子图 thumbnail 宽(≈400)的确切值。
- 上传大小上限、允许的图片格式集合。
- 顶层评论排序(asc/desc)与是否分页(大量评论时)。
- 注册成功后是自动登录还是切登录 tab。

### 11.2 留给后续(明确不在二期)
- **三期**:语义搜索、游戏 AI 助手、`titleEmbedding` 标题向量基建、游戏化前端(游戏库/筛选/游戏详情页)、rag-git-avatar 物理删除(含 **Mine 页 git/RAG 死入口与组件删除,E2**)。
  - **Chat 对话保持(承二期 react-activation 移除)**:二期已移除 react-activation/keep-alive,Chat 不再被 `<KeepAlive>` 包裹(二期 Chat 无真对话功能、不涉及);**三期做 Chat AI 对话时,若需"切走再回保持对话",改用 store(Zustand)实现,不要再依赖 react-activation**(已移除;0.13.4 未适配 React 19,且首页保持本就改用 store 实现)。
- **四期**:Neo-Brutalism 视觉落地 / 设计 token 接入 Tailwind、**auth 页视觉精还原**、**去硬编码 `http://localhost:3000/uploads`(4 处)抽 env**、磁盘旧头像/文件清理、限流 / 强密钥(**限流范围含 `/auth/login` + `/users/register`**——注册接口二期是公开裸接口,四期加固防批量注册滥用,勿只限登录漏了注册)、**Markdown 富文本渲染与 XSS 防护**、演示 seed(与本期 games seed 区分)。
- **浏览量自增能力(已定的后续待办)**:进详情计数 / 去重统计 / 防刷,最终需补做,留到最后(可并入四期收尾或四期之后),**非二期范围**;二期 `viewCount` 仅读真实值、不增长(见 §八)。
- **评论时间字段(已定的后续待办)**:`Comment` 表增加 `createdAt`(及相应 migration)以支持评论时间显示,留到后续某期补做(类比浏览量自增);二期暂不显示评论时间、排序用自增 id 近似时间序(见 §3.1/§3.3),该需求不丢弃。
- **个人中心体系(E3,二期不做)**:`profile` / `my-posts` / `my-likes` 作为独立设计单元留二期后或并入三期;二期点赞验收止于"详情页能赞/取消/持久化/`likedByMe` 正确",不含"我的点赞列表"。
- 预设头像选择能力(承 11.5 / 11.6),去留与接口留后续。
