# 生产发布修复调研发现

## 已冻结事实

- 生产D4.4唯一一次migration和B1有效，DB-2禁止。
- API默认停止与60秒停止均exit 137，OOM=false、restart=0。
- 旧候选镜像ID为`sha256:642f6ffee0a488046876df3f056234e9136c36df34efbc8347c30acc1559e2f9`，linux/amd64，运行用户`10001:10001`。

## API初步代码与镜像映射

- 镜像实际入口为官方Node镜像的`docker-entrypoint.sh`，命令为`node dist/src/main.js`，未声明自定义StopSignal。
- Dockerfile的entrypoint脚本最终以`exec`运行Node，因此Node是容器PID 1；需以运行时证据再次锁定。
- `main.ts`未显式调用`app.enableShutdownHooks()`，`PrismaService`只实现`OnModuleInit/$connect()`，未实现`OnModuleDestroy/$disconnect()`。
- 以上只说明缺少明确生命周期契约，不足以单独证明SIGTERM未送达；必须结合Docker事件、PID1与信号后存活证据。

## API本地隔离复现结论

- 使用旧候选镜像与仓库外一次性PostgreSQL/网络连续复现两轮；API每轮先达到healthy，未发布宿主端口，未调用AI。
- 镜像entrypoint最终执行`exec "$@"`，容器主命令为`node dist/src/main.js`，因此Node是容器PID 1；镜像未声明自定义StopSignal，Docker使用默认SIGTERM。
- 两轮Docker事件均依次出现`kill signal=15`、超时后的`kill signal=9`和`die exitCode=137`；停止耗时分别约3.3秒与3.2秒，`OOMKilled=false`、`RestartCount=0`。
- 这证明SIGTERM已经送达容器主进程，但应用未进入可完成的退出链；不是信号未送达、OOM或自动重启。
- 结合代码，直接根因是Nest未启用shutdown hooks，Node作为PID 1在没有应用SIGTERM监听器时持续存活，HTTP/Nest关闭链没有启动。Prisma缺少`OnModuleDestroy/$disconnect()`是必须同时补齐的独立资源关闭缺口，但不是SIGTERM未送达的原因。
- 本地`@nestjs/core` 11.1.12实现核对：cleanup完成并移除框架signal listeners后，默认分支执行`process.kill(process.pid, signal)`；`useProcessExit: true`分支执行`process.exit(0)`。Node是容器PID 1，默认终止信号语义不能保证退出，更不保证0退出；因此选定方案必须显式传入该官方选项。
- 复现证据保存在本批planning目录；诊断脚本曾有PowerShell兼容/转义失败，均在候选停止动作前或以唯一前缀精确清理，并已如实保留。

## Backup初步数据流

- 脚本以`dirname(BASH_SOURCE[0])/../../..`推导`repo_root`。
- 源码布局中脚本位于`<git-root>/deploy/production/scripts`，推导正确。
- ECS安装布局中脚本位于`/srv/black-box/compose/<sha>/scripts`，同一算法推导为`/srv/black-box`，于是合法的`/srv/black-box/backups`被误判为源码仓库内部。
- 修复不能删除仓库边界检查；需要把“真实Git源码根”和“安装根”作为不同概念显式表达并测试。

## Backup同构fixture结论

- 在无网络容器内构造`/srv/black-box/compose/<sha>/scripts/backup-pair.sh`、sibling uploads/backups，与ECS安装布局一致。
- 当前脚本将脚本目录向上三级推导为`/srv/black-box`，随后把`/srv/black-box/backups`命中`repo_root/*`，以exit 2和`BACKUP_ROOT must be outside the repository`停止。
- 误判发生在“从安装位置猜源码仓库根”这一数据流，不是`realpath`、uploads嵌套、重名或写工具保护造成。
- 推荐修复是对规范化后的`BACKUP_ROOT`向上检查真实Git工作树标记/根；只有确实位于Git工作树内才拒绝。安装目录不是源码仓库，允许其sibling backups；uploads嵌套、同名目录、写工具运行检查全部保留。
- 测试矩阵还必须覆盖Git命令不可用时的保守回退：祖先`.git`目录与worktree式`.git`文件都拒绝；不得因环境没有Git而放过真实源码路径。

## F3提交链终态

- 运行时生命周期修复提交为`638ba463947ec2e955d9b5a221f7f70473c8fec4`。
- backup路径边界修复提交为`72350a77acf59ad179b9a89b19544c162033e0ae`，其直接父提交为上述运行时修复。
- 第二条提交的完整SHA成为`FIX_RELEASE_SHA`；F4尚未启动，正式制品仍需从该SHA的仓库外detached干净worktree重建。

## F4首次门禁发现

- 现有环境校验不仅要求`TOKEN_SECRET`长度达到32，还会拒绝常见弱占位词；隔离测试夹具也必须满足该契约。
- 临时linux/amd64 build-stage镜像已证明新SHA可完成后端build、Prisma generate并加载Sharp linux-x64；当前暂停不是Windows Application Control或native module问题。
- Jest 30通过pnpm脚本转发参数时，`pnpm test -- --runInBand`会把参数落入文件模式；权威执行应使用`pnpm exec jest --runInBand`或与项目脚本兼容的等价形式。

## F4 Backup执行环境发现

- 当前PowerShell中的无路径限定`bash`解析到Windows System32的WSL launcher，而不是Git for Windows Bash。
- `backup-pair.test.sh`需要Node完成manifest JSON断言；WSL环境在脚本收敛PATH后没有Node，导致测试在第143行停止，不能代表backup逻辑fixture失败。
- Git for Windows Bash已安装。恢复时应明确指定其完整可执行文件路径，避免改变脚本、WSL或系统PATH。

## F4最终制品结论

- `FIX_RELEASE_SHA`可从detached clean worktree唯一构建正式linux/amd64镜像，OCI revision与SHA一致；F1生命周期修复在正式镜像两轮均得到exit0证据。
- deployment bundle必须继续由Git object直接生成；本批3个Shell的blob与bundle哈希完全一致且CR为0。
- 安全扫描需要区分真实部署凭据与已审查的env example：真实env文件、私钥/key、生产域名和非占位数据库凭据必须为0；公共供应商示例地址、`.invalid`与明确占位值不是secret。
- F4只建立本地发布制品资格；F5数据库初始化、配对备份和直接恢复仍是独立写入门禁。

## F4人工验收与F5身份边界

- 用户已人工验收通过F4。F5固定复用正式镜像ID`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`，不得使用临时测试镜像或历史候选资产。
- F5不重新构建制品；source与restore必须是全新且相互隔离的仓库外现场，恢复栈不得预跑migration或seed。

## F5首次停止点

- Bash启用`set -u`时，`local base=... env_dir="$base/env"`在同一条声明中不会保证第二个赋值看见第一个局部变量；因此QA编排在任何env或Docker写入前以`base: unbound variable`退出。
- 该错误属于QA编排脚本，不是候选应用、Compose、migration、seed或backup逻辑失败。严格停止意味着当前不能据此声称F5链路已验证，也不能未经新授权修正后重跑。

## F5隔离恢复结论

- 修复后的`backup-pair.sh`在仓库外安装同构布局中允许sibling backups，同时保留内部Git、uploads嵌套、同名目录和写工具运行保护；本次唯一完整备份成功证明原生产阻塞已关闭。
- restore在未预跑migration/seed的空数据库上可直接恢复custom dump；3条migration、业务计数、5×7游戏分布、21个媒体/哨兵SHA全部与source一致。
- 新候选API在source/restore真实Compose中均可于1秒内完成SIGTERM exit0，证明F1生命周期修复与F2 backup边界修复可在同一正式镜像和制品链中协同工作。
- QA轮询在API刚启动时各观察到一次`Empty reply from server`，随后稳定锚点成功；属于就绪轮询过程，不是最终请求失败或无限等待。

## F6.1首次连接观察

- 用户权限下`black-box-ecs`仍解析为deploy与2222；沙箱身份的默认22结果只是未读取用户SSH配置，必须在正确权限上下文核对后才可连接。
- PowerShell native pipeline不适合作为Base64脚本的字节身份传输证明；恢复应使用不会改写payload的二进制stdin方式，并在连接前本地验证字节SHA。
- deploy全局sudo缓存已失效，`sudo -n`正确拒绝。只读门禁依赖root权限读取UFW/Docker/sshd，因此用户未自行建立缓存前不能继续，也不能以修改sudoers规避。
- 实例内无法证明阿里云安全组控制面是否仍为唯一来源/2222；本机无阿里云CLI。该项必须引用用户当次控制台只读核对，不得把UFW结果冒充安全组证据。

## F6.1恢复执行观察

- 使用`cmd`原始文件重定向后，stdin字节传输正常，首次Base64管道问题不再出现；deploy、sudo、sshd、UFW和服务前置检查均实际执行并通过。
- 当前停止点位于资源阈值组，而不是SSH、sudo、UFW、Docker/containerd、Nginx、failed units或reboot marker。
- 资源断言采用先全部断言、后统一输出的结构，非零退出时不会暴露具体数值。现有证据只能把故障域收敛至Swap总量、Swap可用、MemAvailable、磁盘可用或swappiness之一，不能无证据指定根因。
- 若获得新的只读诊断授权，应先单独采集这五项数值并与既定阈值比较；在此之前不得继续旧资产、B0/B1或数据库检查，也不得进入F6.2。

## F6.1资源诊断结论

- 当前底层`/swapfile`精确2GiB，内核swapon有效SIZE少4096 bytes；这是已登记的Swap header页差异。
- 旧完整门禁把swapon SIZE与整数2GiB直接作`>=`比较，因此必然在正常Swap状态下误拒绝；正确审计需同时锁定底层文件精确大小及有效容量仅一个header页容差，不能简单删除Swap保护。
- SwapFree约2GiB、MemAvailable约1.07GiB、磁盘可用约29.49GiB、swappiness=10，均满足门禁。
- D3.6最终报告的单行数值标签与D3.3原始语义及本次实测冲突；应在后续审计口径修正时补充事实注释，但不得改写历史证据。

## F6.1路径枚举权限观察

- 七个持久目录权限检查本身通过；其中uploads/postgres/backups按正式契约不允许deploy直接遍历。
- 审计脚本随后使用非特权`find /srv/black-box`跨越这些目录，在`pipefail`下必然因permission denied停止；这与目录权限正确并不矛盾。
- 最小修正应保留全部旧/新SHA存在性断言，仅让两处路径枚举通过已验证的`sudo -n`执行；不得修改目录权限、给deploy扩权或跳过受保护目录。
- B0/B1位于同一`root:root 0700`备份边界，完整性读取同样必须显式使用`sudo -n`；让deploy直接遍历会把正确的权限收敛误报为备份异常。
- `/etc/black-box`同样为`root:root 0700`；env存在性检查必须用`sudo -n test -f`且禁止输出内容。把secret目录改为deploy可遍历不是可接受修复。
- 通过SSH stdin执行包含`docker compose run`的审计脚本时必须加`-T`；否则Compose会继承并消费脚本剩余stdin，即使命令本身成功，也会造成后续审计静默缺失。
- `docker compose exec -T`也不会自动关闭stdin；SSH stdin脚本内执行只读SQL时还必须显式使用`</dev/null`，否则首个exec会吞掉后续审计文本。

## F6.1最终结论

- 精确Swap四层一致性、正式受保护目录的root只读审计，以及Compose stdin隔离是本次F6.1可靠执行的三个关键口径。
- 生产库与旧资产无漂移：3条migration完整、9表为空、B0/B1可读、仅db运行；新FIX SHA远端路径和镜像均不存在。
- `prisma migrate status`只执行一次且退出0；后续只重复无副作用SQL核对，不重复status或任何写命令。

## F6.4-A生产切换结论

- 修复镜像已在生产Compose中替换旧停止API对象；旧对象在替换前完成脱敏inspect、日志和身份归档，旧镜像、旧release、B0/B1未删除或覆盖。
- Nest官方`useProcessExit`与Prisma销毁钩子在生产环境得到唯一一次SIGTERM验证：483ms内exit 0、仅signal 15、无强杀/OOM/restart，且db持续healthy。
- 新API重启后继续使用固定FIX镜像并healthy，仅绑定宿主loopback；liveness和真实Prisma空分页均通过。F6.4-B生产配对备份尚未执行，不能把切换证据目录当作备份恢复点。

## 08最终关闭结论

- F6.4-B已建立独立“F6 release / pre-DB2”远端与本地配对恢复点，未命名为B2/B3；API恢复后FIX API与原db均healthy。
- 生产库仍只有三条已完成migration，九张业务表为空，DB-2未执行。B0、B1、pre-DB2恢复点、旧镜像/release、F4/F5现场及失败证据均保留。
- 用户已最终人工验收通过08批次；下一步仅为07部署计划D4.5 DB-2 `seed-games`施工方案/独立数据库写入授权门禁。
