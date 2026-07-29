# 生产 embedding 写入安全修复实施计划

> **执行代理要求：** 使用`executing-plans`按E0～E7逐批执行；每个副作用批次在开始前取得独立授权。
> 状态：E0～E7已实施；新候选已部署，生产backfill、B3与API恢复均通过自动门禁，待用户人工验收

**目标：** 以共享deadline和向量校验关闭所有embedding持久化缺口，生成新候选并在零生产写入门禁后恢复D4.7-B。

**架构：** 继续使用现有`OpenAIEmbeddings`、timeout配置和`maxRetries: 0`。无框架安全模块以Node内建`AsyncLocalStorage`把请求级deadline signal传入SDK fetch，以现有`withTimeout()`限制完整Promise，并在返回前执行1536维有限数校验；运行时服务和backfill runner共同依赖该模块。

**技术栈：** NestJS 11、TypeScript、Jest、Prisma 6、LangChain OpenAI 1.2.4、OpenAI SDK 6.17.0、Node 22、Docker/Compose、PostgreSQL 16、Playwright。

## 全局约束

- 旧候选`72350a77acf59ad179b9a89b19544c162033e0ae`继续保留但禁止backfill；当前生产候选已切换为`b6b3d93866e390eb2e37bd52649fa2628403b1b4`。
- 不修改package/lockfile、Prisma schema/migrations、seed manifest、接口/DTO、前端、模型、供应商、endpoint或secret管理。
- 不修改`ai-timeout.ts`和Chat逻辑；保留`AI_EMBEDDING_TIMEOUT_MS`与`maxRetries: 0`。
- 生产禁止`--all`；默认补null、逐帖串行、单帖失败继续、任一失败最终非零。
- 历史E6门禁保持35 Post、35 null、0 non-null且不调用真实AI；E7获独立授权后终态为35 Post、0 null、35 non-null。
- AGENTS、CLAUDE和历史用户改动只做哈希保护，不暂存、不覆盖、不清理。
- 新候选、旧候选、B2、F4/F5现场和失败证据使用不同路径并全部保留。

---

## E0：基线冻结与RED证据

**文件：**

- 新增：`docs/qa/production-embedding-write-safety/e0-baseline.md`
- 更新：`.planning/production-embedding-write-safety/{task_plan,findings,progress}.md`

**执行顺序：**

- [x] 记录HEAD、分支、status、diff stat、暂存区、Node/pnpm/Docker版本及受保护文件SHA。
- [x] 静态扫描所有`titleEmbedding`、`embedQuery`与Prisma update，锁定两条持久化路径和只读消费者。
- [x] 运行现有聚焦测试，记录当前`EmbeddingService`仅有Promise timeout、backfill无共享deadline/校验。
- [x] 用测试fixture证明旧backfill在headers后body卡住时不能按配置deadline结束；证明错误维度结果会到达update mock。
- [x] 复核D4.7-B QA：供应商请求0、one-off 0、生产35 null/0 non-null。

**自动验证：**

```powershell
rg -n "titleEmbedding|embedQuery|withTimeout|maxRetries" backend/backend/posts/src
git diff --cached --name-only
git diff --check
```

**停止点：** RED必须由已知缺口触发；若发现第三条生产写入路径，先修订09设计并重新评审，不进入E1。

## E1：共享deadline与向量校验TDD

**文件：**

- 新增：`backend/backend/posts/src/embedding/embedding-safety.ts`
- 新增：`backend/backend/posts/src/embedding/embedding-safety.spec.ts`

**接口：**

- 产出`EMBEDDING_DIMENSIONS=1536`。
- 产出`createEmbeddingDeadlineFetch(timeoutMs, fetchImpl)`。
- 产出`assertEmbeddingVector(value)`。
- 产出`requestValidatedEmbedding(request, timeoutMs)`。
- 消费现有`withTimeout()`，不修改其Chat调用方。

**TDD步骤：**

- [x] 先写并运行非数组、1535/1537维、null元素、`NaN`、正负`Infinity`失败测试。
- [x] 写合法1536有限数通过测试。
- [x] 写请求Promise一直pending时按deadline失败测试。
- [x] 写fetch已返回headers但body消费pending时deadline signal触发abort测试。
- [x] 写已有caller signal与deadline signal任一abort均生效测试。
- [x] 实现最小模块：用请求级`AbortSignal.timeout()`、`AsyncLocalStorage`和`AbortSignal.any()`组合signal；用`Promise.resolve().then(request)`确保外层deadline先建立；校验成功后返回原数组。
- [x] 运行聚焦Jest与定向lint，结果为0 errors/0 warnings。

**完成条件：** 测试证明deadline覆盖body和完整Promise；任何非法结果均不返回`number[]`。

**建议提交：** 本任务不单独提交，和E2运行时接线组成一个可工作的代码提交。

## E2：运行时与backfill持久化边界

**文件：**

- 修改：`backend/backend/posts/src/embedding/embedding.service.ts`
- 修改：`backend/backend/posts/src/embedding/embedding.service.spec.ts`
- 修改：`backend/backend/posts/src/scripts/backfill-embeddings.ts`
- 新增：`backend/backend/posts/src/scripts/backfill-embeddings.runner.ts`
- 新增：`backend/backend/posts/src/scripts/backfill-embeddings.spec.ts`
- 修改：`backend/backend/posts/src/scripts/seed-demo-posts.ts`（仅运维提示）
- 新增：`backend/backend/posts/src/posts/posts.embedding.spec.ts`
- 新增：`deploy/production/scripts/embedding-backfill-safety.test.mjs`

**接口：**

- `EmbeddingService.embed(text)`继续返回`Promise<number[]>`，但只返回共享校验通过的值。
- `runEmbeddingBackfill({ posts, embed, update, forceAll })`只负责编排，不读取env、不创建Prisma/SDK。
- CLI负责环境校验、SDK配置、生产参数门禁、Prisma生命周期和最终退出码。

**TDD步骤：**

- [x] `EmbeddingService`测试先锁定custom fetch、两层timeout与两个`maxRetries: 0`仍存在。
- [x] 增加合法结果返回及非法结果拒绝测试。
- [x] backfill runner测试先锁定默认只选null、严格串行、合法后才update、单帖失败继续、部分成功保留、最终失败统计。
- [x] CLI测试锁定`NODE_ENV=production + --all`在查库/请求前拒绝；development/test显式`--all`仍可用。
- [x] 将demo seed成功提示从全量重算改为默认补null命令，并以测试或静态断言证明fixture、manifest、事务与补偿代码未变化。
- [x] 新帖测试锁定embedding超时/非法时embedding update为0、帖子创建仍返回ID。
- [x] 最小修改`EmbeddingService`与CLI接入共享模块；不改PostsService运行代码。
- [x] 容器测试使用唯一Docker前缀和Node内建mock服务，覆盖：headers后body卡住、错误维度、非number元素、合法1536、部分成功五场景。
- [x] 每个容器场景核对请求次数、update次数、失败统计和容器残留；矩阵5/5通过，临时容器与镜像已精确清理。

**验证：**

```powershell
pnpm exec jest embedding-safety.spec.ts embedding.service.spec.ts backfill-embeddings.spec.ts posts.embedding.spec.ts --runInBand
node --test deploy/production/scripts/embedding-backfill-safety.test.mjs
pnpm exec eslint src/embedding/embedding-safety.ts src/embedding/embedding-safety.spec.ts src/embedding/embedding.service.ts src/embedding/embedding.service.spec.ts src/scripts/backfill-embeddings.ts src/scripts/backfill-embeddings.runner.ts src/scripts/backfill-embeddings.spec.ts src/posts/posts.embedding.spec.ts
```

**停止点：** 任一非法向量触发update、单场景请求多于一次、timeout后body仍未abort或生产`--all`未在请求前拒绝，均停止且不叠加替代客户端。

## E3：完整回归、审查与新SHA

**文件：**

- 新增：`docs/qa/production-embedding-write-safety/e3-regression.md`
- 更新：09设计、实施计划与planning状态

**执行顺序：**

- [ ] 在linux/amd64隔离build-stage中Prisma generate并运行后端全量Jest；既有18 suites/82 tests与本批新增测试全部通过，记录新的精确总数。
- [ ] 后端build、触及文件lint 0/0；全量lint不高于实施前冻结基线。
- [ ] 前端16 files/53 unit、build、9 files/51 Playwright全部通过。
- [ ] 运行AI preflight 8项mock、Backup 8 fixtures、Compose policy、build-image、LF、SIGTERM和静态安全扫描。
- [ ] 复核package/lockfile、schema/migrations、前端源码、e2e、AGENTS、CLAUDE哈希无变化。
- [ ] 使用显式pathspec分别暂存运行代码/测试与部署容器测试，报告cached diff、check和敏感扫描。
- [ ] 用户逐项授权后创建建议提交；最后一个提交SHA才命名为新候选。

**建议提交：**

1. `fix(embedding): validate provider results before persistence`
2. `test(deploy): verify embedding backfill safety`

**回滚：** 未获commit授权前只撤销本批文件且必须先核对用户改动；不得reset、stash或清理历史工作树。

## E4：新候选linux/amd64制品链

**文件：**

- 新增：`docs/qa/production-embedding-write-safety/e4-artifacts.md`
- 仓库外：新detached worktree、镜像、archive、manifest、bundle、`SHA256SUMS`与审计目录

**前置：** 新候选SHA已提交且用户授权本地构建；Docker、资源、端口门禁通过。

**执行顺序：**

- [ ] 从精确SHA创建仓库外detached clean worktree，不复制当前工作树。
- [ ] 复跑E3门禁并构建一次linux/amd64正式镜像。
- [ ] 核对OCI revision、10001:10001、`/app`、入口、healthcheck、Prisma/OpenSSL/bcrypt/Sharp、3 migrations、4初始化脚本、10 fixtures和新安全模块/runner。
- [ ] 对正式镜像运行E2容器安全矩阵与两轮SIGTERM；不得调用外网。
- [ ] 直接从Git object生成deployment bundle；生成archive、build manifest和LF `SHA256SUMS`。
- [ ] 核对blob/worktree/image/bundle身份、0 symlink、LF、secret/IP/endpoint扫描。
- [ ] 精确关闭容器、网络和端口，保留镜像与制品，不prune。

**失败边界：** 正式镜像只构建一次；失败保留现场，不重新构建、重tag或覆盖旧候选。

## E5：隔离Compose、故障矩阵与直接恢复

**文件：**

- 新增：`docs/qa/production-embedding-write-safety/e5-isolated-restore.md`
- 仓库外：全新source/restore数据库、uploads、backup、mock provider与证据目录

**执行顺序：**

- [ ] source唯一执行migration、seed-games、rebuild-tags、seed-demo；不调用AI。
- [ ] 为timeout、错误维度、非number和部分失败各创建独立数据库副本；mock provider无公网网络。
- [ ] 证明每项失败时非法帖子不写库、请求不重试、最终非零。
- [ ] 在独立成功副本上以mock完成35/35；每条1536有限数。
- [ ] 创建database/uploads配对备份并验证manifest、内部SHA、dump和tar。
- [ ] restore不预跑migration/seed，直接恢复；比较全部业务计数、35向量、20媒体SHA和sentinel。
- [ ] source/restore API均执行SIGTERM；随后down但不使用`-v`，端口释放，现场保留。

**完成条件：** 真实AI调用0；故障和成功矩阵、配对备份、直接restore全部人工验收通过。

## E6：ECS新release与零写入门禁

**文件：**

- 新增：`docs/qa/production-embedding-write-safety/e6-ecs-readonly.md`
- 更新：07设计、07实施计划、D4施工方案与production planning

**授权拆分：**

1. ECS新路径上传/镜像导入E授权。
2. release引用切换E授权；不得启动backfill。
3. 无费用生产只读门禁不授权AI或DB写入。

**执行顺序：**

- [x] 新SHA专属staging/release/compose路径必须不存在；旧候选/B2/历史证据保持可读。
- [x] 上传固定制品，Linux原始SHA清单校验，原子提升并只导入一次新镜像。
- [x] 不执行migration/seed；以镜像内容哈希和生产只读SQL确认3 migrations及DB-4矩阵兼容。
- [x] API保持停止；确认运行中仅原db，35 Post全部null、non-null 0、20媒体与B2不漂移。
- [x] 静态核对新backfill无参数命令、生产`--all`拒绝、database+embedding env及db+egress网络最小权限。
- [x] 只运行无费用测试fixture或静态检查，不访问供应商业务接口。
- [x] 保持用户要求的sudo缓存，不输出密码；SSH/SFTP会话按批次关闭。

**回滚：** 新镜像/脚本不兼容时保留新现场，经独立授权恢复release引用；数据库因零写入不restore。

## E7：生产联合AI+DB授权与B3后续门禁

**文件：**

- 实施时新增：`docs/qa/production-embedding-write-safety/e7-production-backfill.md`
- 35/35人工验收后另行新增B3 QA

**授权：** E6人工通过后，用户明确批准“最多35次302.AI embedding调用 + 合法向量数据库写入”。该授权不包含B3或API启动。

**执行顺序：**

- [x] 执行前锁定35 null、0 non-null、API停止、仅db healthy、B2完整、无one-off。
- [x] 记录Docker event游标后只调用一次无参数`embedding-backfill`。
- [x] one-off create/start后禁止自动再次执行。
- [x] 核对请求数不超过35、exit、事件链、无重试、无OOM/restart。
- [x] 成功达到35/35数组、1536维、全部有限；DB-4计数、20媒体和B2不变。
- [x] 用户独立授权B3；远端与仓库外本地异机副本均完成校验。
- [x] B3通过后启动新API，loopback、health、liveness和真实Prisma分页通过。

**禁止：** `--all`、自动重跑、清库、补写、restore、migration、seed、Search/Chat、cleanup、API启动或D5。

## 最终门禁

- [x] 09设计与计划均人工确认。
- [x] E0～E3产生经审查的新候选SHA，受保护文件无漂移。
- [x] E4新镜像/制品链和E5隔离恢复通过。
- [x] E6生产零写入门禁确认35 null、0 non-null。
- [x] E7仅在独立联合授权后执行；B3在35/35独立审计及用户授权后创建。
- [x] 全过程未覆盖旧候选、B2、历史失败证据或用户工作树。
