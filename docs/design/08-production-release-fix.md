# 生产发布修复批次：API优雅停止与备份路径边界

> 状态：已实施并人工验收通过
> 批次定位：D4.4阻塞后的独立生产发布修复批次，不扩展产品功能，不进入DB-2
> 关联生产候选：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`仍对应当前已迁移生产库与B1，但因生命周期缺陷不再具备发布资格
> 修复候选：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`；其直接父提交为运行时修复`638ba463947ec2e955d9b5a221f7f70473c8fec4`；F4/F5及F6.1～F6.4-A已人工验收通过

## 1. 文档定位与事实优先级

本设计只解决两个已经由本地与生产证据确认的发布阻塞：API不能在SIGTERM后正常退出，以及`backup-pair.sh`在已安装目录中误判备份路径。产品路由、接口、数据语义、Prisma schema/migration、前端行为和AI契约均不改变。

事实优先级为：

1. `docs/design/07-production-deployment.md`的生产架构、安全与授权契约；
2. `docs/plans/07-production-deployment-implementation-plan.md`的D1～D4门禁；
3. `docs/qa/production-deployment/d4-db1-report.md`的生产实测；
4. 当前候选Git对象、镜像与本批本地隔离诊断；
5. 本文对两个阻塞项的窄范围后继覆盖。

## 2. 冻结事实

- 生产库已且仅已执行三条正式migration；B0、B1均已生成并验证。
- 当前生产库、三条migration与B1保持原样，不重跑、回滚、清库或恢复。
- 旧候选的API镜像为linux/amd64、非root运行，生产入口为`node dist/src/main.js`。
- D4.4中默认停止窗口和60秒复验都得到exit 137，`OOM=false`、restart为0。
- 本批本地隔离复现连续两轮得到同一结果：Docker先发送SIGTERM，再在停止窗口后发送SIGKILL，最终exit 137。
- `backup-pair.sh`在源码目录中可工作，但部署到`/srv/black-box/compose/<sha>/scripts`后会把安装根误当源码仓库根，拒绝合法的sibling backup目录。

## 3. 目标与非目标

### 3.1 目标

1. API收到SIGTERM后在10秒内停止接收新请求、关闭Nest HTTP应用、执行Prisma断开并以0退出。
2. 停止过程不得出现SIGKILL、exit 137、OOM或自动重启。
3. `backup-pair.sh`只在备份路径确实位于真实Git工作树内时触发仓库边界拒绝，不再把已安装目录当Git仓库。
4. 保留uploads嵌套、目标重名、写工具运行和失败现场等既有备份安全契约。
5. 从修复提交生成新的`FIX_RELEASE_SHA`，完整重建镜像、bundle、隔离备份/恢复证据，再以独立门禁切换生产API。

### 3.2 非目标

- 不新增健康接口、业务接口、数据库字段或migration。
- 不修改帖子、用户、Search、Chat、SSE、JWT、限流或上传业务语义。
- 不运行生产migration、seed、embedding、AI preflight或cleanup apply。
- 不修改Nginx、证书、DNS、Vercel、安全组、UFW或SSH。
- 不覆盖或清理旧镜像、旧release、旧staging、B0或B1。
- 不借本批清理历史lint债或重构启动架构。

## 4. 根因结论

### 4.1 API优雅停止

证据链：

1. 镜像使用官方Node entrypoint；entrypoint末尾为`exec "$@"`，Node成为容器PID 1。
2. 镜像未声明自定义StopSignal，Docker按默认SIGTERM停止容器。
3. 两轮本地Docker事件都记录了signal 15；主进程在停止窗口内没有退出，随后收到signal 9并以137结束。
4. 两轮均`OOMKilled=false`、`RestartCount=0`，排除OOM和自动重启。
5. `src/main.ts`没有调用`app.enableShutdownHooks()`；Nest未注册应用级SIGTERM关闭链。
6. `PrismaService`只实现`OnModuleInit/$connect()`，没有`OnModuleDestroy/$disconnect()`。
7. 本地安装的`@nestjs/core` 11.1.12实现显示：shutdown hooks完成关闭链并移除框架signal listeners后，默认分支调用`process.kill(process.pid, signal)`；`useProcessExit: true`分支调用`process.exit(0)`。Linux对PID 1的默认终止信号处理具有特殊语义，当前Node又正是容器PID 1，因此不能依赖移除listener后的默认重新发送信号取得可靠退出，更不能满足明确的0退出契约。

因此，SIGTERM确实送达Node PID 1；直接阻塞是应用没有启用Nest shutdown hooks，HTTP/Nest关闭流程没有启动。Prisma缺少销毁钩子是独立资源释放缺口，必须与信号接线一起修复，但不能被描述为SIGTERM没有送达的原因。即使只启用默认hooks，也不能满足本批“容器exit 0”的明确契约，必须使用Nest 11.1.12官方`useProcessExit`选项。

### 4.2 backup路径边界

当前数据流：

```text
脚本路径 /srv/black-box/compose/<sha>/scripts/backup-pair.sh
  -> dirname + ../../..
  -> 推导 repo_root=/srv/black-box
  -> BACKUP_ROOT=/srv/black-box/backups 命中 repo_root/*
  -> 错误拒绝
```

错误在于把“脚本安装位置”当成“真实Git源码仓库”。安装根只是运行制品布局，不具有Git仓库语义。

## 5. API生命周期契约

### 5.1 选定方案

- 在Nest bootstrap中显式调用`app.enableShutdownHooks(['SIGTERM', 'SIGINT'], { useProcessExit: true })`。
- `PrismaService`实现`OnModuleDestroy`，在Nest关闭链中显式等待`$disconnect()`。
- 保持官方Node entrypoint、CMD、默认SIGTERM和Compose restart策略不变。
- `useProcessExit`是Nest 11.1.12公开类型与框架内部实现支持的官方选项：框架等待完整关闭链后调用`process.exit(0)`，符合本批退出码契约。
- 不增加业务代码自定义`process.on`、直接`process.exit`、超时强杀或重复`app.close()`，避免绕过或竞争Nest生命周期。

### 5.2 关闭顺序

```text
Docker SIGTERM
  -> Node PID 1 的Nest shutdown listener
  -> OnModuleDestroy
  -> Prisma $disconnect()
  -> HTTP/application dispose
  -> Nest框架内部 process.exit(0)
```

Nest 11.1.12内部还会按框架顺序执行before-shutdown与application-shutdown hooks；本项目当前没有额外业务钩子改变上述关键资源顺序。`process.exit(0)`只由Nest在全部关闭阶段成功完成后调用，不由业务代码直接调用。

### 5.3 可观察完成条件

- healthy API在`docker stop --time 10`下10秒内结束。
- 连续两轮Docker事件都存在signal 15，不存在signal 9。
- 容器exit code为0，`OOMKilled=false`、restart count不增加。
- 停止后API端口拒绝连接，数据库容器继续healthy。
- Jest锁定Prisma销毁钩子确实调用并等待`$disconnect()`；真实容器测试锁定完整PID 1路径与框架退出语义。

### 5.4 淘汰方案

- **仅延长stop timeout**：已用60秒证伪，不能修复生命周期。
- **增加init包装器**：当前entrypoint已经`exec` Node，信号转发不是根因。
- **仅增加`STOPSIGNAL SIGTERM`**：Docker已经发送SIGTERM，不解决应用不消费信号。
- **Nest官方`useProcessExit: true`**：允许采用；仅在Nest 11.1.12完成destroy、dispose和shutdown hooks后由框架调用`process.exit(0)`。
- **业务代码手写`process.on`、直接`process.exit`、超时强杀或重复`app.close()`**：会绕过或竞争Nest/Prisma关闭顺序，禁止采用。

## 6. backup路径安全契约

### 6.1 概念拆分

- **真实源码仓库边界**：由规范化备份路径的现有祖先目录是否属于真实Git工作树判定，不从脚本相对位置猜测。
- **已安装部署目录边界**：`/srv/black-box`是release、compose、uploads、postgres和backups的宿主分组根，不等于Git仓库；其sibling backups布局被设计允许。

### 6.2 选定判断方式

1. 先以`realpath -m`规范化`BACKUP_ROOT`，以`realpath`规范化`UPLOADS_DIR`。
2. 找到`BACKUP_ROOT`最近的现有祖先目录。
3. 优先使用`git -C <ancestor> rev-parse --show-toplevel`识别真实工作树；若主机没有Git或命令判定“不在工作树”，再沿规范化祖先检查`.git`文件或目录。
4. 只有`BACKUP_ROOT`等于或位于确认的真实Git工作树根内时拒绝。
5. 未检测到真实Git工作树时，不把安装根推断为仓库根。

该方案不新增必需运行时依赖：Git可用时提供权威识别，Git不可用的安装主机仍由`.git`边界检查保护常规工作树。

### 6.3 必须保留的保护

- `BACKUP_ROOT`必须为绝对路径。
- 备份目录不得等于或位于`UPLOADS_DIR`内。
- 同名`.incomplete`或complete目录存在时拒绝，不覆盖。
- migrate、seed-games、rebuild-tags、seed-demo、embedding-backfill任一写工具运行时拒绝。
- API停止后任一步失败，保留`.incomplete`并保持API停止，不声称完全回滚。
- 不删除运行前文件，不用关闭检查、字符串特例或服务器现场改脚本绕过。

### 6.4 淘汰方案

- 删除“仓库外备份”检查：破坏安全契约。
- 硬编码`/srv/black-box/backups`白名单：不可用于本地隔离恢复，也掩盖真实Git边界。
- 使用脚本固定层级推导源码根：安装布局与源码布局语义不同，已被实测证伪。
- 在ECS临时修改脚本：制品不可由Git复现，违反发布溯源。

## 7. 文件职责矩阵

| 文件 | 状态 | 职责 |
| --- | --- | --- |
| `backend/backend/posts/src/main.ts` | 需要修改 | 启用Nest的SIGTERM/SIGINT shutdown hooks及官方`useProcessExit`退出语义 |
| `backend/backend/posts/src/prisma/prisma.service.ts` | 需要修改 | 实现`OnModuleDestroy`并等待Prisma断开 |
| `backend/backend/posts/src/prisma/prisma.service.spec.ts` | 需要新增 | 锁定销毁钩子与`$disconnect()`调用 |
| `deploy/production/scripts/api-shutdown.test.mjs` | 需要新增 | 用Node内建能力编排隔离Docker生命周期RED/GREEN测试 |
| `deploy/production/scripts/backup-pair.sh` | 需要修改 | 以真实Git工作树判定替代安装层级猜测 |
| `deploy/production/scripts/backup-pair.test.sh` | 需要修改 | 增加ECS同构安装布局与真实Git仓库边界fixture，保留既有四类测试 |
| `backend/backend/posts/Dockerfile` | 保持不变 | 当前entrypoint/CMD/默认SIGTERM已正确，不是根因 |
| `deploy/production/compose.yaml` | 保持不变 | 当前默认停止窗口足以作为10秒验收边界 |
| Prisma schema/migrations、package/lockfile、既有e2e | 禁止修改 | 本批无数据或依赖变更 |

## 8. TDD与验证契约

### 8.1 RED

- `api-shutdown.test.mjs`接受`API_IMAGE`与固定PostgreSQL镜像；在仓库外创建唯一网络、数据库和uploads，禁止宿主端口与AI访问。
- 对旧候选先运行：API healthy后发送SIGTERM，测试必须因signal 9/exit 137/非0退出而失败，形成稳定RED证据。
- backup测试在`/srv/black-box/compose/<sha>/scripts`同构fixture中使用sibling backups，旧脚本必须以仓库误判失败。
- 真实临时Git工作树内backup路径必须被拒绝，证明安全边界不是被删除。
- 模拟Git命令不可用时，祖先目录中的`.git`目录与`.git`文件两种工作树标记都必须保守拒绝。

### 8.2 GREEN

- 最小代码修复后，Jest、backup fixture和容器生命周期测试全部通过。
- 生命周期测试必须执行至少两轮，以排除偶发退出。
- 所有一次性Docker资源均使用唯一前缀；失败保留证据但自动停止已知容器，禁止prune。

### 8.3 完整回归

- 后端：Prisma generate → build → 17 suites/既有81条加本批新增测试全部通过；触及TS文件lint 0/0，全量历史债不增加。
- 前端：16 files/53 unit、build、9 files/51 Playwright保持通过；前端无功能修改。
- 部署脚本：Shell语法、LF契约、backup全部fixture、Compose policy、AI preflight离线测试、build-image边界测试。
- 保护：`CLAUDE.md`哈希不变，package/lockfile、schema/migrations、既有e2e无diff，暂存集合只含经审查文件。

### 8.4 F2实现状态

F2已按第6章契约完成最小实现与自动验证，并已通过用户人工验收：

- `BACKUP_ROOT`先规范化，再向上寻找最近的现有目录；不再根据脚本安装层级猜测仓库根。
- Git可用时，对该现有祖先使用`rev-parse --is-inside-work-tree`确认真实工作树；确认在工作树内即拒绝。
- Git不可用或无法确认时，沿规范化祖先检查`.git`目录或worktree式`.git`文件并保守拒绝。
- ECS同构安装目录下的sibling backups允许执行；真实Git工作树及两类无Git回退均在任何Docker写动作前拒绝。
- 原有绝对路径、uploads嵌套、目标重名、运行中写工具、API停写、失败保留、manifest/SHA与恢复身份逻辑未修改。

RED/GREEN与静态证据见`docs/qa/production-release-fix/f2-backup-path-report.md`。

### 8.5 F3实现与提交状态

- 完整回归、差分lint、部署脚本门禁和两组cached diff审查均已完成，证据见`docs/qa/production-release-fix/f3-regression-report.md`。
- 运行时修复已提交为`638ba463947ec2e955d9b5a221f7f70473c8fec4`，message为`fix(runtime): shut down API gracefully`。
- backup路径边界修复已提交为`72350a77acf59ad179b9a89b19544c162033e0ae`，message为`fix(deploy): preserve backup path boundaries`；该提交的直接父提交是上述运行时修复。
- 第二条提交的完整SHA正式成为`FIX_RELEASE_SHA`。当前Git index为空；08设计、实施计划、QA与planning仍留在工作树，未混入两条运行代码提交。
- F3收口当时F4尚未开始；正式镜像、archive、bundle、隔离Compose与恢复证据必须等待独立施工授权后从该SHA重建。

### 8.6 F4首次执行状态

- 仓库外detached clean worktree已精确指向`FIX_RELEASE_SHA`；临时linux/amd64 build-stage镜像、Prisma generate、后端build和Sharp linux-x64加载均通过。
- Linux全量Jest发现18 suites；17 suites与80个已执行tests通过，`ai.controller.spec.ts`因本批测试`TOKEN_SECRET`含环境校验器禁止的弱占位词而在加载阶段失败，未达到18 suites / 82 tests门禁。
- 按失败即停契约，未自动更换测试值重跑，未构建正式镜像或生成任何正式发布制品。证据见`docs/qa/production-release-fix/f4-local-artifact-rebuild-stoppage.md`。
- 该首次停止点当时保持F4暂停；F5、ECS、生产环境、AI与Git提交均未触及。

Linux Jest恢复授权后，同一临时镜像以进程内随机强密钥完成唯一重跑，达到18 suites / 82 tests；`demo-seed-files.spec.ts`与Sharp linux-x64均有明确证据。随后前端16/53、build、9 files/51 Playwright及四类D1门禁通过。Backup fixture因默认`bash`解析到WSL且其执行PATH中无Node而在manifest断言阶段停止，未形成8项完整结果；按门禁未自动切换Git Bash重跑。该第二次停止点尚未构建正式镜像与制品。

### 8.7 F4最终自动门禁状态

- 经后续持续授权，Backup fixture明确改用Git for Windows Bash后达到8 passed；未修改脚本、测试或系统配置。
- 正式linux/amd64镜像只构建一次，OCI revision精确等于`FIX_RELEASE_SHA`；非root、入口、healthcheck、原生依赖、3个migration、lock、4个脚本与10个fixtures均通过内容审计。
- 正式镜像连续两轮SIGTERM均在300ms内exit 0，只记录signal 15，无signal 9、OOM或restart；数据库持续healthy，停止后HTTP不可达。
- image archive、build manifest、直接Git object bundle与LF `SHA256SUMS`均已生成并记录大小/SHA。bundle 20个文件、0 symlink；3个Shell与blob逐字节一致，安全扫描无真实凭据或部署身份。
- 完整证据见`docs/qa/production-release-fix/f4-local-artifact-rebuild-report.md`。用户已人工确认F4通过；固定正式镜像ID为`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`。F5仅使用该SHA、镜像和同源制品建立全新隔离source/restore现场，不混用历史候选资产。

### 8.8 F5首次执行暂停

- F5前置身份、镜像、worktree、端口与Docker资源门禁通过；随后仅创建仓库外全新source/restore空目录和本地运行日志。
- QA编排脚本在生成env、启动容器或连接数据库前，因Bash `set -u`检测到同一条`local`声明引用尚未完成赋值的局部变量而退出。
- 按“任一写步骤失败即停止且不自动重试”契约，未修正后重跑。env文件、容器、网络、端口监听、数据库文件、uploads、备份与AI调用均为0；失败现场原样保留。
- 该停止点不影响F4人工验收结论，也不产生migration/seed/restore证据。F5继续需要独立恢复授权。

### 8.9 F5恢复执行与自动门禁状态

- 用户独立授权恢复后，仅拆分QA脚本中`base`与`env_dir`的局部变量赋值；首次空现场和失败日志保持原样，恢复运行使用新的仓库外根目录。
- source严格单次执行`migration → seed-games → rebuild-tags → seed-demo`，达到3条migration、5用户、35帖子、13评论、31点赞、10文件记录、5游戏、5标签、0 embedding，每个游戏7篇；未执行AI相关服务。
- 修复后的候选`backup-pair.sh`在安装目录同构布局中成功生成唯一配对备份，dump、uploads归档、manifest、内部SHA、`pg_restore --list`与tar可读性均通过。
- restore使用独立project、数据库、uploads与端口，未预跑migration或seed，直接恢复后数据库状态、游戏分布、3条migration、21个媒体/哨兵文件逐SHA与source一致。
- source与restore API分别在504ms与564ms内响应SIGTERM并exit 0；均只有signal 15、没有signal 9，OOM=false、restart=0，数据库持续healthy，停止后HTTP不可达。
- 两个Compose project均已`down --remove-orphans`且未使用`-v`；容器、网络和3112/3113监听为0。数据、uploads、备份、制品、首次失败现场与成功证据保留供人工验收。
- 完整证据见`docs/qa/production-release-fix/f5-isolated-restore-report.md`。用户已人工确认F5通过；该结论只授权进入F6.1只读门禁，不授权F6.2上传或任何远端写入。

## 9. 新候选制品链

修复提交后产生新的受控参数`FIX_RELEASE_SHA`。旧SHA、旧镜像、旧archive和旧bundle不得混入。

必须从`FIX_RELEASE_SHA`的仓库外detached干净worktree串行重建：

1. 两端unit/Jest、build、差分lint与9 files/51 Playwright。
2. linux/amd64 API镜像，核对非root、入口、healthcheck、OCI revision、3个migration目录、`migration_lock.toml`、4个脚本和10个fixtures。
3. 新镜像的两轮SIGTERM容器测试，exit 0且无SIGKILL。
4. 直接从Git对象生成deployment bundle、LF `SHA256SUMS`、archive和manifest。
5. 全新source/restore隔离Compose；仅在source执行migration和非AI seed。
6. 使用修复后的`backup-pair.sh`生成配对备份；restore不得预跑migration/seed，直接恢复并核对数据库、migration、媒体与sentinel。
7. 保留新现场供人工验收，不prune、不复用旧候选现场。

## 10. 生产上传、切换与回滚

### 10.1 上传门禁

- 新SHA使用全新release、compose和staging路径；不覆盖旧路径。
- 上传、SHA校验、bundle审计、`docker load`和固定PostgreSQL镜像身份核对分别留证。
- 旧镜像、旧release、B0、B1全部保留。

### 10.2 数据库边界

- 生产库不执行`prisma migrate deploy`，不运行seed或AI。
- F6.1已使用旧候选镜像对生产库执行一次只读`prisma migrate status`，用于新镜像导入前的数据库基线；该次调用已完成且不得重跑。
- F6.3只允许使用`FIX_RELEASE_SHA`新镜像再执行一次只读`prisma migrate status`，用于新镜像与既有生产库的兼容确认；该次调用与F6.1用途、镜像身份和证据独立。
- 两次status均为只读；生产库始终禁止`prisma migrate deploy`、`dev`、`resolve`、`reset`或任何seed。不得把“两次各自唯一”缩写为“生产环境总共只执行一次status”。
- 数据表计数和关键只读接口用于兼容性核对，不写业务数据。

### 10.3 切换顺序

1. 记录旧release配置和容器身份；确认B0/B1可读。
2. 原子切换非secret release引用到新镜像，启动API，验证loopback liveness与Prisma只读分页。
3. 对新API执行一次10秒SIGTERM验收；确认exit 0后重新启动并验证healthy。
4. 使用新脚本创建新的配对恢复点，独立验证后再恢复API。
5. 整个过程不开放公网端口，不进入Nginx/Vercel切流。

### 10.4 回滚边界

- 本批没有schema变化，镜像回滚不需要数据库回滚。
- 新API在切换门禁失败时先停止并保留日志；经独立授权可原子恢复旧release引用并启动旧镜像。
- 旧镜像存在已知优雅停止缺陷，只作为受控应急回滚目标；不得宣称其恢复发布资格。
- 不自动restore B0/B1，不删除失败的新release/镜像，不覆盖证据。

## 11. 分批实施与门禁

| 批次 | 内容 | 完成条件 |
| --- | --- | --- |
| F0 | 冻结现状与RED诊断 | 两轮137、PID1/事件链、ECS同构backup误判均留证 |
| F1 | API生命周期TDD与最小修复 | Jest与旧/新镜像RED/GREEN闭环 |
| F2 | backup边界TDD与最小修复 | 安装布局允许、真实Git内拒绝、既有保护全通过 |
| F3 | 全量回归、差分审查与修复提交 | 用户审查暂存集合并单独授权commit，产生`FIX_RELEASE_SHA` |
| F4 | 新SHA镜像/bundle重建 | 同SHA身份、LF、安全与SIGTERM证据通过 |
| F5 | 新SHA隔离Compose备份/直接恢复 | source/restore一致且无AI调用 |
| F6 | ECS上传、只读兼容、切换与回滚验证 | 无生产migration，API exit0，恢复点可读，旧资产保留 |

任何批次失败立即停止并保留现场；后续批次不会因前一批设计确认而自动获得写入、费用、提交或ECS授权。

## 12. 最终验收清单

- [x] 旧候选RED可重复，且被明确标记为不具备发布资格。证据：`docs/qa/production-release-fix/root-cause-report.md`、`f1-api-lifecycle-report.md`。
- [x] 新候选两轮SIGTERM均10秒内exit 0，无signal 9、137、OOM或restart。证据：`docs/qa/production-release-fix/f4-local-artifact-rebuild-report.md`；生产单次复核见`f6-4a-api-switch-report.md`。
- [x] 停止后HTTP不可达，Prisma销毁钩子已执行，数据库仍healthy。证据：`docs/qa/production-release-fix/f1-api-lifecycle-report.md`、`f4-local-artifact-rebuild-report.md`、`f6-4a-api-switch-report.md`。
- [x] ECS同构backup路径成功，真实Git仓库内路径仍被拒绝。证据：`docs/qa/production-release-fix/f2-backup-path-report.md`、`f5-isolated-restore-report.md`、`f6-4b-pre-db2-backup-report.md`。
- [x] uploads、重名、写工具、失败现场保护没有弱化。证据：`docs/qa/production-release-fix/f2-backup-path-report.md`、`f5-isolated-restore-report.md`及`f4-local-artifact-rebuild-stoppage.md`。
- [x] 两端测试/build/lint、9 files/51 Playwright和部署脚本测试全部达到既有基线。证据：`docs/qa/production-release-fix/f3-regression-report.md`、`f4-local-artifact-rebuild-report.md`；Windows Application Control停止证据保留于`f3-regression-stoppage.md`，未改写为首次全通过。
- [x] 新镜像、archive、bundle、manifest和隔离restore均来自同一`FIX_RELEASE_SHA`。证据：`docs/qa/production-release-fix/f4-local-artifact-rebuild-report.md`、`f5-isolated-restore-report.md`、`f6-2-artifact-import-report.md`。
- [x] F6.1旧镜像基线status与F6.3新镜像兼容status各执行一次且均只读；生产库没有执行`migrate deploy`或重跑migration。证据：`docs/qa/production-release-fix/f6-1-ecs-readonly-gate-report.md`、`f6-3-db-compatibility-report.md`。
- [x] 旧镜像、旧release、B0/B1及“F6 release / pre-DB2”恢复点均未覆盖或清理。证据：`docs/qa/production-release-fix/f6-4a-api-switch-report.md`、`f6-4b-pre-db2-backup-report.md`。
- [x] `CLAUDE.md`及受保护工作树未被本批覆盖，无secret、真实endpoint、域名、公网地址或私钥路径写入08文档与QA。证据：`docs/qa/production-release-fix/f3-regression-report.md`、`f4-local-artifact-rebuild-report.md`、`f6-1-ecs-readonly-gate-report.md`、`f6-2-artifact-import-report.md`、`f6-3-db-compatibility-report.md`、`f6-4a-api-switch-report.md`及`f6-4b-pre-db2-backup-report.md`。

用户已于2026-07-23最终确认08生产发布修复批次人工验收通过。历史RED、环境差异、暂停与授权恢复证据全部保留，不表述为首次执行即全绿。下一步返回07部署计划的D4.5 DB-2 `seed-games`独立方案/数据库写入授权门禁。
