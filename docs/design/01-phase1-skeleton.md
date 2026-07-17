# 一期功能详细设计:前端骨架 + 数据奠基

> 版本:v1 · 日期:2026-06-17 · 状态:待评审
> 对应总纲:`01-分期概要设计.md` 第五章「一期:前端骨架 + 数据奠基」
> 上游底座:`docs/design/00-foundation.md`(token / 全局组件契约 / App Shell / 路由约定 / data-state)

---

## 一、文档定位与依赖

本文件是**一期的功能详细设计**,把概要第五章的一期范围落成可执行的设计:数据库 migration、App Shell 落地、侧边导航/顶栏组件、三段式响应式、路由表与守卫、占位约定。

**依赖关系:**
- 上承 `01-分期概要设计.md`(总纲,一期范围权威来源)与 `00-foundation.md`(设计底座)。
- 凡 foundation 已定义者(设计 token、全局组件契约、App Shell 结构、三段式断点形态、路由与守卫约定、`data-state` 取值、占位/反馈约定)**一律引用、注明节号,不在本文件重述**。本文件只写一期"如何把它们实现出来"的落地设计与 DB 设计(foundation 不含 DB)。

**一期产出定位(承概要):** 一个可运行的"空壳"应用 —— 侧边栏在、路由通、三断点不塌、登录态可拦。一期是后续所有前端工作的稳定地基。

**一期核心边界(贯穿全文,务必遵守):**
> **一期碰"页面外面的壳",不碰"页面里面的内容"。**
> 现有展示页(首页列表、帖子详情只读)在一期**只做一个动作:原样挂入 App Shell 内容容器**,确保渲染与路由正常;**绝不触碰其内部实现**(页面内布局、tag 筛选逻辑、`PostItem` 内部、视觉样式一律不动)。这些页面的业务改造属二期、视觉改造属四期。

---

## 二、数据库 migration 详细设计

> 文件:`backend/backend/posts/prisma/schema.prisma`;执行:`npx prisma migrate dev`。
> 范围红线:**一期只改 schema / 建模型字段 / 重建 Tag 数据。不改任何后端读写逻辑**(`posts.service.ts` 改用 `createdAt`、删 `Math.random()`、消费 `viewCount/gameId` 等属二期)。

### 2.1 现状衔接(写作依据)

现有 `schema.prisma`:`Post` 仅 `id/title/content/userId` + 关系(comments/tags/likes/files),**无任何时间字段**;`Game` 表不存在;`Comment`(含 `parentId` 自引用,onDelete Cascade)、`Tag`(`name` unique)、`PostTag`(`@@id([postId,tagId])`)、`UserLikePost`、`Avatar`、`File` 均已就绪、结构无需改动(概要三节第 4 点)。

### 2.2 新增 `Game` 表(对齐概要三节)

```prisma
model Game {
  id          Int      @id @default(autoincrement())
  name        String   @unique @db.VarChar(255)
  cover       String?  @db.VarChar(255)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  posts       Post[]
  @@map("games")
}
```

### 2.3 `Post` 增补字段(对齐概要三节)

在现有 `Post` 模型追加(现有字段、关系、`@@index([userId])`、`@@map("posts")` 全部保留):

| 字段 | 定义 | 说明 |
|---|---|---|
| `createdAt` | `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)` | 真实发布时间;**存量行迁移时由 `default now()` 回填当前时间**(演示项目可接受) |
| `updatedAt` | `DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)` | 更新时间 |
| `viewCount` | `Int @default(0) @map("view_count")` | 浏览量;一期仅建字段,前端改读、自增逻辑属二期 |
| `gameId` | `Int?` | 关联游戏,可空 |
| `game` | `Game? @relation(fields: [gameId], references: [id], onDelete: SetNull)` | 游戏删除时帖子保留、置空 |
| `titleEmbedding` | `Json? @map("title_embedding")` | 标题向量;一期仅建字段,生成/消费属三期 |
| 索引 | `@@index([gameId])` | 配合游戏筛选 |

### 2.4 `Tag` 语义重建(结构不变,仅数据)

- **结构不变**:`Tag` / `PostTag` 模型保持原样(概要三节第 3 点)。
- **数据重建**:把现有 `Tag` 数据(游戏名:原神等)清除,灌入**内容类型**集合。内容类型**已定为五类:资讯 / 攻略 / 求助 / 评测 / 活动**(依概要 11.5 标签语义裁定,对齐原型 pill 的 news/guide/help/review/event)。
- **旧关联处理**:现有帖子经 `PostTag` 关联的是旧游戏名 tag,清旧 tag 会**使旧 post-tag 关联失效** → 重建时一并清空旧 `PostTag` 关联。**现有帖子重新打内容类型 tag,留二期发帖/改帖时处理**(一期不为存量帖子补关联)。
- **重建方式**:通过 seed 脚本或迁移内 SQL 实现(清 `post_tags` → 清 `tags` → 插入内容类型 tag);具体 seed 脚本归属见第九章(与四期演示 seed 的关系)。

### 2.5 迁移执行顺序

1. 编辑 `schema.prisma`:加 `Game` 模型、`Post` 追加字段与关系/索引。
2. `npx prisma migrate dev`(生成并应用迁移;存量 `Post` 行的 `createdAt` 由 `default now()` 回填)。
3. `npx prisma generate`(刷新 client 类型)。
4. 执行 Tag 重建数据脚本(清旧游戏名 tag + 旧关联 → 灌内容类型 tag)。

> 一期 migration 完成后,DB 层即具备游戏关联、时间、浏览量、标题向量、内容类型 tag 的承载能力;**消费这些能力的后端/前端逻辑属二期及之后**。

---

## 三、App Shell 实现设计

> 结构定义见 `00-foundation.md` 第四章(引用,不重述)。本节写一期如何落地。

### 3.1 落地方式:`MainLayout` 改造为 App Shell

把现有 `src/layouts/MainLayout.tsx`(现 = `<Outlet/>` + `<BottomNav/>`,移动优先 `pb-16`,仅包 `/`、`/mine`)**改造**为 foundation 第四章定义的 App Shell:

```
MainLayout(= App Shell)
├─ Sidebar(左侧主导航)           ← 第四章 4.x,新建组件,见 §四
└─ main(右主区)
   ├─ Topbar(顶栏:SearchBar)     ← 见 §四
   └─ 内容容器(.container)        ← <Outlet/> 渲染各业务页
```

- 弃用现有移动优先的 `pb-16` + 独立底栏结构,改为 foundation 的 grid Shell(桌面侧栏 + 主区);移动端底 tab 由 Sidebar 的响应式形态承接(§五)。

### 3.2 业务页挂入内容容器(含现有展示页的硬边界)

一期把业务页路由收敛到 App Shell 的 `<Outlet/>` 内容容器下渲染:
- **现有展示页(首页 `/`、帖子详情 `/post/:id`)**:**原样挂入** `<Outlet/>`,只保证它们在新壳内正常渲染与路由 —— **不动页面内部任何实现**(重申第一章硬边界)。注:现状 `/post/:id` 用独立 `PostLayout`,一期将其纳入 App Shell 内容容器渲染(壳层调整),详情页**页面内容**不动。
- **未实现的写功能页(发帖)**:以**占位组件**挂入(§七)。
- **`/mine`、`/chat`、`/search`**:现有页面原样挂入(挂壳不碰内);其业务真实化分别属二期(mine)、三期(chat/search 对接 AI)。

### 3.3 auth 例外(不走 App Shell)

`/login` 是 foundation 4.2 标注的例外:auth 页为独立全屏分栏布局(`grid 1.05fr/.95fr`),**不套 App Shell**(无 Sidebar/Topbar)。一期 `/login` **沿用现状简单 `Login.tsx`**(其 auth 分栏改造属二期),路由上独立于 `MainLayout`,不进 `<Outlet/>`。

> **登录前提(经核实)**:现状登录链路(`Login.tsx` → `useUserStore.login` → `POST /auth/login` → 写 token + 跳首页)完整可用,后端 auth login/refresh 真实实现;一期 migration(仅增量字段 + Tag 数据重建、不改后端读写逻辑)**不影响登录链路与登录后落地首页**。故守卫重定向 `/login` 的链路**可验证**,**一期无需补登录开发工作**。

---

## 四、侧边导航与顶栏组件

> 全局组件契约见 `00-foundation.md` 第三章(引用)。本节写一期的**改造/新建落地**,逐个挂钩现有组件。

### 4.1 Sidebar 侧边导航(**新建** `components/Sidebar.tsx`)

- 现状**无侧栏**(只有移动底栏),故新建,落地 foundation 3.11 Sidebar 契约。
- **主导航 4 项**(概要决议 K):首页 `/`、攻略助手 `/chat`、发帖(发帖页路径)、我的 `/mine`。**补齐现状缺的"发帖"项**。
- 当前路由项用 `data-state="active"` 标记(foundation 决议 C),取代原型 `.nav-link.active`。
- 含品牌区 + nav-link 列表 + 用户卡(用户卡内容/登录态展示属页面级数据,接入细节随 Mine/用户体系,本期占位或读 `useUserStore` 现状,不新增业务)。

### 4.2 移动底 tab(由 Sidebar 单组件承接 · 已定方案 a)

- 现状 `BottomNav` = 移动底 tab,**仅 3 项**(首页/聊天/我的),内含 `needsLogin` 守卫逻辑。
- **落地形态(已定 · 方案 a)**:由 `Sidebar` **单组件响应式渲染三态**(桌面展开 / 平板图标列 / 手机底 tab),移动底 tab 是 Sidebar 在 `≤760` 断点的形态;现有 `BottomNav.tsx` 的导航逻辑**并入 Sidebar**(单一事实来源,与项目一贯原则一致),`BottomNav.tsx` 不再单独使用、随并入移除。
- **改造要点**:① 主导航补齐 **4 项**(首页/攻略助手/发帖/我的,决议 K);② 守卫逻辑从导航组件剥离、统一到路由级守卫 `<RequireAuth>`(§六),导航只负责呈现与跳转;③ 当前项 `data-state="active"`。
- 断点实现:`lg:`(≥1024)展开 248、默认(<1024)收 80px 图标列、`max-[760px]:`(≤760)转底部 fixed tab(任意值断点精确命中 760,不依赖自定义 @theme)。

### 4.3 Topbar 顶栏 + SearchBar(整合)

- foundation 的 **Topbar = 主区顶部搜索栏**(SearchBar,foundation 3.6)。
- **它 ≠ 现有 `Header.tsx`** —— `Header.tsx` 是**页面级"标题 + 返回"栏**(详情/聊天页用),属页面级组件,**一期保留不动**(不纳入 App Shell 顶栏,后续随各页页面设计处理)。
- 一期 Topbar 落地:在 App Shell 主区顶部放 SearchBar(整合首页现有搜索入口的位置);搜索是否在一期接后端见 §九待定(一期可仅占位/沿用现有搜索跳转,不新增搜索业务)。

### 4.4 组件 ↔ 现状对照(一期)

| 一期组件 | 现状 | 处置 |
|---|---|---|
| Sidebar | 无侧栏 | **新建**(foundation 3.11) |
| 移动底 tab | `BottomNav.tsx`(3 项) | **改造**(补发帖、作 Sidebar 移动形态、剥离守卫) |
| Topbar / SearchBar | 首页内搜索;`Header.tsx`(标题栏,非顶栏) | 整合 SearchBar 到主区顶部;**`Header.tsx` 保留为页面级,不动** |
| 内容容器 Outlet | `MainLayout` | **改造**为 App Shell 主区 |

---

## 五、三段式响应式实现

> 断点与各档形态见 `00-foundation.md` 4.2(引用)。本节写一期落地行为。

| 断点 | 触发 | Sidebar 形态 | 内容容器 |
|---|---|---|---|
| 桌面 | `> 1024px` | 全展开 248px(品牌 + 图标文字 + 用户卡) | `.container`(gutter 桌面档,最大宽 1180) |
| 平板 | `≤ 1024px` | 收为 **80px 图标列**(隐藏文字/品牌字/用户卡 meta,nav-link 居中) | gutter 平板档 |
| 手机 | `≤ 760px` | 转**底部 fixed tab**(横向均分 4 项,隐藏品牌/分隔/用户卡;主区留 `padding-bottom: 72px`) | 单列(列数收为 1) |

- App Shell grid 列模板随断点切换:`248px 1fr` → `80px 1fr` → `1fr`(侧栏脱离文档流转底 tab)。
- 一期验收三断点"布局不塌、底 tab 正常",内容容器内即便是占位/现有展示页,也应在三档正确排布。

---

## 六、路由表与守卫详细设计

### 6.1 一期目标路由表

| path | 渲染 | 进 App Shell | 受保护 | 一期处置 |
|---|---|---|---|---|
| `/` | 首页(现有展示页) | 是 | 否 | 原样挂入 |
| `/post/:id` | 帖子详情(现有,只读) | 是 | 否 | 原样挂入(壳层从独立 PostLayout 并入 App Shell) |
| `/search` | 搜索(现有) | 是 | 否 | 原样挂入 |
| `/chat` | 攻略助手(现有 Chat) | 是 | **是** | 原样挂入;受守卫 |
| `/mine` | 我的(现有 Mine) | 是 | **是** | 原样挂入;受守卫 |
| 发帖页路径 | **占位组件** | 是 | **是** | 新建占位(§七);受守卫 |
| `/login` | 简单 `Login.tsx`(现状) | **否(独立全屏)** | 否 | 沿用现状;auth 改造属二期 |
| ~~`/rag`~~ | — | — | — | **整条移除**(见 6.3) |
| ~~`/git`~~ | — | — | — | **整条移除**(见 6.3) |

> 发帖页确切 path 见 §九待定(如 `/compose` 或 `/post/new`)。

### 6.2 守卫:路由级包裹(替代 useEffect 兜底)

- 现状:`App.tsx` 在 `<Routes>` 外用 `useEffect` 监听 `pathname` 兜底重定向,且 `BottomNav` 内另有一重守卫。
- 一期改为**路由级守卫包裹**(foundation 5.2):受保护路由的 element 由统一守卫组件(如 `<RequireAuth>`)包裹,未登录重定向 `/login`;移除 `App.tsx` 的 useEffect 兜底与 `BottomNav` 内的守卫逻辑,**守卫单一来源**。
- **`needsLogin` 最终形态**:覆盖 `/chat`、发帖页、`/mine`。

### 6.3 清理:两类废弃项**分开处理**(性质不同,勿混)

- **有页面要砍的 `/rag`、`/git`**:一期在**路由表中整条移除**(路由不可达、不在导航出现、`needsLogin` 自然不含)。但 `RAG.tsx`/`Git.tsx` 组件文件、`store/rag.ts`/`store/git.ts`、`api/rag.ts`/`api/git.ts` 的**物理删除留三期**(承概要第七章"砍 rag/git")。**后端 AI 代码一期完全不动。**
- **无页面的 `/order` 死引用**:`/order` 只存在于现状 `needsLogin` 数组、**无对应路由/页面**(死引用)→ 一期**直接清除该死引用**(从守卫清单删掉),与 rag/git 无关、不涉及任何文件删除。

### 6.4 占位页与守卫的关系

受保护页一期可被守卫拦截:发帖页(占位)+ `/chat`、`/mine`(现有页原样挂入)在未登录时由路由级守卫重定向 `/login`。一期保护的是**已配好的最终路由**,被保护的真实业务由二三期填入(承概要)。

---

## 七、占位组件约定

### 7.1 适用对象(与"原样挂入"区分)

- **占位组件**:仅用于**一期尚不存在的页面**(本期:发帖页)。
- **现有展示页(首页/详情/mine/chat/search)= 原样挂入,不是占位** —— 它们已有实现,一期挂壳沿用,**不替换为占位**。

### 7.2 占位形态

统一占位组件(如 `components/Placeholder.tsx` 或页面级占位):
- 可正常渲染于 App Shell 内容容器,三断点不塌(支撑骨架演示)。
- 内容:页面标题/图标 + 一句标注,如 **「发帖功能将在二期实现」**,清晰表明业务未实现。
- 不含任何业务交互(无表单提交/接口调用)。

### 7.3 标注约定

占位文案统一指明归属期次(发帖 → 二期)。确切文案见 §九待定;原则是"可演示骨架 + 明示未实现"。

---

## 八、一期验收对应(概要第五章 → 可核对验收点)

| 验收点 | 核对方式 |
|---|---|
| 导航骨架就位 | App Shell 渲染,Sidebar 4 项(首页/攻略助手/发帖/我的)在桌面展开 |
| 三断点布局正常 | `>1024` 侧栏展开 / `≤1024` 收 80px 图标列 / `≤760` 转底 tab,内容容器列数正确、不塌 |
| 移动端底 tab 正常 | `≤760` 底部 4 项 tab 可见可点、当前项 `data-state="active"` |
| 路由保护生效 | 未登录访问 `/chat`、发帖页、`/mine` 被路由级守卫重定向 `/login`;`/`、`/post/:id`、`/search` 可匿名访问 |
| 废弃路由清理 | `/rag`、`/git` 不可达且不在导航;`needsLogin` 无 `/order` 死引用 |
| 现有展示页正常挂入 | 首页/详情在 App Shell 内容容器内正常渲染、路由可达(页面内部未被改动) |
| migration 可迁移 | `prisma migrate dev` 成功;`Game` 表、`Post` 新字段、内容类型 `Tag` 数据就位 |
| **不含业务功能验收** | 评论/点赞/上传/发帖/登录改造等**不在一期验收范围**(属二期及之后) |

**验收前提与口径(补充):**
- **受保护现有页的两种验证口径不同**:受保护的现有页(`/mine`、`/chat`)的"**挂入是否正常**"需在**登录态下**验证(登入后能在 App Shell 内正常渲染);**未登录态**只验证"**被守卫拦截重定向 `/login`**"。二者是不同的验收动作,勿混。
- **测试账号前提**:验收"登录后守卫放行"需 DB 中存在可用账号。因前端注册 UI 属二期,一期通过后端 `POST /users/register` **手动创建测试账号**进行验证;完整演示 seed 留四期。此为该验收点的前提,使"守卫放行"可被实际验证。

---

## 九、本文件待定项(不阻塞,执行中再定)

- **Tag 内容类型集合**:**已定·见概要 11.5** —— 五类:资讯 / 攻略 / 求助 / 评测 / 活动(对齐原型 pill news/guide/help/review/event)。详见 §2.4。
- **Tag 重建脚本归属**:一期重建 tag 数据的脚本,与四期演示 seed 脚本是同一套还是独立(一期最小化只灌 tag,演示数据留四期)。
- **发帖页路由 path**:`/compose` vs `/post/new` 等。
- **Topbar 搜索一期深度**:一期 SearchBar 是占位/沿用现有搜索跳转,还是接后端(倾向沿用现有、不新增业务)。
- **占位文案**:统一措辞与是否带期次链接。

> **非待定,已升格为一期实现期首批结构决策**(见 §4.2):移动导航落地形态(倾向 (a) Sidebar 单组件响应式三态、`BottomNav` 并入)—— 它决定 Sidebar/BottomNav 组件结构,须在实现首批确定,不作普通待定项拖后。
- **用户卡数据**:Sidebar 用户卡在一期读 `useUserStore` 现状即可,完整用户体系不在本期。

### 留给后续功能设计(不在本文件)
- 评论/点赞/上传/发帖表单/详情评论区/数据正确性修复、登录注册 auth 分栏改造 → 二期功能设计。
- 标题向量生成、语义搜索、AI 助手、游戏化前端、rag/git/avatar 物理删除 → 三期功能设计。
- 设计系统接入 Tailwind、Neo-Brutalism 视觉落地 → 四期。
