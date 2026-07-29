# 生产 embedding 写入安全修复设计

> 状态：E0～E7已实施；新候选已部署，生产backfill、B3与API恢复均通过自动门禁，待用户人工验收
> 批次定位：07生产部署D4.7-B之前的独立安全修复批次，不代表第五期或新产品功能
> 日期：2026-07-23

## 一、文档定位与事实优先级

本文只修复标题embedding请求截止时间和持久化前向量校验。发生冲突时依次以本文、`docs/design/07-production-deployment.md`、`docs/design/08-production-release-fix.md`、当前代码与已验收QA为准；07中与本文无关的部署架构、供应商、初始化顺序和授权门禁继续成立。

事实依据：

- `docs/qa/production-deployment/d4-db5-embedding-backfill-plan.md`：D4.7-B阻塞与生产只读基线。
- `backend/backend/posts/src/scripts/backfill-embeddings.ts`：默认补null、逐帖串行和最终非零语义。
- `backend/backend/posts/src/ai/ai-timeout.ts`：现有完整Promise等待上限。
- `backend/backend/posts/src/embedding/embedding.service.ts`：运行时embedding统一入口。
- `backend/backend/posts/src/posts/posts.service.ts`：新帖embedding持久化入口。
- 本地`@langchain/openai` 1.2.4与OpenAI SDK 6.17.0实现：SDK fetch timeout在响应头返回后清除，body解析发生在其后。
- DB-4、B2、AI-1、F4/F5已验收报告：生产数据、恢复点与发布链现状。

## 二、背景、根因与影响面

当前D4.7-B不能使用候选`72350a77acf59ad179b9a89b19544c162033e0ae`执行backfill：

1. backfill只设置SDK timeout；供应商返回响应头后若body卡住，配置的20秒不能覆盖完整读取和JSON解析。
2. backfill把SDK结果直接写入`Post.titleEmbedding`，没有在Prisma update前验证数组、1536维和全部有限数。
3. `EmbeddingService`虽以`withTimeout()`包住完整`embedQuery()` Promise，但没有共享的向量校验；新帖路径会持久化其返回值。
4. `seed-demo-posts.ts`成功提示仍建议`embedding:backfill -- --all`；这不改变已完成seed数据，但与生产禁止全量重算的口径冲突。

真实embedding持久化面只有两条：

| 路径 | 生成入口 | 写入点 | 现有失败语义 |
| --- | --- | --- | --- |
| 新帖 | `EmbeddingService.embed()` | `PostsService.create()`中的`prisma.post.update` | 捕获失败，帖子保留，embedding为null |
| 补缺 | `backfill-embeddings.ts`直接使用SDK | 每帖`prisma.post.update` | 单帖失败继续；失败项保留null；批次最终非零 |

Search与Chat只生成查询向量并读取帖子embedding，不持久化；demo seed保持embedding为null；审计脚本只读。本文不改变这些业务语义。

## 三、目标与非目标

### 3.1 目标

- deadline从请求开始持续覆盖响应头、完整body读取、JSON解析、SDK Promise完成。
- 保留`AI_EMBEDDING_TIMEOUT_MS`及SDK/LangChain `maxRetries: 0`，不新增任何重试。
- 所有可持久化结果在数据库update前通过同一无框架依赖校验：数组、精确1536维、每项为有限number。
- 当前默认补null、逐帖串行、部分成功保留、任一失败最终非零的backfill语义不变。
- 生产命令拒绝`--all`；开发/隔离维护场景仍保留原有全量模式。
- 形成新commit、新`RELEASE_SHA`、linux/amd64镜像、隔离恢复与ECS全新release路径。

### 3.2 非目标

- 不改模型、供应商、base URL、密钥管理、1536维契约或检索阈值。
- 不改Chat流式deadline、Search/Chat降级、接口、DTO、前端或产品行为。
- 不改Prisma schema/migration，不增加数据库约束或新表。
- 不重跑生产migration、`seed-games`、`rebuild-tags`或`seed-demo`。
- 不在ECS修改脚本、转换制品、覆盖旧release或清理B2/失败证据。
- 本文不授权真实AI、生产数据库写入、B3、Nginx、DNS或Vercel。

## 四、方案选择

### 4.1 选定方案：请求级共享deadline + 单一向量契约

新增无Nest、Prisma和业务模块依赖的`embedding-safety.ts`：

1. `requestValidatedEmbedding()`先建立请求级deadline signal，并通过Node内建`AsyncLocalStorage`把该signal传给同一异步请求中的SDK自定义fetch。
2. `createEmbeddingDeadlineFetch()`组合请求级deadline、SDK caller signal和无请求上下文时的独立fallback deadline；signal在fetch返回响应头后仍有效，继续约束Response body流。
3. `requestValidatedEmbedding()`同时以现有`withTimeout()`包住完整`embedQuery()` Promise，防止SDK或兼容服务异常时调用方无限等待；请求级signal先建立，deadline发生时底层body会被abort。
4. `assertEmbeddingVector()`在Promise完成后验证数组、1536维和全部有限number；只有验证通过才返回`number[]`。
5. `EmbeddingService`与backfill使用同一契约，继续保留SDK两层`timeout`和`maxRetries: 0`配置。

请求级signal负责中止底层响应体消费，Promise deadline负责限制调用方等待；两者使用同一个已校验超时值，不形成重试或第二次请求。E2容器RED证明两个互不关联的同长计时器存在竞态，因此实现不得退回“fetch自行计时、外层另行计时但无请求上下文关联”的形式。

### 4.2 淘汰方案

- **只修backfill**：会保留新帖写入非法向量的风险，淘汰。
- **仅在Prisma update前各写一份校验**：形成两套可漂移契约，也未补齐body deadline，淘汰。
- **直接改用手写供应商HTTP客户端**：能实现deadline，但会无必要替换已验证SDK解析与兼容行为，扩大风险，淘汰。
- **数据库JSON约束或migration**：违反本批schema冻结，且不能处理请求无限等待，淘汰。
- **ECS现场热修**：破坏Git源、镜像与release同SHA追溯，禁止。

## 五、共享安全契约

### 5.1 类型与接口

目标接口固定为：

```ts
const EMBEDDING_DIMENSIONS = 1536;

type EmbeddingRequest = () => Promise<unknown>;

function createEmbeddingDeadlineFetch(
  timeoutMs: number,
  fetchImpl?: typeof globalThis.fetch,
): typeof globalThis.fetch;

function assertEmbeddingVector(value: unknown): asserts value is number[];

async function requestValidatedEmbedding(
  request: EmbeddingRequest,
  timeoutMs: number,
): Promise<number[]>;
```

`requestValidatedEmbedding()`先建立请求级signal和Promise deadline，再启动request；任何timeout、abort、非数组、错误维度、`NaN`、`Infinity`或非number元素均抛错，不返回部分向量。由本请求deadline触发的SDK `AbortError`统一映射为既有`AIRequestTimeoutError`，caller主动abort及其他错误不被伪装成timeout。

### 5.2 写入顺序

所有写入必须满足：

```text
供应商单次请求
  → 完整body与解析在deadline内完成
  → 共享向量校验通过
  → 调用方取得number[1536]
  → Prisma update
```

校验失败发生在任何数据库update之前。共享函数不接触Prisma，数据库失败语义仍由调用方负责。

### 5.3 运行时语义

`EmbeddingService.embed()`只返回已验证向量。新帖调用方保持原有catch：超时或非法向量不阻塞发帖，`titleEmbedding`保持null。Search/Chat遇同类错误继续沿用当前错误/降级路径，不改阈值或响应结构。

### 5.4 backfill语义

- 默认仅处理`titleEmbedding == null`，按帖子顺序串行。
- 每帖最多一次供应商请求；SDK、LangChain和脚本均无自动重试。
- 合法向量才写当前帖子；失败帖保持null并继续下一帖。
- 任一失败使最终退出码非零；成功项保留。
- `NODE_ENV=production`遇`--all`立即在读取帖子和调用供应商前失败；非生产`--all`保留现有维护能力。
- 日志不输出向量、key、endpoint或响应正文。

## 六、真实文件职责矩阵

| 文件 | 动作 | 唯一职责 |
| --- | --- | --- |
| `backend/backend/posts/src/embedding/embedding-safety.ts` | 新增 | framework-free deadline fetch、完整Promise deadline和向量校验 |
| `backend/backend/posts/src/embedding/embedding-safety.spec.ts` | 新增 | 共享契约RED/GREEN |
| `backend/backend/posts/src/embedding/embedding.service.ts` | 修改 | SDK配置接入deadline fetch并只返回已验证向量 |
| `backend/backend/posts/src/embedding/embedding.service.spec.ts` | 修改 | 锁定maxRetries、timeout、合法/非法结果和完整Promise超时 |
| `backend/backend/posts/src/scripts/backfill-embeddings.ts` | 修改 | CLI装配、生产`--all`拒绝、调用共享runner |
| `backend/backend/posts/src/scripts/backfill-embeddings.runner.ts` | 新增 | 可注入的逐帖补缺编排和最终统计，不读取env、不创建SDK |
| `backend/backend/posts/src/scripts/backfill-embeddings.spec.ts` | 新增 | 补null、串行、失败继续、写前校验、最终非零与生产参数门禁 |
| `backend/backend/posts/src/scripts/seed-demo-posts.ts` | 修改 | 仅把成功后的运维提示改为默认补null命令，不改seed数据与事务 |
| `backend/backend/posts/src/posts/posts.embedding.spec.ts` | 新增 | 锁定新帖非法向量/超时不写embedding且发帖仍成功 |
| `deploy/production/scripts/embedding-backfill-safety.test.mjs` | 新增 | linux容器中真实headers后body卡住、非法向量和合法向量故障注入 |
| `docs/design/09-production-embedding-write-safety.md` | 新增 | 本批权威设计 |
| `docs/plans/09-production-embedding-write-safety-implementation-plan.md` | 新增 | E0～E7执行与门禁 |
| `docs/qa/production-embedding-write-safety/` | 实施时新增 | RED/GREEN、回归、制品、隔离恢复、ECS与生产执行证据 |

`ai-timeout.ts`保持不变；`PostsService`运行代码保持不变，仅增加聚焦测试证明其既有catch边界。Dockerfile、Compose、package/lockfile、schema/migrations、seed和前端均不修改。

## 七、TDD与验证矩阵

### 7.1 单元RED

- headers已返回但body Promise不完成：在配置deadline到达时拒绝。
- 合法1536有限number数组通过。
- 非数组、1535/1537维、null元素、`NaN`、正负`Infinity`均拒绝。
- 校验失败时Prisma update调用数为0。
- backfill默认只选null、严格串行、单帖失败继续、最终非零。
- 生产`--all`在数据库读取与供应商调用前拒绝；非生产仍可显式全量。
- demo seed完成提示不再引导生产使用`--all`；fixture、manifest、事务和补偿逻辑零变化。
- 新帖embedding失败时帖子创建结果不变且embedding update为0。

### 7.2 容器级RED/GREEN

使用Node内建HTTP mock和隔离PostgreSQL，不访问外网：

1. mock先发200响应头再卡住body；旧候选超出deadline，修复候选在deadline内非零退出且该帖仍null，请求计数1。
2. mock返回错误维度；命令非零、update为0、请求计数1。
3. mock返回包含非number元素的1536项；命令非零、update为0。
4. mock返回合法1536项；命令exit 0并只写目标null帖。
5. 部分成功后失败；成功向量保留、失败帖null、最终非零。

所有场景核对无第二次请求、无`--all`、无外网、无容器残留。

### 7.3 完整回归

- 后端权威Linux/amd64 Jest保持既有18 suites/82 tests全部通过，并增加本批命名测试；新精确总数在E3提交门禁冻结。
- 后端build和触及文件lint为0 errors/0 warnings；全量lint不增加历史债。
- 前端16 files/53 unit、build、9 files/51 Playwright保持通过。
- Backup 8 fixtures、AI preflight 8项、Compose policy、build-image、LF、SIGTERM两轮和secret扫描保持通过。
- package/lockfile、schema/migrations、现有e2e、AGENTS、CLAUDE与用户文件哈希不变。

## 八、新候选与隔离验证

### 8.1 新SHA

代码经staged diff人工审查后分窄提交；最后一个获批提交的完整SHA才成为新候选。当前FIX SHA随生产数据继续保留，但禁止backfill且不再具备D4.7-B发布资格。

### 8.2 制品链

从新SHA的仓库外detached clean worktree：

- 安装lockfile既定依赖并Prisma generate。
- 构建一次linux/amd64正式镜像，OCI revision等于新SHA。
- 验证非root、入口、healthcheck、3 migrations、4初始化脚本、10 fixtures及新安全文件。
- 运行两轮SIGTERM、容器embedding安全测试和完整回归。
- 从Git object生成deployment bundle、archive、build manifest与LF `SHA256SUMS`；扫描secret、真实endpoint/IP、CRLF和symlink。

不得复用或重tag旧镜像，不覆盖F4/F5与当前候选制品。

### 8.3 隔离数据兼容与直接恢复

全新source/restore项目、端口、数据库、uploads和备份目录串行执行：

1. source按既定非AI四步初始化到DB-4同构数据。
2. 使用本地无外网mock对新backfill执行合法、timeout、非法和部分失败场景；每个写场景使用独立数据库副本，避免重跑同一写步骤。
3. 成功场景达到35/35有效向量后创建配对备份。
4. restore不预跑migration/seed，直接恢复database/uploads。
5. 对比3 migrations、全部业务计数、35个1536有限向量、20媒体逐文件SHA、manifest和sentinel。

完成后关闭项目但不使用`-v`，保留数据、备份和失败证据供人工验收；不调用真实AI。

## 九、ECS替换、生产零写入与回滚

### 9.1 上传与安装

新候选获本地人工验收后，使用全新SHA专属staging/release/compose路径上传、校验、原子提升和`docker load`。旧候选镜像、release、B2与失败证据不覆盖、不清理。

生产不执行migration或任何seed。新镜像只做schema/migration内容哈希兼容核对与生产SQL只读计数；不再次运行`migrate deploy`。

### 9.2 无费用只读门禁

正式backfill授权前必须确认：

- 新SHA、镜像、脚本和共享安全文件身份正确。
- API停止，运行中仅原db healthy；无tool/one-off。
- 3 migrations、DB-4数据和20媒体不漂移。
- `Post=35`、null embedding=35、non-null=0、错误维度历史数据=0。
- B2远端与本地副本完整；新旧release及历史证据均保留。
- embedding service只取得database/embedding env与db/egress网络；无runtime、seed、uploads。
- 命令为无参数补null模式，生产`--all`静态和运行时均拒绝。
- 不发供应商请求、不写数据库。

### 9.3 联合授权与失败边界

无费用门禁人工验收后，才请求一次联合授权：最多35次302.AI embedding调用 + 对合法结果的生产数据库写入。该授权不包含B3、API启动或其他D4动作。

正式执行出现one-off create/start后不得自动重跑。部分失败允许已验证向量保留，失败帖保持null，命令最终非零；不得自动restore B2、清库、补写或使用`--all`。新的补缺执行必须按剩余null数重新申请AI+DB授权。

35/35完成只读核验并人工通过后，B3仍是独立备份授权。B2是pre-demo恢复点，恢复会撤销DB-4数据，只能在独立恢复决策下使用。

### 9.4 发布回滚

- backfill前的新镜像不兼容：停止并保留证据，release引用可在独立授权下回到当前候选；数据库未写，无需restore。
- backfill部分失败：保留合法成功项和null失败项，不自动回滚数据库。
- 发现非法非null向量：停止全部D4后续，不删除或覆盖；先形成独立数据修复设计。

## 十、实施批次

| 批次 | 内容 | 独立完成条件 |
| --- | --- | --- |
| E0 | 基线、写入面与受保护哈希 | 当前候选阻塞和35/0基线可复核 |
| E1 | 共享deadline与向量校验TDD | 单元RED/GREEN，运行代码尚不写数据库 |
| E2 | EmbeddingService、backfill与持久化边界 | 两条写入路径只接收已验证向量 |
| E3 | 完整回归、staged diff与提交 | 用户逐项授权commit，产生新候选SHA |
| E4 | linux/amd64镜像与制品链 | 新SHA唯一镜像、容器安全测试、可追溯制品通过 |
| E5 | 隔离Compose、配对备份与直接恢复 | mock故障矩阵和成功恢复链人工通过 |
| E6 | ECS新release与无费用只读门禁 | 生产35 null、0 non-null且无写入/调用 |
| E7 | 联合AI+DB执行及后续B3门禁 | 另行授权；35/35人工通过后才能申请B3 |

## 十一、风险与控制

- **双计时器竞态**：两层使用同一值，均只拒绝/abort同一请求，不触发第二次调用；测试锁定请求次数。
- **timeout后迟到结果写库**：数据库update位于`await requestValidatedEmbedding()`之后；超时Promise不返回向量，迟到结果不可进入写入路径。
- **共享契约影响Search/Chat**：只把无效供应商结果转为现有错误路径，不改检索阈值、降级或输出；回归覆盖。
- **生产数据与新镜像不一致**：新候选只读部署，不重跑初始化；35 null/0 non-null是联合授权硬门禁。
- **部分成功成本与状态**：保持既有补缺语义，记录成功/失败ID摘要但不记录标题或向量；再次运行按剩余null单独授权。

## 十二、最终验收清单

- [x] 历史候选未执行backfill；E6零写入门禁保持35 null、0 non-null。
- [x] 所有embedding持久化入口使用同一共享安全契约。
- [x] deadline覆盖响应头、完整body、解析和Promise完成，SDK自动重试仍为0。
- [x] 数组、1536维、finite校验发生在任何数据库update前。
- [x] 新帖失败留null且不影响发帖；backfill默认补null、串行、失败继续、最终非零。
- [x] 生产`--all`在供应商调用和数据库读取前被拒绝。
- [x] 单元、容器故障注入、两端完整回归与差分lint完成既定门禁。
- [x] 新SHA、linux/amd64镜像、bundle、archive、manifest和LF清单同源可追溯。
- [x] 隔离成功/失败/直接restore矩阵通过且真实AI调用为0。
- [x] ECS使用全新release路径，旧候选、B2和历史证据未覆盖或清理。
- [x] 新候选无费用只读门禁确认生产35 null、0 non-null。
- [x] 最多35次外部调用与数据库写入取得独立联合授权后唯一执行。
- [x] 35/35只读审计后用户独立授权B3；生产终态为0 null、35 non-null。

## 十三、明确结论

本批未新增产品决策、数据库语义或供应商选择。E0～E7、B3与API恢复均已实施并通过自动门禁，当前仅等待用户对09/D4终态作人工验收确认。
