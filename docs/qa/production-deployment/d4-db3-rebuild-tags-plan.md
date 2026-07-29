# D4.5-B / DB-3 `rebuild-tags`施工方案与只读预检

> 状态：方案、只读预检与DB-3唯一写入均已人工验收通过；B2已获独立备份授权
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 范围与停点

本门禁只设计DB-3内容类型目录初始化并核对生产只读基线。本轮没有运行`rebuild-tags`、没有创建tool容器、没有写数据库或uploads，也没有创建B2。

DB-3不得与`seed-demo`、embedding、AI preflight、cleanup、migration或restore合并。API继续停止，原PostgreSQL保持healthy。方案/预检通过不构成DB-3写入或B2备份授权。

## 2. 真实脚本契约

- 编译后入口：`node dist/src/scripts/rebuild-tags.js`。
- Compose服务：`rebuild-tags`；只读取`database.env`，只加入内部`db_net`，`read_only: true`、`restart: "no"`，无uploads挂载和外网网络。
- 目标唯一键：`Tag.name @unique`；关联表`PostTag`以`postId + tagId`为联合主键。
- 五个固定内容类型：`资讯`、`攻略`、`求助`、`评测`、`活动`。
- 写入顺序固定为：
  1. `prisma.postTag.deleteMany({})`；
  2. `prisma.tag.deleteMany({})`；
  3. `prisma.tag.createMany({ data: CONTENT_TYPES, skipDuplicates: true })`；
  4. 只读查询并输出最终Tag。
- 上述步骤没有外层Prisma transaction。源码注释称“幂等”仅描述理想完整重跑结果，不构成生产自动重跑许可；删除完成后创建失败会留下空或部分Tag状态。
- FIX Git blob、当前审计文件与部署Compose/backup工具逐blob一致，未从脏工作树替换候选实现。

## 3. 写入前数据与服务矩阵

| 对象 | 已完成只读预检 | 正式执行前必须再次确认 |
| --- | --- | --- |
| FIX identity | release SHA、API镜像、OCI身份匹配 | 不得漂移 |
| API | stopped，exit 0、OOM=false、restart=0 | 继续停止 |
| db | 原容器ID不变，running+healthy、OOM=false、restart=0 | 运行中服务精确只有db |
| migration | 3 total / 3 finished / 0 rolled-back / 0 unfinished | 完全一致 |
| Game | 5，名称/描述精确匹配批准集合，重复0、非空cover 0 | 完全一致 |
| Post / PostTag / Tag | 0 / 0 / 0 | 三项必须同时为0 |
| 其他业务表 | User、Comment、UserLikePost、Avatar、File均为0 | 保持0 |
| uploads | 0文件 / 0字节 | 保持不变 |
| tool | 无运行中migrate/seed/rebuild/embedding | 只允许唯一rebuild-tags one-off |

完整预检还确认MemAvailable、SwapFree和磁盘高于既定阈值，80/443/3000/5432无监听，failed units为0。

## 4. 唯一正式命令

取得独立DB-3写入授权后，只允许调用一次：

```text
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T rebuild-tags
```

正式调用不通过包含后续命令的SSH stdin编排，避免Compose消费stdin而丢失退出证据。开始前单独记录容器/events游标；调用后记录命令退出码、stdout摘要、one-off create/start/die/destroy事件和最终只读数据。任何异常不得再次调用该命令。

## 5. 成功验收矩阵

| 对象 | 成功终态 |
| --- | --- |
| Tag | 精确5条：资讯、攻略、求助、评测、活动；名称唯一 |
| PostTag | 0 |
| Game | 原5条名称、描述和空cover不变 |
| Post / User / Comment / UserLikePost / Avatar / File | 全部0 |
| migration | 3/3 finished，无failed或rolled-back |
| uploads | 0文件 / 0字节 |
| rebuild-tags tool | exit 0并删除，无其他one-off残留 |
| API / db | API继续停止；原db running+healthy、无OOM/restart |
| 网络/主机 | 80/443/3000/5432无监听，资源满足阈值、failed units为0 |

DB-3写入和上述只读核验完成后必须停在人工验收门禁，不自动创建B2或进入`seed-demo`。

## 6. 失败停止与恢复边界

任一前置、命令、事件或写后断言失败立即停止。保留tool退出码、日志、events、数据库只读快照和容器现场；API保持停止。禁止自动重跑、补写缺失Tag、手工清表、执行restore或进入DB-4。

当前最近的完整恢复点是“F6 release / pre-DB2”，位于`seed-games`之前。若DB-3失败，恢复只能在新的DB/R授权下使用该配对恢复点；恢复会同时撤销已验收的5个Game并回到九张业务表全空状态。随后必须重新独立授权、执行并验收DB-2，才能再次规划DB-3。不得把该恢复点描述成只回滚Tag的pre-DB3恢复点。

## 7. B2配对恢复点方案

B2只在DB-3成功、写后只读矩阵完整通过并获用户人工验收后，取得独立备份/下载授权再创建。B2是pre-demo恢复点，不与DB-3写命令合并。

1. 再次确认API停止、db healthy、5 Game + 5 Tag、其他业务数据为空、uploads为空、无写工具运行。
2. 仅使用FIX release内已验证的`backup-pair.sh`，以唯一`BACKUP_ROOT=/srv/black-box/backups/B2`创建database custom dump与uploads tar配对恢复点；禁止同名complete或`.incomplete`。
3. Manifest必须记录FIX SHA、API镜像ID、PostgreSQL镜像身份、3条migration、database/uploads绝对路径、大小与SHA-256；B2目录和QA明确标识`post-DB3 / pre-demo`。
4. 远端执行内部`SHA256SUMS`、`pg_restore --list`、`tar -tzf`及manifest字段一致性校验。
5. 使用默认SFTP下载`database.dump`、`uploads.tar.gz`、`manifest.json`、`SHA256SUMS`到仓库外全新本地B2目录；不用legacy SCP、不覆盖既有备份。
6. 本地逐项比较大小/SHA，并重新运行`pg_restore --list`、tar可读性和manifest语义检查。
7. B2完成后API仍保持停止，db healthy；停在DB-4 `seed-demo`独立方案/数据库与文件写入授权门禁。

备份任一步失败时保留`.incomplete`和API停止状态，不自动重试、删除、恢复或启动API。

## 8. 本轮只读预检证据

- 仓库外pre-DB2副本四项大小/SHA与既有F6.4-B证据一致；`pg_restore --list`和tar可读性通过。
- ECS最终审计退出0：FIX与原db身份匹配，API停止，运行中仅db，无one-off；远端pre-DB2四文件、内部SHA、dump和tar完整。
- migration为3/3/0/0；Game=5且精确集合匹配；Post=0、PostTag=0、Tag=0，其余业务数据和uploads为0。
- 资源终值：MemAvailable `1105844 kB`、SwapFree `2094564 kB`、磁盘可用`30828531712 bytes`；受保护端口无监听，failed units为0。
- 前三次审计分别因变量名冲突、locale排序和Base64换行停止；均未执行写入。第四次完整断言曾在完成标记后受PowerShell管道尾部CR影响退出；最后以原始字节流传输同一脚本取得退出0。所有失败证据均保留，未改写成首次通过。

DB-3唯一写入已执行一次并以退出码0完成，写后矩阵、唯一one-off事件链及用户人工验收均通过，详见`docs/qa/production-deployment/d4-db3-rebuild-tags-report.md`。用户已独立授权B2配对恢复点创建与下载；`seed-demo`、embedding、AI、cleanup、migration和restore仍未授权或执行。
