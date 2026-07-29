# F5隔离Compose、配对备份与直接恢复报告

> 日期：2026-07-22
> 状态：已完成，用户人工验收通过
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 身份与隔离

- 仅使用F4正式镜像`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`及固定SHA的干净detached worktree/制品。
- source project为`blackbox-f5-source-72350a77`，loopback端口3112；restore project为`blackbox-f5-restore-72350a77`，loopback端口3113。
- 两栈使用不同的仓库外PostgreSQL、uploads、backup、env目录并严格串行；没有复用历史D2/D4现场。
- 恢复成功现场位于`C:\Users\15593\AppData\Local\Temp\black-box-f5-72350a77-recovery-20260722T090035Z`。

## 2. 首次失败与恢复

- 首次执行在env生成和Docker启动前因QA脚本局部变量初始化顺序触发`set -u`，按门禁停止并保留空现场；详见`f5-isolated-restore-stoppage.md`。
- 用户独立授权恢复后，只拆分该局部变量声明，并使用新的全新F5根目录。没有重跑任何已成功的数据写步骤，因为首次执行尚未开始这些步骤。
- 成功链路中每个有副作用步骤只执行一次；未发生数据库写步骤失败、自动restore或现场清理。

## 3. Source初始化

执行顺序严格为：

1. `prisma migrate deploy`
2. `seed-games`
3. `rebuild-tags`
4. `seed-demo`

终态：

| 项目 | 数量 |
| --- | ---: |
| Prisma migration | 3 |
| User | 5 |
| Post | 35 |
| Comment | 13 |
| UserLikePost | 31 |
| File记录 | 10 |
| Game | 5 |
| Tag | 5 |
| title embedding | 0 |

5个游戏各7篇帖子；公共帖子API返回`total=35`及35项。uploads共21个文件，包括20个seed媒体输出和1个非产品sentinel。

## 4. 配对备份

候选自带的修复版`backup-pair.sh`只执行一次并成功：

| 文件 | 大小（bytes） | SHA-256 |
| --- | ---: | --- |
| `database.dump` | 33790 | `d9e3e64f268327eab6e9653d6c2e662dbc8c9b4d4e171fc41e7f307632b000e0` |
| `uploads.tar.gz` | 300386 | `ce7a466a4043ea163965f64980e3163e20a635df00d93ca4b069807612c6da7e` |

- manifest中的release SHA、API镜像ID、绝对路径、大小、SHA和3条migration一致。
- 内部`SHA256SUMS`两项均为OK；`pg_restore --list`与`tar -tzf`均通过。
- 备份脚本停止API后保留数据库healthy，没有`.incomplete`成功链路残留。

## 5. Direct restore

- source完全down后才启动restore；restore空库确认没有`_prisma_migrations`，uploads为空。
- 未运行migration、games、tags或demo，直接将custom dump恢复到空数据库并解压配对uploads归档。
- restore数据库JSON、游戏分布和migration清单与source逐字节一致。
- source/restore媒体manifest均为21项并逐字节一致；sentinel SHA一致。
- restore公共帖子API同样返回`total=35`及35项。

## 6. API SIGTERM

| 栈 | 耗时 | Exit | Signals | OOM | Restart | DB | 停止后HTTP |
| --- | ---: | ---: | --- | --- | ---: | --- | --- |
| source | 504ms | 0 | 仅15 | false | 0 | healthy | 不可达 |
| restore | 564ms | 0 | 仅15 | false | 0 | healthy | 不可达 |

Docker events各记录一次signal 15，均无signal 9、exit137、OOM或自动重启。

## 7. AI与终态

- 未运行`embedding-backfill`、`ai-preflight`、Search或Chat；没有真实AI调用，embedding保持0。
- source与restore均执行`down --remove-orphans`且未使用`-v`；F5容器0、网络0，3112/3113均无监听且不可达。
- 两套PostgreSQL bind数据、uploads、唯一完整备份、正式制品、首次失败现场与全部证据保留供人工审查；未执行Docker prune。
- Git index为空，HEAD仍为固定SHA；F4 worktree clean。AGENTS与`CLAUDE.md`保护哈希未变化。
- 未连接ECS、未修改生产数据库、未操作DNS/Nginx/Vercel/UFW、未进入F6、未提交Git。

## 8. QA观察

- API就绪轮询在source和restore各观察到一次瞬时`Empty reply from server`，随后稳定liveness和帖子API均成功；不是最终行为失败。
- 独立只读复核的三条临时跨壳命令分别遇到POSIX路径表示、PowerShell组合输出和内联引号问题；均未产生数据写入。最终固定`f5-verify.sh`一次通过全部备份、恢复、事件和资源断言。

用户已于2026-07-22确认本报告并通过F5人工验收。后续仅获准执行F6.1新鲜只读门禁；F6.2上传仍需独立写入授权。
