# 生产发布修复根因诊断报告

> 状态：根因已修复，08批次已实施并人工验收通过
> 日期：2026-07-22
> 范围：本地隔离诊断；未连接ECS，未写生产数据库，未修改候选代码

## 1. 保护基线

- Git暂存区为空。
- `CLAUDE.md` SHA-256保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。
- 生产三条migration、B0/B1未触及；DB-2未执行。
- 旧候选SHA与镜像仅用于只读身份核对和仓库外隔离运行。

## 2. API复现

- 使用仓库外唯一临时目录、Docker网络、PostgreSQL和uploads；API不发布宿主端口，不调用AI。
- 连续两轮API均先达到healthy。
- 容器配置：官方`docker-entrypoint.sh`，命令`node dist/src/main.js`，entrypoint最终`exec "$@"`；Node为PID 1，未声明自定义StopSignal。

| 轮次 | 停止窗口 | 事件 | Exit | OOM | Restart |
| --- | ---: | --- | ---: | --- | ---: |
| 1 | 3秒 | SIGTERM → SIGKILL | 137 | false | 0 |
| 2 | 3秒 | SIGTERM → SIGKILL | 137 | false | 0 |

结论：SIGTERM已经送达Node PID 1，但应用未在窗口内退出；不是OOM、restart或entrypoint未转发。代码核对显示Nest未启用shutdown hooks，HTTP/Nest关闭链未启动；Prisma亦缺少显式销毁钩子。

本地依赖实现证据：项目实际安装`@nestjs/core` 11.1.12与对应`@nestjs/common`类型。`enableShutdownHooks(signals, options)`的cleanup顺序为destroy hooks、before-shutdown hooks、application dispose、shutdown hooks；框架随后移除自身signal listeners，默认分支调用`process.kill(process.pid, signal)`，`useProcessExit: true`分支调用`process.exit(0)`。公开`ShutdownHooksOptions`类型也明确该选项把默认重新发送信号改为0退出。Linux对PID 1的默认终止信号处理具有特殊语义；当前Node是容器PID 1，默认分支不能作为“可靠exit 0”方案。修复必须显式使用官方`useProcessExit: true`，不能只写“启用hooks”。

诊断脚本的早期PowerShell兼容和转义失败均单独记录；有效两轮结果来自同一固定脚本运行，失败后的唯一前缀资源已精确清理。原始事件包含本地临时路径，不复制到权威设计。

## 3. backup路径复现

在无网络容器中构造ECS同构路径：

```text
/srv/black-box/compose/<sha>/scripts/backup-pair.sh
/srv/black-box/uploads
/srv/black-box/backups
```

实测结果：exit 2，错误为`BACKUP_ROOT must be outside the repository`。脚本由自身路径向上三级得到`/srv/black-box`，因此合法backup sibling被误判为源码仓库内部。拒绝发生在Docker/数据库操作前。

## 4. 已确认修复方向

- API：`app.enableShutdownHooks(['SIGTERM', 'SIGINT'], { useProcessExit: true })` + Prisma `OnModuleDestroy/$disconnect()`；容器级RED/GREEN锁定真实PID 1、signal 15、无signal 9与exit 0。
- Backup：按规范化backup路径识别真实Git工作树，不从安装路径猜repo root；保留uploads、重名、写工具与失败现场保护。
- 旧SHA仍与已迁移生产库/B1关联，但失去发布资格；新SHA必须完整重建和验收。

## 5. 最终关闭结果

- API生命周期修复提交与backup路径修复提交共同形成`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`。
- 新候选本地两轮SIGTERM、隔离source/restore、ECS制品导入、生产只读兼容、生产单次SIGTERM与API恢复均通过；生产SIGTERM为483ms内exit 0，仅signal 15，无signal 9、137、OOM或restart。证据见`f1-api-lifecycle-report.md`、`f4-local-artifact-rebuild-report.md`、`f5-isolated-restore-report.md`及`f6-4a-api-switch-report.md`。
- 修复版backup脚本通过8项fixture、隔离直接恢复和生产“F6 release / pre-DB2”配对备份；真实Git、uploads嵌套、重名、写工具与失败现场保护保持。证据见`f2-backup-path-report.md`、`f5-isolated-restore-report.md`及`f6-4b-pre-db2-backup-report.md`。
- 用户已最终确认08批次通过。旧候选、B0/B1、失败证据和F4/F5现场继续保留；DB-2尚未执行。
