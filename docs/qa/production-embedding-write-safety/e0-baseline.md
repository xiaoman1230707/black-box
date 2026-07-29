# E0 embedding写入安全基线

> 日期：2026-07-23
> 状态：已完成，进入E1 RED

## 工作树与保护

- HEAD：`72350a77acf59ad179b9a89b19544c162033e0ae`，分支`main`。
- 暂存区为空；既有AGENTS、CLAUDE、07/08/部署QA和planning脏工作树原样保留。
- AGENTS SHA-256：`DF5826C00A3360AA34ED667C73A01DCE90EA2E11091CA6210664706982CED17C`。
- CLAUDE SHA-256：`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。
- package、lockfile、schema SHA分别为`64D20A7267B0953220ACB046BDFA8FC7BC140A28A12EFFE308A343B6A06D8DB5`、`4F493739DBBE284871262C3A002C874A8D932EF9A06ABFA17CAB660D2FEE92F4`、`20BD19FF8AC9FDDBE10EA96EBB827FB76A3B884E251BE92FB14E404142926463`。

## 代码与测试基线

- 持久化写入精确为`PostsService.create()`和`backfill-embeddings.ts`两条；Search/Chat只生成查询向量，审计脚本只读，demo seed保持null。
- 当前backfill没有完整Promise deadline和写前1536/finite校验；`EmbeddingService`有外层Promise timeout但没有共享校验。
- 现有`embedding.service.spec.ts`与`ai-timeout.spec.ts`：2 suites / 6 tests passed。
- 首次`pnpm exec jest`因受限环境无法访问pnpm store且未启动Jest；直接使用仓库现有`node_modules/.bin/jest.cmd`后通过。没有安装或修改依赖。
- Docker CLI版本可读，但沙箱内Docker API与用户Docker配置不可访问；容器门禁在E2使用已批准的受控外部执行，不改变Docker全局配置。

## 生产零写入证据

- 承接D4.7-B已验收只读证据：35 Post、35 null embedding、0 non-null embedding。
- DB-4数据、20媒体、B2、API停止和原db healthy无漂移。
- 本批未连接ECS、未创建one-off、未调用供应商、未写生产数据库。
