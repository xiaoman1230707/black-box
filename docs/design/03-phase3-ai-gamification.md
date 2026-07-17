# 三期功能详细设计:游戏化 + AI 精简(语义搜索 + AI 助手 + 物理删除)

> 版本:v1 · 日期:2026-06-25 · 状态:待评审
> 适用范围:三期实现的事实来源(接口/字段/前端交互/删除清单)。上游范围权威为 `01-分期概要设计.md` 第七章;设计底座为 `00-foundation.md`;承接 `02-phase2-social.md`(二期·已实现验收)。

---

## 一、文档定位与依赖

**本文件是什么**:三期「游戏化 + AI 精简」的功能详细设计。三期与前两期**本质不同**:首次碰一直未动的 AI 代码(`ai.service`/`ai.controller`),且**同时"建"与"删"两类方向相反的活**——必须分清,本文件**建、删分章**。

**两类活的总纲(全文恒守)**:
- **建(第三~六章)**:标题向量基建 → 语义搜索改造 → 游戏 AI 助手 → 按游戏筛选。
- **删(第七章)**:`rag` / `git` / `avatar(DALL-E)` 三条 AI 功能的后端接口 + 前端页/store/api + Mine 死入口 + aiAvatar store/api,**物理删除**。

**依赖链**:`01-分期概要设计.md`(总纲·第七章)→ `00-foundation.md`(底座)→ `01-phase1-skeleton.md`(已实现)→ `02-phase2-social.md`(已实现)→ **本文件(三期)**。

**三期范围红线(防漂移)**:
- **三期做**:见上"建/删"两类。AI 能力**沿用现有外部服务**(已验活,见 §2.1);游戏化**只做"按游戏筛选帖子"一条最小线**。
- **三期不做(留后续,非四期)**:游戏**专区页**、游戏**详情页**——概要第七章为"专区**或**筛选"二选一、详情页标"**可选**",故只做筛选、二者延后至三期后续迭代(待排期)。
- **四期做(焊死不碰)**:Neo-Brutalism 视觉落地 / token 接入 Tailwind、限流 / 强密钥、去硬编码 `http://localhost:3000/uploads`、Markdown 富文本、演示 seed。
- **首页主筛选不变**:仍按内容类型 Tag(资讯/攻略/求助/评测/活动),游戏维度是**补充**。

**实现纪律**:本文件是实现的事实来源;实现中若发现设计需调整,**先更新本文件,再改对应代码**(承二期纪律;§7 头像 bug 订正即此纪律的范例)。

**定位方式**:涉及现有代码处,一律给 **grep 代码模式**(行号会随实现漂移、不回填),以搜索结果为准。

---

## 二、后端接口总表(三期最终形态)

| 类别 | 方法 + 路径 | 鉴权 | 三期处置 |
|---|---|---|---|
| AI · 聊天 | `POST /api/ai/chat` | **JwtAuthGuard(新增)** | **改造**:站内检索增强 + SSE 协议对齐(§五) |
| AI · 语义搜索 | `GET /api/ai/search?keyword=` | **JwtAuthGuard(新增)** | **改造**:弃静态 JSON、改库内向量 + 修 `publishedAt`(§四) |
| AI · 头像生成 | ~~`GET /api/ai/avatar`~~ | — | **删除**(§七) |
| AI · RAG | ~~`POST /api/ai/rag`~~ | — | **删除**(§七) |
| AI · git commit | ~~`POST /api/ai/git`~~ | — | **删除**(§七) |
| 帖子 · 列表 | `GET /api/posts?page=&limit=&tag=&gameId=` | OptionalJwtAuthGuard(不变) | **扩展**:新增 `gameId` 筛选参(§六) |
| 游戏 · 列表 | `GET /api/games` | 公开(不变) | 不变(二期已有,发帖/筛选共用) |

> **鉴权变更说明(承概要七章"AI 接口同步加 JwtAuthGuard,不留到最后")**:
> - `chat`/`search` 加 `@UseGuards(JwtAuthGuard)`(import 自 `../auth/guard/jwt-auth.guard`,用法对齐 `posts.controller` 现有写法)。
> - **`AIModule` 需 `imports: [AuthModule]`**(现状仅 `imports: [PrismaModule]`)——复用 AuthModule 导出的 JWT 策略,guard 才能解析 token(对齐 02 §四模块组织"各模块 imports: [AuthModule]")。
> - 验收口径:**匿名调 `chat`/`search` 返回 401**(概要七章验收"匿名调 AI 接口被拒")。
> - `search`/`chat` 仅鉴权、**不需要 `userId` 业务逻辑**(检索与用户无关);加 guard 只为"登录才可用",不取 `req.user`。

---

## 三、标题向量基建(基础设施 · 其他 AI 功能的依赖,故置最前)

> 语义搜索(§四)与 AI 助手检索(§五)**共用**这套基建。先建它,后两章才有地基。

### 3.1 现状(核对代码)

- `Post.titleEmbedding Json?` 字段**已存在**(一期 migration 落地),但**全后端零读写**——纯承载。
- 现状语义搜索读**静态文件** `src/data/posts-embedding.json`(27 条 `{postId,title,category,embedding}`),经 `nest-cli.json` assets 拷入 `dist`;`ai.service` 构造时 `loadPosts()` 载入 `this.posts`。**与库内实际帖子靠标题字符串对齐,对不上即搜不到。**
- `cosineSimilarity(v1,v2)`(`ai.service.ts`,grep `cosineSimilarity`)**保留复用**。
- 验活已确认:`text-embedding-ada-002`(经 302.ai)可用,**向量维度 1536**(见 §2.1)。

### 3.2 改为:embedding 写入 `Post.titleEmbedding`(发帖时生成)

- **生成时机**:发帖主流程成功后,对 `title` 生成 embedding,写入该帖 `titleEmbedding`。hook 点 = `posts.service.create`(grep `prisma.post.create`,现返回 `{ id }`)。
- **已定:同步 await + 失败不阻塞发帖(关键,2026-06-25 拍板)**:embedding 在发帖请求内**同步 await**(满足概要验收"发新帖立即可搜";异步会有搜不到的窗口期)。但 embedding 是外部调用、可能慢/失败,**必须包 try/catch**,约定:
  - 发帖核心(建 Post + 关联 tag/file)**先成功**;embedding 生成失败/超时 → `titleEmbedding` 留 `null`、**记日志**、发帖照常返回 `{ id }`(不回滚、不报错给用户)。
  - 搜索/检索时 `titleEmbedding` 为 `null` 的帖子**不参与余弦**(搜不到但不报错);可由回填脚本(§3.4)补齐。
- **跨 service 协作**:`PostsService` 需调用 embedding 能力。两种接法(实现择一,§十一待定):
  - (a) `PostsService` 注入 `AIService`,调其导出的 `embedText(title)`——需 `AIService` 在 `AIModule` 导出、`PostsModule` import `AIModule`。
  - (b) 抽一个轻量 `EmbeddingService`(只封 `OpenAIEmbeddings`)放公共模块,`AIService` 与 `PostsService` 均复用——解耦更干净。
  - **已定:方案 (b) 独立 `EmbeddingService`**(2026-06-25 拍板)——embedding 是基础能力,不该"为一个小能力依赖整个 AI 大 service";且 `AIModule` 已需 import `AuthModule`(§二),若再让 `PostsModule` import `AIModule` 则依赖绕、易成环。`EmbeddingService`(只封 `OpenAIEmbeddings` + `EMBEDDING_MODEL`)轻量解耦,`AIService` 与 `PostsService` 均复用,依赖清晰——多建一个 service 值得。
- **改帖**:**现状无改帖接口**(`posts.controller` 无 PUT/PATCH),故三期 embedding **只发帖时生成**。概要七章"发帖/改帖时生成"中的"改帖"——三期无此功能,**留到将来做改帖时连带**(§十一)。

### 3.3 改为:向量数据源 = 库内(弃静态文件)

- `ai.service` 搜索/检索改为**从库取 `titleEmbedding`**(非 null)算余弦,**不再读 `posts-embedding.json`**。
- 删除对 build 产物路径的脆弱依赖:`loadPosts()`、`this.posts`、`nest-cli.json` 的 `data` assets 配置、`src/data/posts-embedding.json`(及 dist 副本)——**清理归 §七 同批**(它们是旧语义搜索的残留)。
- **数据源形态(关键设计判断,需你确认——§十一)**:概要七章措辞为"服务启动载入内存 + 新帖增量更新"。**澄清**:"内存余弦"的本质是"余弦计算在**应用层内存**做"(相对 pgvector 在 DB 算),**不等于"向量必须常驻内存数组 + 手工增量维护"**。对**几十条**数据:
  - **方案 B(推荐·三期落地)**:搜索/检索时**直接查库** `SELECT id,title,titleEmbedding WHERE titleEmbedding IS NOT NULL`,在内存算余弦取 topK。**无内存/DB 一致性风险、无需 create→AIService 联动维护内存**,性能差异可忽略(几十条 + 一次 embedding 外部调用本就是瓶颈)。仍是"内存余弦"。
  - **方案 A(概要原文·留作优化)**:向量常驻 `AIService` 内存表,启动 load + 发帖增量 push。数据量大时省"每次查库",但引入一致性维护成本。
  - **已定:方案 B**(2026-06-25 拍板,概要 line 140 已留注)。方案 A 的常驻内存表本质是"需维护一致性的缓存"、是 bug 温床(呼应二期首页计数滞后教训);方案 B 对几十条数据同样是"内存余弦"、却无一致性负担。方案 A 作为"数据量大增后的优化"留后续。**以本文件为准**(已采纳)。

### 3.4 存量回填脚本(类比 `rebuild-tags.ts` / `seed-games.ts`)

- 新增 `src/scripts/backfill-embeddings.ts`:遍历 `titleEmbedding IS NULL` 的帖子,对 `title` 生成 embedding 写回。**幂等**(只补 null 的、可重复跑)。运行 `npx ts-node src/scripts/backfill-embeddings.ts`。
- 风格对齐现有脚本:`import 'dotenv/config'` + `PrismaClient`,`main()` + `catch/finally $disconnect`。
- 用途:对二期已存的帖子(无 embedding)一次性补齐,使其可被语义搜索/AI 助手命中(支撑概要验收"发新帖立即可被搜索"之外的存量数据)。

### 3.5 模型可配置常量(承你拍板:接受滚动别名 + 抽常量)

- 现状 `model:'deepseek-chat'`、`model:'text-embedding-ada-002'` **写死在 `ai.service` 构造函数**。
- 改:抽模块级常量、默认值为滚动别名、可由 env 覆盖钉死:
  - `const CHAT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'`
  - `const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'`
- **默认省心**(滚动别名自动跟新,验活已知 `deepseek-chat` 当前路由到 `deepseek-v4-flash`)、**留控制余地**(想钉版本/换模型改 env 或常量一处)。
- **连带风险知悉(非现在处理)**:滚动别名意味着 DeepSeek 升级可能改 SSE/行为;**将来 chat 若再现 SSE 问题,先排查是否 DeepSeek 升级改了格式**(本地代码外的固有风险,记此备查)。
- **embedding 模型选型修订(2026-06-29,§五验收后)**:`EMBEDDING_MODEL` 默认 `text-embedding-ada-002` → **`text-embedding-3-small`**。原因:ada-002 中文区分度不足——同 query 下相关帖与不相关帖余弦仅差 ~0.007(跨游戏帖挤在一起),致 chat 引用"不对版";3-small 拉到 ~0.13、断崖分明,阈值才稳(详见 §5.7)。换模型须对存量**全量重 backfill**(新旧向量空间不可比),`scripts/backfill-embeddings.ts` 加 `--all` 全量重生成模式(默认仍"只补 null"幂等补缺);维度同 1536、schema 不变。

### 3.6 范围边界 / 待定

- **边界**:三期 embedding 仅 `title`(标题向量);**正文 embedding 不做**(§五检索也只用标题向量)。
- **已定**:协作接法 (b)、数据源方案 B、embedding 同步 + 失败不阻塞,均见 §11.1(2026-06-25 拍板)。

### 3.7 实现状态(2026-06-25 已实现 · 已代验收通过)

- **已落地**:`EmbeddingModule`/`EmbeddingService`(显式 import)、`posts.service.create` 末尾同步写 `titleEmbedding`(try/catch 失败留 null 不阻塞、绝不 throw)、`ai.service` 改用 `EmbeddingService` + `CHAT_MODEL` 常量、`scripts/backfill-embeddings.ts`(查全量 JS 过滤避开 Json null 坑)。`ai.service` 的 `embeddings` 字段暂留给 rag(§七删时清)。
- **验收(代跑·真实库)**:① 发帖 → `titleEmbedding` **1536 维**真实向量;② backfill 回填存量 **34 帖、失败 0**、幂等复跑待回填 0;③ 失败路径(错 key)→ 401 被 `catch`、不 throw、发帖照常成功留 null。`tsc --noEmit` 通过。
- **e2e**:`titleEmbedding` 写入偏集成验证;端到端断言("发帖 → 可被语义搜索命中")**与 §四 合并锁定**更自然。

---

## 四、语义搜索改造(`GET /api/ai/search`)

### 4.1 现状(核对代码)

- `ai.service.search(keyword, topK=3)`:keyword embedding → 与**静态文件** 27 条算余弦取 top3 标题 → 用标题 `findMany` 回库查真实帖子 → 映射返回。
- **两个真问题**:① 数据源是静态文件(非库内向量,§三已解决方向);② `publishedAt: new Date().toISOString()`(grep `new Date().toISOString` 于 `ai.service`)——**伪造时间**(§7 已订正文档登记:这是 search 唯一遗留数据 bug,头像两处已判空无 bug)。

### 4.2 改为

- **检索源**:改用 §3.3 库内向量(方案 B:查 `titleEmbedding` 非 null → 内存余弦 → topK)。topK 默认 3(可调常量)。
- **拿到命中 postId 后**:复用现有"回库查列表项字段"逻辑(`include` user/tags/_count/files),但:
  - **`publishedAt` 改读真实时间**:查询 `select` 补 `createdAt`,映射 `publishedAt: post.createdAt.toISOString()`(对齐 `posts.service` findAll/findOne 的二期修法)。
  - 头像/缩略 URL:**沿用现状三元判空写法**(已无 bug,§7);硬编码 `http://localhost:3000/uploads` 保留(归四期)。
  - 返回结构**对齐 `Post` 类型**(`types/index.ts`),与首页/搜索页 `PostItem` 兼容(现状已兼容,保持)。
- **鉴权**:加 `JwtAuthGuard`(§二)。
- **匹配方式升级**:现状"先静态算相似度拿 title,再用 title 回库 `where title in`"是两段式(因向量不在库)。改库内向量后,**直接 topK 拿到 postId**,回库按 `id in` 查——**更准**(不再依赖标题字符串唯一/一致)。

### 4.3 前端(基本不动)

- `pages/Search.tsx` + `store/search.ts` + `api/search.ts` **已对接** `GET /ai/search`,返回 `Post[]`,渲染 `PostItem`——**接口契约不变,前端无需改**(搜索结果结构保持)。
- **已定:搜索需登录(2026-06-25 拍板)**:`search` 加 guard 后匿名会 401;为体验统一(**进页面即要登录态、而非搜了才 401**),**`/search` 路由加 `RequireAuth`**(对齐 `/chat`、`/mine` 守卫写法),与概要"AI 接口鉴权"一致。游客想搜先登录(演示可接受)。

### 4.4 范围边界 / 待定

- **边界**:只改"检索源 + publishedAt + 鉴权";不改搜索页 UI、不做高亮(关键词高亮属四期视觉)。
- **已定**:匿名访问搜索页 → `/search` 加 `RequireAuth` 重定向登录(§4.3,2026-06-25)。

### 4.5 实现状态(2026-06-25 已实现 · 已代验收通过)

- **已落地**:`ai.service.search` 改库内 `titleEmbedding` 余弦(查全量 JS 过滤 null、`SEARCH_TOP_K=3`、`Number.isFinite` 防 NaN、直接 id 回库);`publishedAt` 读 `createdAt`;search+chat 加 `JwtAuthGuard`、`AIModule` import `AuthModule`;`/search` 前端加 `RequireAuth`;清旧静态残留(`posts-embedding.json`×2 + `nest-cli` data assets + `loadPosts`/`this.posts`/`interface Post`/`fs`·`path` + `regenerate-embeddings.ts`)。
- **验收(代跑·真实库+干净池)**:① 搜「玛莲妮亚怎么打 / 新手抽卡给谁 / 究极手载具搭建」精准命中 [45]/[43]/[47](sim 0.87~0.88),非旧静态 27 条;② `publishedAt` 真实 createdAt;③ 匿名 curl→**401** + e2e「未登录 /search→重定向登录」**通过**;④ `tsc` 通过、残留清净、构造不报错;⑤ **e2e 34 passed**(/search 守卫用例已适配、无回归)。
- **遗留(§五)**:chat 加 guard 后前端 `useChat` 不带 token、暂 401 —— §五 修(见 §五 ⚠️ 硬前置)。

---

## 五、游戏 AI 助手(`POST /api/ai/chat`)

> 三期 AI 重头。现状是**通用透传聊天**(无站内检索),且 SSE 协议与前端对不上。改造三件事:**站内检索增强 + SSE 协议对齐 + 前端对话 store 保持**。

> ⚠️ **§五 硬前置·勿漏(2026-06-25 记死)**:§四 已给 `chat` 加 `JwtAuthGuard`,但前端 `useChatBot` 的 `useChat` 走 `fetch`、**不经 axios 拦截器、不带 token**,故 §四 之后 chat 前端**恒 401**。**§五 改造 chat 必须同步修前端带 token**——给 `useChat` 配 `headers: { Authorization: 'Bearer ' + accessToken }`(token 取自 `useUserStore`)。**别只顾检索/SSE 漏掉 token,否则 chat 一直 401。验收 chat 前先确认 token 已带上。**

### 5.1 现状(核对代码)

- 后端 `ai.service.chat(messages, onToken)`:DeepSeek 流式,纯透传,**无检索**;controller 写 `res.write(\`0:${JSON.stringify(token)}\n\`)`,header 设 `text/event-stream`。
- 前端 `hooks/useChatBot.ts` 用 `@ai-sdk/react@1.2.12` 的 `useChat`,api 指向 `http://localhost:3000/api/ai/chat`;`pages/Chat.tsx` 有完整 UI;**对话 state 在 `useChat` 内,切走即丢**(react-activation 已移除)。

### 5.2 改造一:站内检索增强(RAG-lite,只用标题向量)

- **流程**:收到请求 → 取**最新 user 消息** → embedding 向量化 → §3.3 库内向量余弦 topK(默认 3) → 命中帖子(`id/title/brief`)拼入 **system prompt** 作为上下文 → DeepSeek 流式回答。
- **system prompt 形态**(示意,实现可调):
  > 你是游戏社区的攻略助手。下面是站内可能相关的帖子,请优先基于它们回答并在合适处引用;不相关则正常回答。
  > 相关帖子:[1] {title} — {brief} (id:{id}) …
- **检索时机**:每轮 user 消息都检索(每问找当下相关帖子)。
- **复用**:`cosineSimilarity` + §三基建;不引入 `MemoryVectorStore`(那是被删的 rag 用的,§七)。

### 5.3 改造二:SSE 协议对齐(核对版本后的准确结论)

- **前端版本**:`@ai-sdk/react@1.2.12` = **AI SDK 4.x**,`useChat` 默认 **Data Stream Protocol**(非原生 SSE)。
- **现状诊断(纠正"格式全错"的印象)**:后端 `0:${JSON.stringify(token)}\n` 的 **text part 格式本身是对的**(`0:` 即 data stream 的 text part);**缺的是**:
  1. **响应头 `x-vercel-ai-data-stream: v1`**(AI SDK 4.x 据此识别 data stream protocol)——**最可能的"对不上"主因**。
  2. **finish part**`d:${JSON.stringify({finishReason:'stop',usage:{...}})}\n`(流结束标记,规范要求)。
- **对齐方案**:**保留 text part 写法** + 补响应头 + 补 finish part。**不推倒重来**(你拍板"保留成熟的 useChat、改后端对齐",方向正确且改动小)。
- **实现首步先验握手(承验活纪律,不假设字节格式)**:`@ai-sdk/react@1.2.12` 协议细节以**实测为准**——实现时先发一个最小 chat 往返,确认 `useChat` 能正确解析(收到文本、loading 正常结束),**再接检索增强**。把"协议握手"当 chat 改造的第 0 步。

### 5.4 改造三:引用站内帖子(可点卡片/链接)

- 命中帖子要回传前端做**可点引用**(你拍板"可点帖子链接/卡片")。AI SDK 4.x data stream 支持附加结构化数据:
  - **方案(推荐)**:用 data stream 的 **data part / message annotation**(`useChat` 暴露 `data`/message `annotations`)传 `[{id,title}]`,前端渲染为可点卡片(点击 `navigate('/post/'+id)`)。
  - **备选(降级)**:回答文本内嵌 markdown 链接(实现简单,但非结构化卡片)。
- **以实测为准**:annotation/data part 的具体 API 随 `@ai-sdk/react@1.2.12` 落地时确认(同 §5.3 握手一并验)。引用呈现形式列 §十一待定。

### 5.5 改造四:前端对话 store 保持(承"react-activation 已移除")

- **目标**:切走 Chat 再回来,对话不丢(刷新可丢——你拍板"store 内存保持 + 不落库")。
- **方案**:新建 `store/useChatStore.ts`(Zustand,**不 persist**),持 `messages`。`Chat.tsx`:
  - mount 时以 `store.messages` 作 `useChat` 的 `initialMessages` 恢复;
  - `useChat` 的 messages 变化(`onFinish` 或发送后)同步写回 `store`(`setMessages`)。
- **不落库**:后端 `ChatDto` 现有 `id`(会话 id)字段——三期**不实现会话持久化**(后端不存会话历史);`id` 维持现状或前端生成,**不新增会话表**。
- **范围**:单会话保持即可(概要未要求多会话管理)。多会话列表/切换属后续。

### 5.6 范围边界 / 待定

- **边界**:检索只用标题向量;单会话内存保持;引用用 data part 或降级文本;不做会话持久化、不做多会话管理、不做流式"检索中"骨架的视觉精化(四期)。
- **待定**:引用呈现形式(卡片 vs 文本)、SSE/annotation 字节细节(实测定)——§十一。

### 5.7 实现状态(2026-06-29 已实现 · 已人工验收通过)

> §五经多轮实测调整,此处记最终落地状态(SSE / token / 检索 / 引用 / store / import);上文 §5.2–5.6 为设计期思路,以下为事实落地。

- **SSE 协议对齐**(§5.3):后端补 `x-vercel-ai-data-stream: v1` 响应头 + `d:` finish part;`0:` text part 现状已对(保留)。第 0 步握手实测(node fetch 看字节 + playwright 看 `useChat` 解析)确认流式渲染、loading 正常收尾——不假设字节格式。
- **前端带 token**(修 §四 401):`useChatBot` 给 `useChat` 配 `headers:{ Authorization: 'Bearer '+accessToken }`(token 取自 `useUserStore.getState()`,对齐 axios `config.ts`)。冷启动 / 真实登录 / 重开浏览器三场景实测 token 首次即就绪、不 401(zustand persist 同步恢复;token 时序假说经复现**证伪**)。
- **站内检索增强**(§5.2):chat 取最新 user 消息 → `retrieveTopK` → 命中拼 `SystemMessage` 上下文 → DeepSeek 流式;检索失败 `catch` 降级为无检索普通聊天、不阻塞 chat。
- **引用走 annotation chip**(§5.4,**未降级 markdown**):后端 `onCite` 写 `8:` message annotation part(在 text part 前);前端 `Chat.tsx` 读 `message.annotations` 渲染可点 `<Link to=/post/:id>` chip。实测 `8:` 被 `useChat@1.2.12` 解析进 `message.annotations`、`0:` 文本流未被破坏 → 采用结构化 chip(不引 react-markdown 依赖)。
- **引用相似度阈值**(§5.4):`CITATION_MIN_SIM = 0.5`,chat 引用仅保留 `sim≥0.5` 的"真相关"帖(宁缺毋滥)。3-small 下实测:对版 query 精准命中(黑神话→#39、玛莲妮亚→#45、原神→#43),无关 query(虎先锋 / 天气)不引、走通用回答;个别低分专名帖(如塞尔达"究极手" ~0.37)漏引可接受。**search 不加阈值**(搜索结果看排序、容忍度高)。
- **检索共用**:`retrieveTopK(text, topK)` 返 `{id,sim}[]`,被 `search`(`.map(id)`、不过滤)与 chat `retrieveCitations`(按阈值过滤)**共用同一套库内向量余弦**,不重复实现。
- **对话 store 保持**(§5.5):新建 `store/useChatStore.ts`(Zustand **不 persist** → 切走/切回不丢、刷新可丢)。接线落在 **`useChatBot` hook**(而非 §5.5 示例写的 `Chat.tsx`——useChat 所在处更内聚,Chat.tsx 保持纯展示;实现位置微调、行为不变);`initialMessages` 用 `getState()` 快照恢复(读一次不订阅)+ 单向写回 `useEffect`(useChat→store)→ 从根上无循环更新。
- **清 import**(同 §7.5):`ChatPromptTemplate`/`StringOutputParser` 已删。
- **验收(代跑 + 人工)**:① chat 带 token 不 401、流式正常;② 引用对版 + chip 可点跳 `/post/:id`;③ 对话保持(切走回不丢、刷新可丢);④ search 仍准(3-small 排序);⑤ backend/frontend `tsc` EXIT=0;⑥ **e2e 34 passed** + 补 §五 chat e2e(见下)。
- **另记·问题二(刷新前 chat 无反应)**:根因 = 开发期**旧 bundle / HMR 未干净热更**(刷新加载新 bundle 即好),非代码 bug;三场景复现 token 均首次就绪。日后再现刷新即可。

---

## 六、按游戏筛选帖子(游戏化最小线)

> 概要七章"游戏维度作为补充筛选";三期**只做筛选**,专区/详情页延后(§一红线)。

### 6.1 后端(扩展 `GET /api/posts`,复用 tag 筛选模式)

- `PostQueryDto` 增 `gameId?: number`(`@IsOptional @IsInt`,grep `PostQueryDto`)。
- `posts.service.findAll`:现 `tagFilter`(grep `tagFilter`)旁加 `gameFilter = gameId ? { gameId } : {}`,where 合并 `{ ...tagFilter, ...gameFilter }`(AND);`count` 与 `findMany` **同一 where**(对齐现状两处共用 `tagFilter` 的写法)。
- **语义**:tag(内容类型)与 game 可叠加筛选(都传则 AND);均为可选。
- 鉴权不变(`OptionalJwtAuthGuard`,保留 `likedByMe`)。

### 6.2 前端(入口位置 03 阶段择优 → 落地再定)

- 数据:`api/posts.ts` 的列表请求支持透传 `gameId`(现 `fetchPosts(page,limit,tag)` → 加 `gameId` 可选参);`api/games.ts` 的 `fetchGames` 已有(复用)。
- **入口位置(候选,实现时看整体拍定,§十一)**:
  - (1) 首页标签栏下方加一行"游戏筛选"chip(与内容类型 tag 分两行,主筛选仍 tag);
  - (2) 搜索页扩展"按游戏"维度;
  - (3) 轻量"游戏列表"入口 → 选游戏看其帖子。
- **倾向 (1)**(最贴概要"首页补充筛选"、复用首页列表),但**现在不焊死**,03 评审/落地时看 App Shell 整体定。

### 6.3 范围边界 / 待定

- **边界**:只做"按 gameId 过滤帖子列表";**不做**游戏专区页、游戏详情页、游戏封面视觉(延后/四期)。
- **待定**:~~前端入口位置~~ → 已定候选 (1)(见 §6.4 实现状态)。

### 6.4 实现状态(2026-06-29 已实现 · 已人工验收通过)

- **后端**:`PostQueryDto` 加 `gameId?`(`@IsOptional @Type(()=>Number) @IsInt @Min(1)`);`findAll` 加 `gameFilter = gameId ? {gameId} : {}` + `where = {...tagFilter, ...gameFilter}`,`count` 与 `findMany` **共用 `where`**(tag×game AND 叠加、均可选)。`OptionalJwtAuthGuard`/`likedByMe` 不变;`Post.gameId` 有 `@@index`。
- **前端入口(§6.2 候选定 (1))**:Home 内容类型 tag 栏**下方加第二行游戏 chip 横滚**(🎮 次级、主筛选仍 tag);`game-filter-row`/`game-chip` testid。视觉精化留四期。
- **前端筛选(复用二期切换、扩到 game 维度)**:`fetchPosts` 加第 4 参 `gameId`;`useHomeStore` 加 `currentGameId`/`games`/`loadGames`;**`loadMore` 复合化** —— 签名 `string` → patch 对象 `{tag?,gameId?}`,switch 检测与**竞态比对均升级为双维度**(`currentTag` 且 `currentGameId` 都没变才采用响应),`!hasMore` 守卫仅在 load-more 分支(切换绕过,沿用二期修法)。tag 与 game **独立 toggle、AND 叠加**。
- **复用留痕**:二期"切换被 `!hasMore` 误拦 / 响应竞态"两坑不是 tag 特有(是"切换筛选"通病),已扩到 game 维度防回归。
- **验收(代跑 + 人工)**:① 后端 `?gameId=1`→黑神话[41,40,39]、`?gameId=1&tag=资讯`→[41](AND)、`?gameId=999`→空、无 gameId→全部14 不变;② 前端选游戏筛 / AND 叠加 / 独立 toggle / 快速切换竞态(双维度)全绿;③ 二期 tag 切换不回归;④ `e2e/game-filter.spec.ts` 4 用例 + 全套 **41 passed**;⑤ keep-alive/scroll/AI 未触碰、不受影响。

---

## 七、物理删除:`rag` / `git` / `avatar`(与建分开,方向相反)

> 删除清单**列全** + **每项标引用方与核查结论**。删除牵连**已核查**(详见 7.3)。

### 7.1 后端删除清单

| 删除项 | 文件 / 位置(grep) | 引用方核查 |
|---|---|---|
| `GET /ai/avatar` 路由 | `ai.controller.ts`(grep `'avatar'`) | 前端 `getAiAvatar` → 一并删(7.2) |
| `POST /ai/rag` 路由 | `ai.controller.ts`(grep `'rag'`) | 前端 `api/rag.ts` → 一并删 |
| `POST /ai/git` 路由 | `ai.controller.ts`(grep `'git'`) | 前端 `api/git.ts` → 一并删 |
| `avatar()` 方法 | `ai.service.ts`(grep `imagGenerator`) | 仅 controller avatar 调 |
| `rag()` 方法 | `ai.service.ts`(grep `MemoryVectorStore`) | 仅 controller rag 调 |
| `git()` 方法 | `ai.service.ts`(grep `ChatPromptTemplate`) | 仅 controller git 调 |
| `imagGenerator` 字段 + 构造实例化 | `ai.service.ts`(grep `DallEAPIWrapper`) | 仅 avatar 用 |
| 旧静态语义搜索残留 | `loadPosts()` / `this.posts` / `src/data/posts-embedding.json`(+dist) / `nest-cli.json` 的 `data` assets | 改库内向量后无引用(§3.3) |
| **import 清理(核对后删)** | `DallEAPIWrapper`、`MemoryVectorStore`、`Document` | **保留** `OpenAIEmbeddings`(search/chat 用)、`cosineSimilarity` |

> **import 清理核对要点**:`ChatPromptTemplate` / `StringOutputParser` 现 git 用——删 git 时核对 **chat 改造(§5.2)是否改用 `ChatPromptTemplate` 拼检索 prompt**;若用则保留、若用字符串拼接则删。**删前 grep 确认无其他引用再删**(承"先核对再删")。

### 7.2 前端删除清单

| 删除项 | 文件 | 引用方核查 |
|---|---|---|
| RAG 页 | `pages/RAG.tsx` | **路由已移除**(`router/index.tsx` 无 RAG import)→ 孤儿,可删 |
| Git 页 | `pages/Git.tsx` | 同上,孤儿 |
| RAG store | `store/rag.ts` | 仅 `RAG.tsx` 引用 |
| Git store | `store/git.ts` | 仅 `Git.tsx` 引用 |
| RAG api | `api/rag.ts` | 仅 `store/rag.ts` 引用 |
| Git api | `api/git.ts` | 仅 `store/git.ts` 引用 |
| Mine 死入口 ×2 | `pages/Mine.tsx`(grep `navigate('/git')` / `navigate('/rag')`) | 点击跳不可达路由 → 删两个入口 `div`(其余 Mine 不动) |
| aiAvatar action | `store/useUserStore.ts`(grep `aiAvatar`) | **无 UI 调用方**(二期 Mine 已移除 AI 头像按钮)→ 删 action + `UserState` 接口声明 + import `getAiAvatar` |
| getAiAvatar api | `api/user.ts`(grep `getAiAvatar`) | 仅 `useUserStore` 引用 |

### 7.3 删除牵连核查结论(已查)

- **路由**:`router/index.tsx` lazy 列表为 Home/Mine/Login/Chat/PostDetail/Search/Compose——**无 RAG/Git**(二期已移除)。故 RAG/Git 页是**纯孤儿文件**,删除无路由牵连。
- **aiAvatar**:grep 全前端,`aiAvatar`/`getAiAvatar` 仅现于 `useUserStore.ts` + `api/user.ts`,**无组件调用**。删除无 UI 牵连。
- **Mine**:仅删两个死入口 `div`,头像上传/退出登录/我的帖子入口**不动**(守"碰壳不碰内")。
- **后端 dto**:`search.dto.ts`/`chat.dto.ts` **保留**(search/chat 仍在);rag/git 无独立 dto(inline body),无残留。
- **结论:删除清单较干净**,无跨模块隐藏引用;实现时**删前各 grep 一次确认**(防二期后新增引用)。

### 7.4 删除顺序(建议)

1. 先删**前端入口与页**(Mine 死入口 → RAG/Git 页 → store → api → aiAvatar/getAiAvatar),前端不再引用任何待删后端接口。
2. 再删**后端路由 + service 方法 + import + 旧静态残留**。
3. 顺序保证任一步后系统可编译、无悬空引用。

### 7.5 实现状态(2026-06-25 已实现 · 已代验收通过)

- **已删·前端**:`pages/RAG.tsx`/`Git.tsx`、`store/rag.ts`/`git.ts`、`api/rag.ts`/`git.ts`;`Mine.tsx` 两死入口(连带删 unused `navigate`/`useNavigate`,因前端 `noUnusedLocals`);`useUserStore` 的 `aiAvatar` + 接口声明 + import、`api/user` 的 `getAiAvatar`。Mine 其余(头像上传/退出/我的帖子)不碰。
- **已删·后端**:`ai.controller` 的 avatar/rag/git 三路由;`ai.service` 的三方法 + `imagGenerator`/`embeddings` 字段 + 构造实例化 + import(`DallEAPIWrapper`/`OpenAIEmbeddings`/`MemoryVectorStore`/`Document`)。
- **✅ 已清(§五落地时,2026-06-29)**:`ChatPromptTemplate`/`StringOutputParser` import 已删——§五 chat 实测确认用 `SystemMessage` 拼上下文、不用这两者 → 按"确认无用而删"清掉,`tsc` 复核 EXIT=0。(印证当初"留到 §五 确认"的稳健决定。)
- **验收(代跑)**:① `GET /ai/rag·git·avatar` → **404**,`search` 仍在(匿名 401、没误伤);② 后端 `tsc` EXIT=0(构造删实例化不报错);③ 前后端 grep **无残留**;④ **e2e 34 passed**(无回归)。
- **旁见(非 §七)**:前端 `tsc -b` 暴露 pre-existing `scroll-area.tsx` unused `React`(initial commit 即有,平时 vite dev 跳过 tsc 未显);独立技术债,留单独处理。

---

## 八、复用与扩展 + 实现通则

> 承 `00-foundation.md §七` 复用优先 + `02 §九` 实现通则。

### 8.1 复用点

| 需求 | 复用 | 位置 |
|---|---|---|
| 向量相似度 | `cosineSimilarity` | `ai.service.ts`(保留) |
| 写接口鉴权 | `JwtAuthGuard` + `@UseGuards` | `posts.controller` 现有写法 |
| 列表筛选模式 | `findAll` 的 where 合并 | `posts.service`(tag → 加 gameId 同模式) |
| embedding 能力 | `OpenAIEmbeddings` | `ai.service`(抽 §3.2 复用) |
| 一次性脚本 | `dotenv + PrismaClient + main/finally` | `rebuild-tags.ts` / `seed-games.ts` |
| 前端状态保持 | Zustand store(不 persist) | `useHomeStore` 模式 → `useChatStore` |

### 8.2 实现通则(三期各块预防)

1. **外部调用容错**:embedding/chat 调用包 try/catch;embedding 失败不阻塞发帖(§3.2)、搜索/检索失败返回空而非 500(对齐 search 现状 catch 返回 `{code:1,data:[]}`)。
2. **模型常量**:统一用 `CHAT_MODEL`/`EMBEDDING_MODEL`(§3.5),不散落字面量。
3. **鉴权**:`AIModule` import `AuthModule` 后 chat/search 加 guard;`userId` 业务不依赖(纯鉴权)。
4. **硬编码 URL**:`http://localhost:3000/uploads` 保留(四期),新代码沿用、不新增散落。
5. **删前 grep**:§七每项删前 grep 确认无引用。

---

## 九、三期验收对应(概要第七章 → 可核对验收点)

| 概要验收点 | 对应实现 | 核对方式 |
|---|---|---|
| 发新帖后立即可被语义搜索命中 | §3.2 发帖生成 embedding + §4 库内检索 | 发帖 → search 关键词 → 结果含新帖 |
| 问"黑神话有什么攻略",回答引用站内真实帖子 | §5.2 检索增强 + §5.4 引用 | chat 提问 → 回答含可点站内帖子 |
| 匿名调 AI 接口被拒 | §二 chat/search 加 JwtAuthGuard | 匿名 `curl` chat/search → 401 |
| `/rag`、`/git` 入口已移除无残留 | §七 物理删除 + 核查 | grep `rag`/`git`/`aiAvatar` 无残留;Mine 无死入口 |
| (游戏化)按游戏筛选可用 | §六 gameId 筛选 | `GET /posts?gameId=` → 仅该游戏帖子 |

> **三期实现状态总览(2026-06-29)**:§三 基建 / §四 搜索 / §五 chat / §六 筛选 / §七 删除 **均已实现 · 已人工验收通过**(各 §x.y 实现状态)。三期建/删全部落地;待**整体串验**(登录→搜索→chat→按游戏筛选→二期 tag→确认 rag/git/avatar 全无)后收尾、进四期。
> **偏离设计的最终决策均已留痕**:向量数据源方案 B(§3.7/§4.5)、embedding 换 3-small(§3.5/§5.7)、引用阈值 `CITATION_MIN_SIM=0.5`(§5.7)、引用走 annotation chip 未降级(§5.7)、`loadMore` 对象化 + 双维度竞态(§6.4)、对话 store 接线落 `useChatBot` hook(§5.7)。

### 9.1 三期 e2e 覆盖(账目:测什么、不测什么)

> **e2e 时机铁律(承全期纪律)**:每个功能**经你人工验收通过后**才补其 e2e;**写前等你那句"验收通过",不自行判定**。下表是**计划覆盖项**,非现在写。

- **可程序化断言(验收后补)**:匿名调 chat/search 被 401;发帖后 search 命中新帖(接口层);`GET /posts?gameId=` 过滤正确;删除后 `/rag`/`/git` 不可达。
- **✅ 已补·§五 chat(2026-06-29 验收后)**:`e2e/ai-chat.spec.ts` 3 用例 —— ① 登录后 chat 请求带 `Authorization` + 流式回答渲染;② 引用 chip 渲染 + 可点跳 `/post/:id`;③ 对话 store 保持(发→离开→回 chat 消息还在)。mock 后端 data stream(`8:`/`0:`/`d:`)、不依赖真实 AI。**匿名 /chat→/login 守卫**由 `auth-guard.spec` 锁定、**后端 chat 匿名/坏 token → 401** 由代跑实测(非 e2e)。全套 **37 passed**(34+3)。
- **✅ 已补·§六 game-filter(2026-06-29 验收后)**:`e2e/game-filter.spec.ts` 4 用例 —— ① 游戏行渲染 + 选游戏→列表该游戏帖(请求带 `gameId`);② tag×game 叠加(请求带 `tag`+`gameId`、列表交集);③ 游戏切换(高亮+列表都切);④ 独立 toggle(取消 game、tag 仍在,请求只带 `tag`)。mock `/games`+`/posts?`、不依赖真实后端。**坑留痕**:mock 路由用末尾锚定 glob `**/api/games`,避免正则 `/\/api\/games/` 误拦 Vite 源码模块 `src/api/games.ts`(该路径也含 `/api/games`)。
- **不测(人工/后续)**:chat 流式回答质量、**引用对版准确性(语义匹配/阈值效果)**、搜索结果排序合理性、游戏 chip 布局/视觉、快速连切竞态手感(布局/视觉/像素不写断言,承 e2e 纪律)。
- **组织**:按功能模块分文件增量新增(`ai-chat`(已建)/`ai-search`/`game-filter`(已建)/`ai-cleanup`),不破坏已有 e2e。全套现 **41 passed**(二期 34 + §五 chat 3 + §六 game-filter 4)。

---

## 十、与上游文档的一致性维护

- 本文件若被采纳的判断**偏离概要措辞**(§3.3 数据源方案 B vs 概要"载入内存+增量"),**以本文件为准**,并在 `01-分期概要设计.md` 对应处留注(承实现纪律"先改文档")。
- §七 已联动订正 `02-phase2-social.md` 的"两处头像 bug"记述(2026-06-25,已完成)。
- 三期实现中如需调整接口/字段,**先改本文件再改代码**。

---

## 十一、待定项汇总(需你拍板 / 实现中再定,不阻塞动笔)

### 11.1 已拍板决策(2026-06-25,留痕)

> 原"需你拍板"四点已定,固化于此 + 对应正文;实现按此,不再重议。

1. **向量数据源**(§3.3):**方案 B**(搜索时查库 + 内存余弦)。概要 line 140 已留注。
2. **embedding 协作接法**(§3.2):**方案 (b) 独立 `EmbeddingService`**。
3. **embedding 生成**(§3.2):**同步 await + 失败不阻塞发帖**(try/catch、留 null、记日志)。
4. **搜索鉴权**(§4.3):**`search` 需登录 + `/search` 加 `RequireAuth`**。

### 11.2 实现中再定(不阻塞设计)

4. **AI 助手引用呈现**(§5.4):data part 结构化卡片(推荐)/ 回答内 markdown 链接(降级)——以 `@ai-sdk/react@1.2.12` 实测 API 定。
5. **SSE/annotation 字节细节**(§5.3/5.4):实现第 0 步"协议握手"实测确认。
6. **按游戏筛选入口位置**(§6.2):首页筛选行(倾向)/ 搜索页扩展 / 游戏列表入口——落地看整体定。

### 11.3 留给后续(明确不在三期)

- 游戏**专区页** / 游戏**详情页**(概要可选项,延后至三期后续迭代待排期,**非四期**)。
- **改帖**功能及其 embedding 更新(三期无改帖接口)。
- 正文 embedding、多会话管理 / 会话持久化、向量方案 A 优化、pgvector。
- 限流 / 强密钥(含 AI 接口)、去硬编码 URL、关键词高亮、流式视觉精化、演示 seed —— **四期**。

---

> 决议落实对照(便于评审核对):标题向量基建(§三·依赖前置)· 语义搜索改库内向量 + publishedAt 修(§四)· AI 助手检索+SSE对齐+引用+store保持(§五)· 按游戏筛选最小线(§六)· rag/git/avatar 物理删除+牵连核查(§七)· chat/search 加 JwtAuthGuard(§二)· 模型可配置常量+滚动别名(§3.5)。建(三~六)/ 删(七)分章,方向不混。
