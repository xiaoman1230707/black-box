# 生产 embedding 写入安全修复任务计划

> 状态：E0～E7已实施；新候选、35/35 backfill、B3与API恢复通过自动门禁，待用户人工验收。

## 目标

在不改变模型、供应商、schema、接口和业务语义的前提下，确保所有生产 embedding 持久化路径都满足完整请求 deadline 与写前 `1536 + finite number` 校验，并以新 `RELEASE_SHA` 重建完整发布证据。

## 阶段

| 阶段 | 状态 | 完成条件 |
| --- | --- | --- |
| 1. 现状与阻塞核对 | 已完成 | D4.7-B、timeout、EmbeddingService、backfill 与所有 `titleEmbedding` 写入路径完成审计 |
| 2. 09 权威设计 | 已确认 | 根因、共享契约、文件矩阵、发布与回滚路径无歧义 |
| 3. 09 实施计划 | 已确认 | E0～E7具备独立门禁、TDD、验证与授权边界 |
| 4. E0基线 | 已完成 | HEAD、工作树、哈希、写入面、生产35/0和现有测试冻结 |
| 5. E1～E2代码实施 | 已完成 | TDD、聚焦验证与人工验收门禁 |
| 6. E3回归与提交 | 已完成 | 新SHA、后端权威回归与部署门禁通过 |
| 7. E4候选制品 | 已完成 | clean worktree、正式镜像、archive、bundle与SHA清单完成 |
| 8. ECS生产恢复 | 已实施，待人工验收 | 新候选部署、零写入门禁、唯一backfill、B3及API恢复完成 |

## 当前硬门禁

- 旧候选 `72350a77acf59ad179b9a89b19544c162033e0ae` 继续保留但不得再用于backfill或当前发布。
- 当前生产候选为 `b6b3d93866e390eb2e37bd52649fa2628403b1b4`，镜像、release、compose与数据库证据同SHA。
- 生产终态为35 Post、0 null embedding、35 non-null embedding；每条精确1536维且全部有限。
- B2、旧候选、历史失败证据和用户工作树均保留；暂存区保持为空。
- B3远端与本地副本已完成；新API与原db healthy，API仅绑定loopback。
