# 生产 embedding 写入安全修复调研结论

## 真实根因

1. `backfill-embeddings.ts`仅依赖 OpenAI SDK 内建 timeout。OpenAI SDK 6.17.0 的 `fetchWithTimeout()` 在 `fetch()`返回响应头后清除计时器，而响应体解析发生在其后，因此不能证明配置的20秒覆盖完整body读取与JSON解析。
2. backfill把`embedQuery()`结果直接交给Prisma update，没有在写库前验证数组类型、1536维和有限数。
3. `EmbeddingService`已有外层`withTimeout()`，能够限制调用方等待整个Promise，但它也没有统一向量校验；发帖路径会把其返回值写入`Post.titleEmbedding`。

## 写入面

- `PostsService.create()`：通过`EmbeddingService.embed()`生成并写入新帖；失败被捕获，帖子成功且embedding保持null。
- `backfill-embeddings.ts`：直接构造`OpenAIEmbeddings`并逐帖写入；默认补null，单帖失败继续，最终非零。
- Search与Chat调用`EmbeddingService`生成查询向量但不持久化；`audit-phase4-state.ts`只读；demo seed明确写入null。
- 全仓静态审计未发现第三条`titleEmbedding`生产写入路径。
- `seed-demo-posts.ts`仍打印`embedding:backfill -- --all`，属于危险的过期运维提示；09实施只修提示，不改seed数据与事务。

## 选定边界

- 新增无Nest/Prisma依赖的共享embedding安全契约：deadline fetch、完整Promise deadline、1536维有限数校验。
- 保留`OpenAIEmbeddings`、当前timeout配置和`maxRetries: 0`；不改Chat的timeout实现。
- `EmbeddingService`和backfill共同使用安全契约；数据库调用方保持原有容错语义。
- 生产CLI显式拒绝`--all`，非生产维护语义保留。

## E1～E2实测订正

- 两个互不关联但使用相同毫秒值的计时器存在竞态：外层Promise timeout可能先返回，而fetch body尚未观察到abort。实现改为用Node内建`AsyncLocalStorage`把请求级deadline signal传入同一SDK fetch，仍保留现有`withTimeout()`作为调用方等待上限。
- OpenAI SDK的mock响应格式必须与请求的encoding format一致；无外网容器fixture显式使用`float`格式，避免把JSON number数组误走base64解码路径。该调整不改变生产SDK配置。
- CLI在`PrismaClient`、`OpenAIEmbeddings`和`findMany`之前解析并拒绝production `--all`；生产Compose通过必需的`database.env`提供`NODE_ENV=production`，命令本身无参数。

## 生产基线

- DB-4与AI-1均已人工验收；API停止、原db healthy。
- 5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、20媒体。
- 35条embedding全部为null，非null为0；B2远端和本地副本有效。
- D4.7-B只读预检未创建one-off、未调用供应商、未写数据库。

## 2026-07-27 生产恢复终态

- 共享deadline与写前向量校验已由新候选`b6b3d93866e390eb2e37bd52649fa2628403b1b4`部署，旧候选继续保留但不再用于当前发布。
- 新候选零写入门禁确认3 migrations、35 Post、35 null、0 non-null、20媒体与B2不变；新镜像只读`prisma migrate status`通过。
- 用户独立授权后，无参数backfill唯一执行一次并exit 0；写后35/35均为1536维有限数，其他业务计数和uploads不变，无one-off残留。
- 用户独立授权B3；远端与仓库外本地副本完成外部/内部SHA、`pg_restore --list`、`tar -tzf`与manifest验证。
- 新API与原db healthy，API仅绑定loopback；Nest liveness和真实Prisma分页通过。Nginx、80/443、DNS和Vercel尚未实施。
