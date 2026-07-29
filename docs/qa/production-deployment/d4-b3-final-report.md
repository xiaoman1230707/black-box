# D4 B3 final 配对备份与API恢复报告

> 日期：2026-07-27
> 状态：已实施并通过自动门禁，待用户人工验收

## B3远端恢复点

- 语义：post-embedding final恢复点。
- `database.dump`：289040 bytes，SHA-256 `88104595f3b0f9e00bb2158e8f890c028bec5d7f368fa6485fb2a1363bdc62b0`。
- `uploads.tar.gz`：299970 bytes，SHA-256 `ea70fd723266d8edd0050b0e35382d727fd74cec11ce67565ee76e7ea302a128`。
- `manifest.json`：956 bytes，SHA-256 `599512f31c88bffd06d8248efd106d97b60b43250ca1ce22a18e5c8d8a58012e`。
- `SHA256SUMS`：161 bytes，SHA-256 `da932c2b771d90d9f1739bde2fa87316436f6ffe9708ef705e9bf6a758cbb0d7`。
- 内部SHA、`pg_restore --list`、`tar -tzf`、3 migrations、release与镜像身份全部通过。

## 本地异机副本

- 首次下载目标因SSH stdin脚本在Compose处提前结束，deploy导出目录尚未创建；保留空目录作为历史证据，未重跑备份。
- 改为远端固定脚本文件后，仅审计现有B3并创建deploy只读副本；默认SFTP下载到仓库外全新retry1目录。
- 本地四项大小/SHA与远端逐项一致；内部SHA、dump列表、tar和manifest全部通过。

## 最终运行态

- 新API镜像与`RELEASE_SHA`一致，容器以`10001:10001`运行并healthy。
- API仅绑定`127.0.0.1:3000`；Nest liveness和真实Prisma分页通过。
- 原PostgreSQL容器running+healthy；3 migrations、35 Post、35/35 embedding、20媒体保持。
- Nginx保持inactive+disabled；80/443/5432/2375/2376无监听；failed units为0。
- 未执行额外AI、seed、migration、cleanup或restore。
