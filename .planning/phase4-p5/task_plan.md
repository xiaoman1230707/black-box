# 第四期 P5：工程收尾施工方案

## 目标

依据已确认的 04、实施主计划及 P1～P4 真实实现，完成 URL、环境校验、公开媒体 URL、CORS/代理、限流、文件清理、演示 seed、AI 外部链路有限失败、生产启动与运维文档。P5.1～P5.10 均已闭环，当前停止在 P6 入口。

## 阶段

- [completed] 1. 同步 P4 人工验收通过并切换活动计划
- [completed] 2. 核对 P5 最终十个任务的真实代码、依赖、测试和数据边界
- [completed] 3. 修正设计/主计划与真实代码的差异
- [completed] 4. 完善 P5 任务顺序、文件矩阵、TDD、人工门禁和回滚边界
- [completed] 5. 自审并提交用户确认；确认前不实施 P5

## 范围红线

- P5 已按逐项授权完成必要源码、依赖、测试、维护脚本、cleanup apply 与双轮 seed/full；不回溯扩大范围。
- 成功接口结构、JWT/SSE annotation、Search/Home 业务语义和数据库 schema/migration 保持不变；不进入 P6。
- 后续不得未经新授权再次执行 cleanup apply、seed 或 embedding backfill。
- 不提交 Git。

## 当前门禁

- P4 已人工验收通过。
- P5 工程、cleanup、双轮 seed/full、Home/PostDetail/Search/Chat 人工串验及 P5.9 有限失败修复均已完成。
- P5.10 已按 TDD 对齐 `start:prod` 与真实 `dist/src/main.js` 产物，并完成隔离生产启动与 `/api` 200 验证。
- P5.1～P5.10 已全部闭环并获用户整批人工验收通过；已授权进入 P6 方案阶段，P6 执行仍须等待方案确认。

## 已冻结施工顺序

1. **[completed]** P5.1 前端统一 API URL。
2. **[completed]** P5.2 环境加载、分层校验与强密钥。
3. **[completed]** P5.3 公开媒体 URL helper。
4. **[completed]** P5.4 CORS 与可信代理边界。
5. **[completed]** P5.5 全局/敏感接口限流与统一 429。
6. **[completed: apply verified and accepted]** P5.6 上传文件安全清理工具；备份 A 后单次 apply 成功，最终 orphan 0，并已完成人工验收。
7. **[completed: two real runs and page gate accepted]** P5.7 35 帖演示 seed、图片补偿和 embedding 组合命令；备份 B 后连续两次 `seed:demo:full` 均成功，数据、文件、向量幂等及页面门禁均通过。
8. **[completed: integration gate accepted]** P5.8 env 示例、部署/维护文档与集成门禁；cleanup、备份 A/B、双轮 seed/full 与页面串验均已闭环。
9. **[completed: user accepted]** P5.9 AI 外部链路有限失败与前端错误收口。
10. **[completed]** P5.10 修正 `start:prod` 到真实 `dist/src/main.js` 产物并验证隔离生产启动。

## 已关闭门禁

- P5.6：cleanup apply 已单次成功并完成人工验收，备份 A/B 证据均闭环。
- P5.7：两次 `seed:demo:full` 均成功，数据库规模、关系、10 图哈希、35 个 embedding 与 cleanup dry-run 已核对；Home/Search/Chat/PostDetail 均已人工通过。
- P5.10：标准 `pnpm start:prod` 已在隔离端口启动真实产物并通过 `/api` 200 验证。P5 整批完成，但本轮不进入 P6。

每个 task 独立验证和回滚，不跨 task 顺手清理业务或 lint 债；不进入 P6。
