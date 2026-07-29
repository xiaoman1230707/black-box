# D4 新候选本地制品链重建报告

> 日期：2026-07-21
> 候选SHA：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
> 状态：R0～R4已完成并经用户人工验收通过

## 执行边界

- 只执行已授权的本地R0～R4；不连接ECS、不调用AI、不运行embedding/Search/Chat。
- 新现场与旧SHA worktree、镜像、archive、数据库、uploads、备份、端口和Compose project完全隔离。
- 当前脏工作树与用户文件不作为构建输入；暂存区保持为空。
- 任一有副作用步骤只执行一次，失败立即停止并保留现场。

## R0 发布源与隔离基线

- 主工作树HEAD与候选SHA一致，候选commit只包含`.gitattributes`和LF契约测试；暂存区为0。
- `CLAUDE.md` SHA-256保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`，未进入候选或暂存区。
- 新现场位于仓库外独立目录；`release`为全新detached worktree，HEAD精确匹配候选且`git status --porcelain`为0。
- 旧D2根目录仍存在且未修改；新现场使用全新3110/3111候选端口，创建前均无监听。
- Docker Desktop 29.4.3恢复为linux/amd64；门禁时可用内存39.02GiB、C盘可用749.36GiB，满足4GiB/8GiB阈值。
- 两端依赖按frozen lockfile离线恢复，下载数均为0；release worktree保持clean。

## R1 D1发布门禁

- LF直接archive契约：3个Shell通过，blob与bundle逐字节一致。
- Compose最小权限策略：7项通过；build-image输出路径：2项通过；AI mock预检：8项通过且未访问真实provider；backup-pair fixture：4项通过；两个正式Shell的`bash -n`通过。
- 后端已按不可连接build-only URL完成`prisma generate`和Nest build，未连接数据库。
- 后端全量Jest首次且仅一次执行结果为16/17 suites、79 tests。进程级随机`TOKEN_SECRET`生成语句使用了当前Windows PowerShell/.NET不支持的静态`RandomNumberGenerator.GetBytes(int)`，变量赋值在Jest启动前失败；唯一未加载suite为`ai.controller.spec.ts`，错误是`TOKEN_SECRET is required`。其余16 suites断言全部通过。
- 该失败属于验收命令兼容性，不是候选业务断言回归。依照“失败立即停止、不自动重跑”，未以其他随机生成方式重试，前端并行命令的输出未作为正式证据采信。
- 用户随后授权继续后，仅复跑一次完整Jest。实例式随机数填充成功，但当前PowerShell/.NET又不支持`Convert.ToHexString(byte[])`；`TOKEN_SECRET`仍未完成赋值，结果再次为16/17 suites、79 tests，唯一未加载suite和错误均未变化。
- 第二次停止点仍发生在Jest启动环境构造阶段，不是业务断言失败。依照原始失败即停契约，没有第三次改用逐字节`ToString('x2')`拼接，也没有执行其他R1命令。
- 用户再次授权后，使用实例式随机填充和逐字节十六进制拼接完成兼容复跑：后端17 suites/81 tests全部通过。
- 前端16 files/53 tests、build 2460 modules、Playwright清单9 files/51和全量51 passed；后端定向lint 0/0。
- 全量lint保持批准基线：前端3 errors/0 warnings，后端833 errors/6 warnings；不表述为全仓lint通过。
- 后端lint JSON已完整生成；旧PowerShell解析大JSON失败后，仅用Node读取同一文件汇总，没有重跑ESLint。
- 停止后复核：release HEAD和clean状态不变，主工作树暂存区0，3110/3111/3000/5173无监听，新候选容器0、镜像不存在。

## R2 新镜像与制品

- 已从新候选clean worktree执行唯一一次linux/amd64构建并导出制品。
- 镜像标签为`black-box-api:6e182d477da82a74a0a447bfc7e1f1d77aa4faed`，镜像ID为`sha256:642f6ffee0a488046876df3f056234e9136c36df34efbc8347c30acc1559e2f9`。
- 架构amd64、用户`10001:10001`、工作目录`/app`、命令`node dist/src/main.js`、OCI revision和Node healthcheck均匹配。
- archive SHA-256为`b6de0ac95b4ad21ebb9e925a7e0c67492aff1d4cfde99e5383c2cac55609a418`。
- 首次内容审计输出明确列出3个migration目录和同级`migration_lock.toml`、4个脚本、10个fixture及OpenSSL 3.0.20；审计断言错误地对`readdirSync()`全部条目要求长度3，把lock文件也计入而非只计目录，因此退出非零。
- 该停止点是审计命令缺少`Dirent.isDirectory()`过滤，不是镜像migration内容不符。按失败即停没有自动重跑修正版，也未继续archive/history剩余扫描。
- 用户授权恢复后复用固定镜像ID与archive SHA完成修正审计：3个migration目录、独立普通文件`migration_lock.toml`、4脚本、10 fixtures、Prisma/OpenSSL/bcrypt/sharp均通过；archive禁止路径0、history secret命中0，R2正式通过。

## R3 source/restore恢复演练

- 已创建全新source/restore目录、14个职责分离env文件与source sentinel；未输出生成值。Compose config两栈均通过。
- 固定PostgreSQL 16.14镜像为amd64；source db readiness通过，migration三条全部应用。
- source API在初始化前liveness 200、Prisma readiness 200且帖子为0，随后停止API。
- `seed-games`、`rebuild-tags`、`seed-demo`各只执行一次且成功；seed输出为5用户、35帖子、13评论、31点赞、10图片记录，embedding未执行。
- source uploads共21文件，媒体manifest SHA为`e96a886ee64fd1e23c682375507e04ff13cee591f9e4de5451d01ae6a75b8b50`，sentinel SHA为`95625e147811ed5a33c80c092785c32f658b021a7e69f5222e721b5ed8114875`。
- 第一条计数SQL使用逻辑模型名，被PostgreSQL按不存在关系拒绝；第二条改为真实表名后误用逻辑embedding列名`titleEmbedding`；游戏分布查询又先误用`game_id`。三次均为启用`ON_ERROR_STOP`的只读审计命令错误，不是数据或镜像失败，且没有重复任何migration/seed。
- 修正为物理列`title_embedding`与`"gameId"`后，source核对为35帖子、13评论、31点赞、10文件、5游戏、5标签、0 embedding、3 migration，5个游戏各7篇。
- source API恢复后liveness 200、帖子总数35；10个媒体URL全部使用source自己的`http://127.0.0.1:3110/uploads/`基址，HTTP内容与bind mount逐文件SHA一致。
- 配对备份只创建一次：database dump 33803 bytes，SHA-256 `5a85d66fbcaa72563202b624532fbfc0191a39857e7730343d2213ee6680969f`；uploads archive 300414 bytes，SHA-256 `cdbca0c5c022c17c7113e367125bb0996137d76f8dc665481d365cd6cc231b7c`。`pg_restore --list`、`tar -tzf`、内部`SHA256SUMS`、绝对路径、大小、镜像ID与3条migration manifest均通过。
- source关闭后，restore只启动全新PostgreSQL；未预跑migration或seed，直接恢复database/uploads。restore终态计数、3 migration与每游戏7篇全部一致，API liveness 200、帖子35，10个媒体URL使用restore自己的3111基址且HTTP内容SHA一致。
- restore清单第一次由PowerShell按文化序排序并写CRLF，故文件整体SHA与source的字节序清单不同；逻辑行集合21/21一致，随后严格按source原始清单逐文件核对，0缺失、0摘要差异，sentinel SHA一致。该差异只属于证据序列化，不是媒体恢复差异。
- source/restore均已`down --remove-orphans`且未带`-v`；相关容器0，3110/3111监听0；两套PostgreSQL、21个uploads文件和配对备份现场均保留供人工验收。

## R4 D4.0本地发布制品

- deployment bundle直接由新SHA Git object执行`git archive`生成并原子rename；14698 bytes，SHA-256 `b5bdad27622bd1c26a2c3f50fadb08d10dd210bb0ac390bed1048dde384d3649`。
- bundle共23个tar条目、19个文件、4个目录、0 symlink；与新SHA的`deploy/production`文件集合一致。3个Shell为0 CR字节且Linux `bash -n`全部通过。
- Compose、JSON、Node与PowerShell语法通过；真实env、私钥、构建目录和非loopback IPv4命中均为0。
- 四项传输集合已建立：API archive、build manifest、deployment bundle及`SHA256SUMS`；transfer manifest只列前三项payload并固定同一新SHA、镜像ID与内容计数。
- `SHA256SUMS`为407 bytes、SHA-256 `4fe522914d014882871048b8e009d707e3de115e1192657f82406a88bac054fc`，CR=0、LF=3、BOM=0；无网络Linux容器直接执行`sha256sum -c`为3/3 `OK`，未使用`sed`转码。
- transfer manifest为3006 bytes、SHA-256 `5158c95e5fee24cde9b756403ae0d5dadd3b543bd17ad2ddfa75f0da18ddb5bf`。API archive与build manifest继续保持R2固定摘要，未重新构建、重新导出或修改tag。

## 最终门禁

R0～R4本地重建已完成并经用户人工验收通过。release worktree精确指向新SHA且clean；主工作树暂存区0，`CLAUDE.md` SHA-256保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。本报告不构成ECS写入、旧staging清理、D4.1恢复或任何生产写入授权。

人工验收后已另行完成新候选D4.1前ECS新鲜只读门禁，脱敏证据见`d4-new-candidate-host-gate.md`；当前停在D4.1独立E授权门禁。
