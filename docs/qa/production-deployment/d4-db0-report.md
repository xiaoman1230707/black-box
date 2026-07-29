# D4.3 DB-0 首次空库与B0恢复点报告

> 日期：2026-07-22
> 状态：已实施，用户人工验收通过
> 候选：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
> 边界：只启动PostgreSQL并创建pre-migration B0；未执行migration、seed、AI、embedding、API或公网发布

## 1. 前置门禁

- 固定RELEASE_SHA、API image ID与PostgreSQL digest：PASS。
- 六个secret env为`root:root 0600`、`release.env`为`root:root 0644`；仅核对存在和权限，未输出值。
- PostgreSQL目录为空且为`999:999 0700`；uploads无业务媒体文件；Compose project无容器：PASS。
- 启动前可用内存高于512MiB，Swap空闲高于1GiB，磁盘可用高于10GiB；80/443/3000/5432无监听，failed units 0：PASS。

## 2. PostgreSQL首次启动

- 仅执行一次`docker compose up -d --no-deps db`；未启动API或tools。
- PostgreSQL 16.14、固定镜像digest、容器postgres用户与PID1 UID `999`、GID `999`：PASS。
- `/var/lib/postgresql/data`以读写bind mount落到批准宿主目录：PASS。
- `pg_isready`与Docker health：healthy；shared_buffers 128MB、max_connections 30、work_mem 4MB、maintenance_work_mem 64MB：PASS。
- 容器OOM=false、restart count=0，日志中FATAL/PANIC/OOM命中0。
- Compose显示的`5432/tcp`仅为容器内部暴露；宿主80/443/3000/5432监听均为0。

## 3. 空库语义

- `public._prisma_migrations`不存在，public业务表计数0：PASS。
- 该状态是migration前空库预期；本批未据此自动执行migration、seed或任何修复。

## 4. B0恢复点

- 绝对目录：`/srv/black-box/backups/B0/20260722T034950Z-6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
- `database.dump`：878 bytes；SHA-256 `b950d306be31f453e7a38fb26e24cd0de8d54ee412df9ab365fe9975f40761be`。
- `uploads.tar.gz`：99 bytes；SHA-256 `5ec240651ee71c31d496b0eb06caa7a1dc69e385551e1bf5d3e1c1f1a11b6e3e`。
- `manifest.json` SHA-256：`74c398a366fabcc68b25449405ec0ccf9ed204c432c822198fcdfc82be0c906d`。
- manifest记录固定release、PostgreSQL镜像身份、绝对路径、大小、SHA、`migrationState=not-applied`和空migration数组：PASS。
- `pg_restore --list`、`tar -tzf`及`SHA256SUMS`中database/uploads/manifest三项：PASS。
- B0仅用于首次migration前恢复，不是上线后正式业务备份，不能替代后续B1/B2/B3。

## 5. 终态与边界

- 仅`black-box-db-1`运行且healthy；API与6个tools均为0。
- 可用内存约1.07GiB；Swap约2GiB且仅使用约780KiB；根盘使用约21%，可用约29.5GiB。
- 宿主80/443/3000/5432无监听，failed units 0；sudo缓存已清除，本机SSH/SFTP/SCP进程0。
- 一次终态命令因PowerShell提前展开远端命令替换而非零，只输出了安全的db healthy列表，未产生写入；随后用固定容器名补齐只读证据，未重复启动或备份。
- `CLAUDE.md`哈希保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`，Git暂存区为空。
- D4.3已由用户人工验收通过；D4.4 DB-1已取得独立授权。B0恢复、删除或重建仍需新的DB/R授权，DB-1授权不覆盖seed、AI或embedding。
