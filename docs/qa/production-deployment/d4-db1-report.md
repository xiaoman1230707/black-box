# D4.4 DB-1 Migration、B1与API生命周期报告

> 日期：2026-07-22
> 状态：数据库与恢复点门禁完成；API优雅停机阻塞，D4.4未通过人工验收
> 候选：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
> 边界：未执行games、tags、demo、AI preflight、embedding、cleanup、Nginx、证书、DNS、Vercel或公网端口变更

## 1. 前置与失败记录

- D4.3已人工验收，B0四项文件可读；三项内部SHA、`pg_restore --list`、`tar -tzf`和pre-migration manifest契约再次通过。
- 两次本地PowerShell嵌套SQL命令均在SSH建立前解析失败，无远端动作。
- 首次stdin门禁因sudo缓存失效在脚本前停止；用户自行执行`sudo -v`后恢复，agent未接触密码。
- 第一次脚本前置门禁因对不存在的`B1/..`执行`df`而停止，明确`MIGRATION_STARTED=false`。
- 第二次stdin门禁在首个Python heredoc后异常到达EOF，仍明确`MIGRATION_STARTED=false`。之后改用默认SFTP唯一`.part`、完整SHA/大小、原子rename、`0700`与`bash -n`核验，不再使用stdin执行脚本。
- 上述失败证据均保留在root受控目录；没有自动重跑migration、清库、恢复B0或删除现场。

## 2. Migration结果

- 正式门禁前置检查全部通过，唯一一次`prisma migrate deploy`退出码0。
- `prisma migrate status`退出码0。
- 精确三条migration均为finished，failed/rolled-back记录0：
  - `20260122120657_init_user`
  - `20260122122848_add_posts`
  - `20260617092158_add_game_and_post_fields`
- public表共10个（含`_prisma_migrations`）；users、posts、comments、tags、post_tags、user_like_posts、avatars、files、games九个业务表均为0行。

## 3. B1 post-migration恢复点

- 绝对目录：`/srv/black-box/backups/B1/20260722T044431Z-6e182d477da82a74a0a447bfc7e1f1d77aa4faed`。
- `database.dump`：26,567 bytes；SHA-256 `f9afd5863c3e1a8dceb664ad77fb15ae2bd2e4e5bc2ef52e6faad2ee4642bf87`。
- `uploads.tar.gz`：99 bytes；SHA-256 `5ec240651ee71c31d496b0eb06caa7a1dc69e385551e1bf5d3e1c1f1a11b6e3e`。
- `manifest.json` SHA-256：`5698e97ef5c4c8ca36d94f08a3bb201f47a89b98478b5c0b6bf37d1995596fb2`。
- manifest的release、API镜像、PostgreSQL镜像、绝对路径、大小、SHA、`migrationState=applied`和三条migration：PASS。
- `SHA256SUMS`三项、`pg_restore --list`、`tar -tzf`与空uploads语义：PASS。
- 候选`backup-pair.sh`按部署目录推导的repo root为`/srv/black-box`，会把批准的`/srv/black-box/backups`误判为仓库内部；本批未绕过或修改候选脚本，而以一次性DB-1门禁生成同契约B1。该工具路径问题必须在B3前修正并重新建立候选证据。

## 4. Loopback API验证

- API短暂启动并达到healthy；宿主3000仅绑定loopback，5432未发布。
- `GET /api` liveness：PASS。
- `GET /api/posts?page=1&limit=1`真实Prisma结果严格为`{items: [], total: 0}`：PASS。
- 候选`verify-stack.sh base`的PostgreSQL readiness、Nest liveness、Prisma readiness与uploads权限：PASS。
- API停止后，宿主80/443/3000/5432监听均为0，终态仅db running+healthy；DB OOM=false、restart=0，failed units=0。

## 5. 阻塞项：API不响应SIGTERM

- 第一次`docker compose stop api`在默认停止窗口后得到exit 137，OOM=false、restart=0。
- 独立复验重新启动同一loopback API，healthy后执行`docker compose stop -t 60 api`；精确耗时60秒，仍为exit 137、OOM=false、restart=0。
- 结论：137由停止超时后的SIGKILL产生，不是内存OOM；候选API未在60秒内完成SIGTERM退出。
- 当前候选`main.ts`没有显式启用Nest shutdown hooks，Prisma service也没有销毁钩子；这解释了缺少明确优雅关闭契约，但具体修复必须通过独立TDD和新候选发布链验证，不能在ECS现场修改或放宽退出码门禁。
- D4.4因此暂不通过，DB-2不得开始。新候选必须验证SIGTERM后在受控窗口内exit 0、Prisma连接关闭、无137/OOM/restart，并重新建立与当前生产migration/B1兼容的制品证据。

## 6. 终态与保护边界

- 当前仅db healthy；API停止，tools为0，受保护宿主监听0，failed units 0。
- 本批deploy-home临时脚本已按精确路径删除；root失败/执行证据与B1保留。
- sudo缓存已清除；本机SSH/SFTP/SCP进程0，2222已建立连接0。
- Git暂存区为空；`CLAUDE.md` SHA-256仍为`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。
- 未进入DB-2，未修改候选镜像、Compose、数据库migration、业务代码或云端网络边界。
