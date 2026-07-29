# F5隔离Compose与直接恢复首次停止报告

> 日期：2026-07-22
> 状态：已按失败即停契约暂停，等待独立恢复授权
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

> 后续状态：本报告保留首次失败事实；用户独立授权最小修正后，F5在新的全新根目录完成。最终证据见`f5-isolated-restore-report.md`。

## 1. 已通过的前置门禁

- Docker Engine为linux/amd64，正式API镜像ID、OCI revision、运行身份与固定SHA一致。
- F4 detached worktree仍指向固定SHA且clean；API archive SHA与F4报告一致。
- PostgreSQL固定digest镜像可读；计划端口3112/3113无监听，无历史F5容器或网络。
- C盘资源满足隔离演练门禁；Git index为空，受保护文件未因F5被修改。

## 2. 停止原因

QA编排脚本通过`bash -n`后开始唯一一次执行。脚本创建全新source/restore目录和日志后，在生成第一组env之前退出：

```text
f5-isolated-restore.sh: line 49: base: unbound variable
```

原因是`set -u`下同一条`local`声明同时定义`base`并用其初始化`env_dir`，后一个表达式不能可靠读取尚未完成赋值的局部变量。这是QA编排错误，不是候选应用或部署脚本回归。

## 3. 现场终态

- 仓库外现场：`C:\Users\15593\AppData\Local\Temp\black-box-f5-72350a77-20260722T085408Z`。
- 仅创建source/restore下的postgres、uploads、backups、env空目录及268-byte运行日志。
- env文件0；source/restore PostgreSQL目录条目0；容器0；网络0；3112/3113监听0。
- migration、seed-games、rebuild-tags、seed-demo、配对备份、restore及两套API SIGTERM均未执行。
- embedding、AI preflight、Search、Chat与真实AI调用均为0。
- 未连接ECS、未修改生产数据库、未进入F6、未暂存或提交Git。

## 4. 恢复边界

首次失败日志、空目录现场和QA脚本均保留。按本批“任一失败立即停止、不自动修复或重建”契约，本轮未修改脚本后重跑；恢复需要用户独立授权，并必须使用新的全新F5根目录，不能把该空现场伪装为成功链路。
