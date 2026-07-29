# D4.5-A1 / DB-2 `seed-games`施工方案与只读预检

> 状态：D4.5-A1方案/预检与D4.5-A2写入均已人工验收通过
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 范围与禁止项

本门禁只设计并预检DB-2游戏目录初始化。真正执行前必须另获独立数据库写入授权；本轮不停止API、不创建tool容器、不连接数据库执行写命令。

DB-2不得与migration、`rebuild-tags`、`seed-demo`、embedding、AI preflight、cleanup或restore合并。不得修改业务代码、schema/migration、secret、uploads、Nginx、证书、DNS、Vercel、SSH、UFW或安全组。

## 2. 真实脚本契约

- 编译后入口：`node dist/src/scripts/seed-games.js`。
- Compose服务：`seed-games`；只读取`database.env`，只加入内部`db_net`，`read_only: true`、`restart: "no"`，无uploads挂载、无外网网络。
- 数据唯一键：Prisma `Game.name @unique`，数据库表为`games`。
- 写入方式：按数组顺序执行5次`prisma.game.upsert()`；`where`为游戏名，已存在时只更新`description`，不改`cover`，不存在时创建`name + description`且`cover`保持空值。
- 脚本不是单事务。中途失败可能已写入前缀游戏，因此失败后禁止自动重跑或继续DB-3。

固定目标游戏及描述：

| 顺序 | 名称 | 描述 |
| --- | --- | --- |
| 1 | 黑神话:悟空 | 国产 3A 动作角色扮演,取材西游 |
| 2 | 原神 | 开放世界冒险 RPG |
| 3 | 艾尔登法环 | 魂系开放世界动作 RPG |
| 4 | 塞尔达传说:王国之泪 | 开放世界冒险解谜 |
| 5 | 赛博朋克2077 | 未来都市开放世界 RPG |

## 3. 真实执行命令

固定使用生产`release.env`与FIX SHA的Compose文件；命令不在本轮执行。取得独立授权后，先停止API并确认仅db运行，再只执行一次：

```text
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T seed-games
```

`--no-deps`用于禁止本命令创建或替换db；前置门禁必须证明原db已running+healthy。`--rm`用于成功或正常失败后不保留本次一次性容器；若Docker异常导致残留，只记录并停止，不擅自删除。

## 4. 执行顺序与资源边界

1. 固定FIX SHA、API镜像、原db容器、release/compose/env权限；只验证secret文件存在与权限，不读取值。
2. 验证pre-DB2远端恢复点及仓库外副本的四项文件、内部SHA、dump和uploads归档可读。
3. 只读确认三条migration均finished，无pending/failed/rolled-back；九张业务表执行前均为0。
4. 记录uploads逐文件清单与SHA；确认无migrate、seed、embedding、cleanup等写工具。
5. 记录内存、Swap、磁盘、failed units、容器OOM/restart及监听；`MemAvailable >= 512MiB`、`SwapFree >= 1GiB`、磁盘可用`>= 10GiB`。
6. 停止API并确认HTTP不可达；原db必须持续healthy，运行中的Compose服务精确只有db。
7. 创建唯一seed-games一次性tool并等待其退出；执行期间不得启动API或任何其他tool。
8. 成功后保持API停止，只做只读数据、migration、uploads、容器与资源核对，停在人工验收门禁。

## 5. 前后数据矩阵

| 对象 | 执行前 | 成功后 |
| --- | ---: | ---: |
| `_prisma_migrations` | 3 total / 3 finished | 完全不变 |
| `games` | 0 | 精确5，名称集合与本方案一致且唯一 |
| 其余8张业务表 | 全部0 | 全部0 |
| `posts`及关联数据 | 0 | 0 |
| uploads业务媒体 | 0 | 清单与逐文件SHA不变 |
| API | running+healthy | stopped，等待人工验收 |
| db | running+healthy | 同一容器继续healthy、无OOM/restart |
| seed-games tool | 0 | 已退出且无残留 |

除计数外，按名称逐项核对5条`description`；所有`cover`应为null。不得仅凭脚本日志中的`games seeded`判定成功。

## 6. 成功、失败与恢复边界

成功必须同时满足：命令唯一一次且退出0；五个游戏名称/描述/cover精确；名称无重复；其余8张业务表、migration和uploads不变；无一次性容器残留；db healthy；API保持停止；资源与failed units正常。

任一前置、执行或后置断言失败立即停止。不得自动重跑seed、恢复备份、删除部分游戏、清库、重启API或进入DB-3。保留tool退出码、inspect、日志摘要、数据库只读快照、资源与容器现场；若需要回到pre-DB2状态，只能在新的恢复授权下使用已验证配对恢复点，不能把恢复写入本门禁。

## 7. 当前只读证据

- 本地源码与FIX SHA契约已核对：真实入口、5个游戏、`Game.name @unique`及upsert更新范围一致。
- 仓库外pre-DB2副本四项固定大小和SHA-256均与F6.4-B QA一致；`pg_restore --list`和`tar -tzf`退出0。
- SSH alias解析为deploy/TCP 2222，普通只读连接成功。首次`sudo -n true`失败，说明上批收尾已清除全局timestamp；该停止发生在任何特权读取或生产写入之前。用户随后在自己的终端建立缓存，agent只使用`sudo -n`且未接触密码。
- FIX API与原db是全部两个容器，均running+healthy、OOM=false、restart=0；无第三个、停止或one-off容器。API镜像ID、OCI revision和`10001:10001`匹配FIX身份，端口只绑定`127.0.0.1:3000`；liveness和空分页通过。
- 七个env文件精确存在：六个secret env为`root:root 0600`，`release.env`为`root:root 0644`；未读取或输出任何值。
- 只读事务确认migration为3 total / 3 finished / 0 rolled-back / 0 unfinished；九张业务表均为0，`LIMIT 1 OFFSET 0`帖子分页为0。
- 远端pre-DB2恢复点精确4个文件，大小、SHA、内部清单、manifest、`pg_restore --list`和`tar -tzf`全部通过，并与仓库外副本一致。
- uploads当前文件数和总字节均为0，空树SHA已记录；无migrate、seed、embedding或cleanup写工具运行。
- 只读资源快照：MemAvailable `1033564 kB`、SwapFree `2094564 kB`、磁盘可用`30828617728 bytes`，均高于门禁；failed units为0。
- 首轮综合预检中的SQL使用未附加stdin的`docker exec`，因此没有产生查询行；命令退出0且未执行SQL。随后只补采一次`docker exec -i`只读事务取得上述完整数据库证据，未重跑其他门禁、未修改数据库。

只读预检结束后API与db继续保持原运行状态，没有停止服务、创建tool容器或执行seed。用户随后人工确认D4.5-A1通过，并独立授权D4.5-A2只执行一次DB-2 `seed-games`。A2真实执行与终态见`docs/qa/production-deployment/d4-db2-seed-games-report.md`，现已人工验收通过。D4.5-B继续专指DB-3 `rebuild-tags`，尚未授权或执行。
