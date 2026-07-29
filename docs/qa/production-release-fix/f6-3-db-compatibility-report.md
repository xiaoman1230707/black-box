# F6.3 新镜像生产数据库兼容只读门禁报告

> 状态：已实施，用户人工验收通过

## 1. 两次status的独立口径

- F6.1：旧候选镜像导入新镜像前的生产库基线status，已只读执行一次，不得重跑。
- F6.3：固定`FIX_RELEASE_SHA`新镜像的生产库兼容status，只允许只读执行一次。
- 两者用途和镜像身份不同；生产库始终禁止`migrate deploy`及其他写入型migration命令。

## 2. F6.3固定命令

执行前脚本将静态断言实际命令精确为：

```text
node node_modules/prisma/build/index.js migrate status --schema prisma/schema.prisma
```

命令不得包含deploy、dev、resolve、reset或seed。一次性容器使用`--rm --no-deps -T`，并强制覆盖`API_IMAGE`为固定新镜像ID，不修改生产env文件。

## 3. 当前执行门禁

F6.2收尾已通过`sudo -K`清除全局timestamp，因此agent当前不能使用`sudo -n`执行本门禁。用户需在自己的deploy终端重新执行`sudo -v`建立缓存；agent不读取、索取或传递密码。缓存建立前不连接ECS、不创建兼容容器，也不执行status。

用户建立缓存后，首次F6.3会话完成了双容器白名单锁定，随后在合并的release/compose/env存在性检查处停止。该检查以deploy身份直接执行`-f /etc/black-box/release.env`；`/etc/black-box`是root保护目录，deploy无法遍历，因此权限结果被错误合并为`FIX release or compose identity missing`。

停止发生在静态status命令输出和`docker compose run`之前：

- F6.3新镜像status执行次数仍为0；
- 未创建一次性兼容容器；
- 未连接或读取生产数据库；
- 未执行migration、seed、restore、AI或cleanup；
- 未修改release、compose、env、容器、镜像或网络状态。

本地脚本仅把三个受保护路径检查拆分为独立的`sudo -n test`，并把release文件计数改为sudo只读执行；没有改变status命令或数据库契约。按异常即停要求未自动重跑。恢复后仍只允许执行一次F6.3 status。

## 4. 恢复执行结果

用户授权恢复后，受保护路径检查、双容器白名单、新release/compose和固定新镜像身份全部通过。静态命令检查输出：

```text
node node_modules/prisma/build/index.js migrate status --schema prisma/schema.prisma
```

确认不含deploy、dev、resolve、reset或seed后，使用固定新镜像执行F6.3唯一一次status，结果：

- `PRISMA_MIGRATE_STATUS_EXIT=0`；
- Prisma识别3条migration且schema up to date；
- SQL复核migration总数3、finished 3、pending 0、rolled-back 0；
- 9张业务表总行数0；
- `LIMIT 1 OFFSET 0`只读分页结果0；
- `DB2_EXECUTED=false`。

一次性兼容容器使用`--rm`并在终态清零。最终Docker容器仍精确为原生产db和已知停止旧API；运行中仅db，db继续healthy、OOM=false、restart=0，旧API保持exited 137、OOM=false、restart=0。API未启动。

本批没有执行`migrate deploy`、seed、restore、embedding、cleanup或AI，没有修改数据库、secret、网络、Nginx、证书、DNS、Vercel、UFW或安全组。

## 5. sudo与连接收尾

- `sudo -K`退出码0；
- 随后的`sudo -n true`退出码1，证明全局timestamp已清除；
- SSH会话关闭后进入F6.3人工验收门禁，不自动进入F6.4。

用户已于2026-07-23人工确认F6.3通过，并独立授权仅执行F6.4-A生产API切换、只读健康核验和一次SIGTERM验收；该授权不覆盖F6.4-B生产配对备份。
