# 生产发布修复批次计划记录

## 目标

在F1/F2已人工验收通过的前提下，完成F3完整回归、两条独立修复提交并固定`FIX_RELEASE_SHA`，随后停在F4施工授权门禁。

## 阶段

| 阶段 | 状态 | 完成条件 |
| --- | --- | --- |
| 1. 基线与保护 | 已完成 | 旧候选、生产DB/B1、脏工作树、`CLAUDE.md`和禁止动作已冻结 |
| 2. API生命周期诊断 | 已完成 | 两轮旧镜像稳定复现并锁定信号、PID1、Nest/Prisma生命周期与退出原因 |
| 3. Backup路径诊断 | 已完成 | ECS同构fixture复现并追踪错误repo root来源 |
| 4. 设计文档 | 已完成 | 独立08权威设计已形成并完成范围、安全、回滚自审 |
| 5. 实施计划 | 已完成 | TDD任务、文件矩阵、新SHA重建与生产切换门禁完整 |
| 6. 设计与计划评审 | 已完成 | Nest 11.1.12退出语义与backup回退fixture补正后已获人工确认 |
| 7. F1 API生命周期TDD | 已完成 | Prisma RED/GREEN、两轮容器SIGTERM、build与定向lint通过 |
| 8. F1人工验收 | 已完成 | 用户已确认F1生命周期修复与证据通过 |
| 9. F2 backup路径边界TDD | 已完成 | 安装布局、真实Git与保守回退共8个fixture通过，既有保护未弱化 |
| 10. F2人工验收 | 已完成 | 用户已确认backup边界修复与保护证据通过 |
| 11. F3完整回归与差分审查 | 已完成 | Linux后端18/82、两端build、前端16/53与9/51、Docker和部署门禁全部通过 |
| 12. 两组提交前暂存审查 | 已完成 | 两组cached diff分别通过，文件集合、安全扫描与patch检查无异常 |
| 13. 两条独立修复提交 | 已完成 | 运行时提交`638ba463...`；backup提交`72350a77...`直接继承前者，index为空 |
| 14. F4新SHA制品重建 | 已完成 | 全量回归、唯一正式镜像、两轮SIGTERM、archive/manifest/bundle/LF SHA清单与安全审计均完成并经用户人工验收通过 |
| 15. F5隔离Compose与直接恢复 | 已完成 | source非AI初始化、唯一配对备份、空restore直接恢复、媒体/SHA一致性与两套API SIGTERM均完成并经用户人工验收通过 |
| 16. F6.1 ECS新鲜只读门禁 | 已完成 | 主机/安全组/UFW/资源/旧资产/B0/B1/Compose/镜像/生产migration与空表分页全部通过并获用户人工验收 |
| 17. F6.2 新候选制品与镜像 | 已完成 | 上传、审计、原子落地、唯一镜像导入及sudo缓存负向验证全部闭环并获用户人工验收 |
| 18. F6.3 新镜像数据库兼容 | 已完成 | 固定新镜像唯一一次status退出0，3条migration与九表空库兼容核对通过并获用户人工验收 |
| 19. F6.4-A 生产API切换与生命周期 | 已完成 | 新API切换、只读健康、483ms SIGTERM exit 0与重启均已完成并获用户人工验收 |
| 20. F6.4-B pre-DB2生产配对备份 | 已完成 | 远端恢复点、默认SFTP副本、API恢复与sudo timestamp清理均完成并获用户人工验收；禁止自动进入DB-2 |

> 终态：F0～F6全部完成并经用户最终人工验收；08批次关闭，返回`production-deployment`的D4.5 DB-2 `seed-games`独立门禁。

## 冻结边界

- 旧 `RELEASE_SHA=6e182d477da82a74a0a447bfc7e1f1d77aa4faed` 对应当前已迁移生产库，但不再具备发布资格。
- 生产三条migration、B0/B1、旧镜像、旧release均原样保留；不重跑、回滚、清库、恢复或清理。
- F1只允许修改`main.ts`、`prisma.service.ts`并新增两类生命周期测试；不连接ECS、不运行seed/AI、不操作Nginx/DNS/Vercel，不修改依赖、lockfile、schema/migration、前端或既有e2e，不暂存/提交。
- 本地诊断只使用仓库外一次性资源；不访问真实AI或生产数据。

## 错误记录

| 时间 | 错误 | 处理 |
| --- | --- | --- |
| 2026-07-22 | 当前PowerShell/.NET不支持静态`RandomNumberGenerator.GetBytes(int)` | Docker资源创建前停止；精确删除空临时目录，改用实例API |
| 2026-07-22 | 当前PowerShell/.NET不支持`Convert.ToHexString(byte[])` | Docker资源创建前停止；改用兼容的`BitConverter`转换，仅修诊断脚本 |
| 2026-07-22 | 容器内`tr`参数被PowerShell/Docker转义破坏，异常清理漏掉API容器 | 精确清理本轮唯一前缀资源；PID1命令改由`docker inspect`读取，finally按两轮固定名称先删API |
| 2026-07-22 | `docker inspect` Go template嵌套引号被PowerShell拆坏，清理不存在的第二轮容器触发终止 | 精确清理本轮资源；改为解析inspect JSON，所有清理均先按精确名称判断存在性 |
| 2026-07-22 | 第二次内联复现的工具宿主关闭stdout | finally已清理现场；只读复核无容器/网络/临时目录残留，改用planning内固定诊断脚本 |
| 2026-07-22 | F5 QA脚本在`set -u`下同一条`local`声明中提前引用`base` | 创建空source/restore目录后立即停止；env、容器、数据库、备份与AI均未触及，现场保留且未自动重跑 |
