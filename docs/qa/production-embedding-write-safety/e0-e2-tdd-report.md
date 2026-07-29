# 生产 embedding 写入安全修复 E0～E2 报告

> 状态：已实施，待用户人工验收
> 日期：2026-07-23
> 范围：本地基线、TDD、聚焦验证和无外网容器故障注入；未进入E3

## 1. 基线与保护

- HEAD：`72350a77acf59ad179b9a89b19544c162033e0ae`；该旧候选仍禁止执行生产backfill。
- E0确认生产基线为35条null embedding、0条non-null；本批未连接ECS、未创建one-off、未调用供应商、未写生产数据库。
- 暂存区为空；AGENTS、CLAUDE、package、lockfile和Prisma schema的SHA-256均与E0记录一致。
- 仅发现两条生产持久化路径：`PostsService.create()`经`EmbeddingService`写新帖向量，以及backfill CLI逐帖update；Search、Chat和审计脚本均不持久化。

## 2. RED证据

1. 初始聚焦测试失败：共享安全模块和backfill runner不存在；`EmbeddingService`没有custom fetch；非法三维向量未被拒绝。
2. 首次Linux容器矩阵为4/5：合法向量fixture未update。后续诊断同时暴露两个同长但无关联计时器的竞态，body abort不能由外层timeout稳定证明。
3. 第二阶段容器RED确认：请求级deadline修复前，外层timeout可能早于底层abort；修复后body stall稳定abort。
4. 合法向量fixture返回长度384，根因是mock JSON数组与SDK默认base64解码路径不匹配；fixture显式使用`encodingFormat: 'float'`后恢复1536，不改变生产客户端。

## 3. 实现结果

- `embedding-safety.ts`提供唯一1536维有限数校验、请求级deadline上下文、自定义fetch和完整Promise限制。
- Node内建`AsyncLocalStorage`把请求级signal传到真实SDK/custom fetch接缝；deadline覆盖响应头、完整body、JSON解析和`embedQuery()` Promise。
- `EmbeddingService`与backfill runner均只返回已验证向量；Prisma update严格位于验证之后。
- 新帖路径继续保留既有语义：embedding失败时帖子已创建且update为0、embedding保持null。
- backfill继续默认只补null、逐帖串行、单帖失败继续、部分成功保留、任一失败最终由CLI设置非零退出码。
- production `--all`在PrismaClient、SDK客户端和数据库查询之前拒绝；生产Compose命令无`--all`，且必需database env固定`NODE_ENV=production`。
- seed-demo仅修正完成提示为无参数`pnpm embedding:backfill`；fixture、manifest、事务和文件补偿未改。

## 4. 自动验证

| 门禁 | 结果 |
| --- | --- |
| 聚焦Jest | 4 suites / 23 tests passed |
| 触及TS lint | 0 errors / 0 warnings |
| MJS语法 | `node --check`通过 |
| Linux/amd64 build-stage | Prisma generate与Nest build通过 |
| Windows本地build | 未通过：当前node_modules缺少已锁定的`@nestjs/throttler`和`dotenv`；未改依赖，Linux build为本批权威证据 |
| 补丁检查 | `git diff --check`通过，仅既有换行提示 |

## 5. 无外网容器矩阵

最终矩阵使用`--network none`、真实`OpenAIEmbeddings`与custom fetch接缝，结果5/5：

| 场景 | 请求 | update | 结果 |
| --- | ---: | ---: | --- |
| 200响应头后body卡住 | 1 | 0 | deadline触发底层abort，失败1 |
| 错误维度 | 1 | 0 | 写前拒绝，失败1 |
| 非number元素 | 1 | 0 | 写前拒绝，失败1 |
| 合法1536有限数 | 1 | 1 | 成功1 |
| 两帖部分成功 | 2，严格串行 | 1 | 成功1、失败1，最终失败统计成立 |

所有容器均使用`--rm`，无数据库、uploads或外网挂载；容器残留为0。两个临时验证镜像已按精确标签删除，未执行prune。

## 6. 边界结论

- 未修改`PostsService`运行代码、`ai-timeout.ts`、schema/migration、接口/DTO、前端、依赖、lockfile、模型、供应商、endpoint或secret管理。
- 未连接ECS、未调用真实AI、未写生产数据库、未创建B3、未清理旧候选或B2。
- E3完整回归、暂存与新候选SHA尚未开始，等待用户对E0～E2人工验收。
