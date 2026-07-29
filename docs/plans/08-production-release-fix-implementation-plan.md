# 生产发布修复批次实施计划

> 状态：F0～F6全部完成并人工验收通过；`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`
> 权威设计：`docs/design/08-production-release-fix.md`
> 当前生产边界：三条migration与B1有效并冻结；DB-2禁止；旧SHA仅保留兼容/回滚身份，不具备发布资格

## 1. 全局约束

1. 本计划只修复API生命周期和backup路径边界，不改业务、schema/migration、依赖、lockfile、既有e2e或前端。
2. 所有实现先RED后GREEN；没有稳定失败证据不得修改对应生产代码。
3. `CLAUDE.md`和既有脏工作树全程以SHA-256保护；不stash、reset、checkout或覆盖用户改动。
4. 本地Docker仅使用仓库外唯一资源和非生产端口；禁止真实AI、生产数据库和Docker prune。
5. commit、镜像构建、隔离数据库写入、ECS上传、生产备份、生产切换分别需要独立授权。
6. 生产库禁止执行`migrate deploy`或其他写入型migration命令。F6.1旧镜像基线status与F6.3新镜像兼容status分别只执行一次，均为只读，不得混写为“生产总共一次status”。
7. 任何失败停止并保留现场，不自动重试、重建、恢复或清理。

### 实施终态

| 批次 | 最终状态 | 主要证据 |
| --- | --- | --- |
| F0 | 已完成 | `docs/qa/production-release-fix/root-cause-report.md` |
| F1 | 已完成并人工验收通过 | `f1-api-lifecycle-report.md` |
| F2 | 已完成并人工验收通过 | `f2-backup-path-report.md` |
| F3 | 已完成 | `f3-regression-report.md`及两条独立修复提交 |
| F4 | 已完成并人工验收通过 | `f4-local-artifact-rebuild-report.md` |
| F5 | 已完成并人工验收通过 | `f5-isolated-restore-report.md` |
| F6 | 已完成并人工验收通过 | `f6-1-ecs-readonly-gate-report.md`、`f6-2-artifact-import-report.md`、`f6-3-db-compatibility-report.md`、`f6-4a-api-switch-report.md`、`f6-4b-pre-db2-backup-report.md` |

## 2. 真实文件矩阵

| 文件 | 批次 | 预期差异 |
| --- | --- | --- |
| `backend/backend/posts/src/main.ts` | F1 | 增加Nest shutdown hooks，不改其他bootstrap顺序 |
| `backend/backend/posts/src/prisma/prisma.service.ts` | F1 | 增加`OnModuleDestroy/$disconnect()`并格式收敛 |
| `backend/backend/posts/src/prisma/prisma.service.spec.ts` | F1 | 新增资源释放单测 |
| `deploy/production/scripts/api-shutdown.test.mjs` | F1 | 新增无依赖Docker生命周期测试 |
| `deploy/production/scripts/backup-pair.sh` | F2 | 替换错误repo root推导，保留其余安全逻辑 |
| `deploy/production/scripts/backup-pair.test.sh` | F2 | 增加安装布局与真实Git边界fixture |
| `docs/design/08-production-release-fix.md` | 本轮/F3 | 权威修复契约与最终状态 |
| `docs/plans/08-production-release-fix-implementation-plan.md` | 本轮/F3 | 检查点、授权与回滚记录 |
| `docs/qa/production-release-fix/*` | F0～F6 | 脱敏RED/GREEN、制品、恢复和生产证据 |
| `.planning/production-release-fix/*` | 全程 | 可恢复计划、发现和进度 |

禁止修改：Dockerfile、Compose、package/lockfile、Prisma schema/migrations、前端源码、现有Playwright、原型和`CLAUDE.md`。

## 3. F0：诊断基线与RED冻结

**状态：已完成并通过人工评审。**

### 步骤

1. 记录HEAD、branch、status、staged、工具版本、`CLAUDE.md`哈希。
2. 在仓库外隔离Docker环境连续两轮运行旧候选。
3. 记录PID1命令、entrypoint、StopSignal、Docker kill/die事件、耗时、exit/OOM/restart。
4. 以ECS同构安装路径运行backup fixture，记录推导root与拒绝点。

### 完成条件

- 两轮均signal 15后signal 9、exit 137，OOM=false、restart=0。
- Node为PID1，官方entrypoint使用`exec`。
- backup fixture稳定exit 2并显示仓库路径误判。
- 所有临时Docker资源精确清理；Docker Desktop可保留运行，但无本批容器/网络。

## 4. F1：API生命周期TDD

**实际状态：已实施并于2026-07-22通过用户人工验收。** 旧候选RED、Prisma可控Promise RED/GREEN、临时linux/amd64镜像连续两轮容器GREEN及保护证据见`docs/qa/production-release-fix/f1-api-lifecycle-report.md`。

### F1.1 RED测试

新增`api-shutdown.test.mjs`，仅使用Node内建`node:test`、`child_process`、`fs`、`os`：

- 接受显式`API_IMAGE`、固定`POSTGRES_IMAGE`与唯一测试前缀。
- 创建无宿主端口的隔离db/API，使用无权限`.invalid` AI配置且不调用AI。
- API healthy后执行10秒SIGTERM停止，采集事件和inspect。
- 连续执行两轮；每轮断言10秒内exit 0、存在signal 15、不存在signal 9、OOM=false、restart=0、停止后HTTP不可达、db仍healthy。
- finally只按唯一前缀停止/删除本批资源，禁止prune。

先对旧候选执行，预期测试失败并明确命中137；失败结果写入QA。

### F1.2 Prisma单测RED

- 新建`prisma.service.spec.ts`，替换`$disconnect`为Jest mock。
- 断言`onModuleDestroy()`存在、调用并await一次`$disconnect()`；使用可控Promise证明方法在disconnect完成前不会提前resolve。
- 当前实现编译或断言失败即为RED。

### F1.3 最小实现

1. `main.ts`在listen前调用`app.enableShutdownHooks(['SIGTERM', 'SIGINT'], { useProcessExit: true })`。
2. `PrismaService`实现`OnModuleDestroy`；`onModuleDestroy()`只执行`await this.$disconnect()`。
3. 依赖Nest 11.1.12在destroy、before-shutdown、dispose和application-shutdown hooks全部完成后由框架内部执行`process.exit(0)`。
4. 不添加业务`process.on`、直接`process.exit`、超时强杀、重复`app.close()`、延时器、依赖或Docker配置。

### F1.4 GREEN验证

```powershell
pnpm exec jest src/prisma/prisma.service.spec.ts --runInBand
pnpm build
node --test deploy/production/scripts/api-shutdown.test.mjs
```

容器GREEN必须使用本阶段新构建的临时linux/amd64镜像并连续通过两轮；旧候选RED证据保留。

### 停止点与回滚

- 任一退出仍含signal 9/137立即停止，不以增加timeout解决。
- 实现回滚只涉及三个后端文件；不触及数据库或生产。

## 5. F2：backup路径边界TDD

**实际状态：已实施并于2026-07-22通过用户人工验收。** ECS同构安装布局RED、真实Git/无Git回退安全fixture与全部GREEN结果见`docs/qa/production-release-fix/f2-backup-path-report.md`。

### F2.1 RED fixture

在`backup-pair.test.sh`增加：

1. **已安装布局**：脚本位于临时`/srv/black-box/compose/<sha>/scripts`同构路径，backup为sibling目录；旧实现应错误拒绝。
2. **真实Git布局**：备份路径位于带`.git`标记的临时工作树内；必须拒绝且拒绝发生在任何Docker写操作前。
3. **Git不可用回退**：以fixture从`PATH`移除Git，分别验证祖先`.git`目录与`.git`文件都保守拒绝。
4. **既有保护回归**：uploads嵌套、同名complete/incomplete目录、运行中写工具及manifest身份测试全部保留，不删除或放宽断言。

### F2.2 最小实现

- 删除脚本位置向上三级作为repo root的判断。
- 对规范化`BACKUP_ROOT`寻找最近现有祖先，识别实际Git工作树根；只在真实工作树内拒绝。
- Git命令不可用或“不在工作树”时，以祖先`.git`文件/目录检查作为无依赖保护。
- 保留uploads嵌套、同名目录、写工具、失败trap、manifest和API停写顺序。

### F2.3 GREEN验证

```bash
bash -n deploy/production/scripts/backup-pair.sh
bash -n deploy/production/scripts/backup-pair.test.sh
bash deploy/production/scripts/backup-pair.test.sh
```

完成条件：新fixture与既有fixture全过；测试证明“允许安装根sibling backup”“Git可用时拒绝真实工作树”“Git不可用时由`.git`文件/目录保守拒绝”同时成立。

## 6. F3：完整回归、审查与提交

### 执行顺序

1. 从当前工作树运行后端Prisma generate、build、17 suites/既有81条加新增测试。
2. 运行前端16 files/53、build、9 files/51 Playwright。
3. 运行D1全部离线部署测试、LF/secret/IP扫描和`git diff --check`。
4. 触及TS/JS/Shell文件lint为0/0；两端历史全量lint不高于既有基线，不表述为全仓通过。
5. 复核package/lockfile、schema/migrations、现有e2e与`CLAUDE.md`无变化。
6. 用显式pathspec分两个建议提交暂存并先报告staged diff：
   - `fix(runtime): shut down API gracefully`
   - `fix(deploy): preserve backup path boundaries`
7. 只有用户逐项授权后commit；第二个commit的完整SHA成为`FIX_RELEASE_SHA`。

### 停止点

- 未获commit授权不创建SHA、不构建发布镜像。
- 任一受保护文件变化先停止定位。

### F3实际终态

- `fix(runtime): shut down API gracefully`已提交为`638ba463947ec2e955d9b5a221f7f70473c8fec4`。
- `fix(deploy): preserve backup path boundaries`已提交为`72350a77acf59ad179b9a89b19544c162033e0ae`，其直接父提交为上述运行时修复。
- 第二条提交的完整SHA成为`FIX_RELEASE_SHA`；两条提交均严格遵守已审查文件集合，提交后index为空。
- 08设计、实施计划、QA、planning、AGENTS、`CLAUDE.md`及其他历史工作树内容未进入上述提交。
- F4未自动启动；创建detached worktree、正式镜像或任何候选制品仍需独立授权。

## 7. F4：新SHA制品重建

### 前置

- 使用`FIX_RELEASE_SHA`创建仓库外detached干净worktree。
- Docker/端口/内存/磁盘门禁满足；不复制当前脏工作树。

### 步骤

1. 重新执行F3完整测试/build/lint。
2. 构建一次linux/amd64 API镜像，OCI revision必须等于`FIX_RELEASE_SHA`。
3. 核对非root UID/GID、`/app`、入口、healthcheck、依赖加载、3个migration目录、lock文件、4个脚本和10个fixtures。
4. 对新镜像运行两轮`api-shutdown.test.mjs`。
5. 生成全新archive/build manifest；从Git object生成deployment bundle与LF `SHA256SUMS`。
6. 扫描secret、真实endpoint/域名/IP、私钥、CRLF、symlink和非预期构建物。

### 回滚

失败保留新候选现场；不重新tag、不覆盖旧候选、不prune。

### F4首次执行停止点

- detached clean worktree、临时linux/amd64 build-stage镜像、Prisma generate、build与Sharp linux-x64加载已经建立并通过。
- Linux Jest权威运行结果为17/18 suites、80个已执行tests通过；唯一未加载suite由测试`TOKEN_SECRET`命中既有弱密钥校验导致。
- 严格按门禁停止，正式镜像构建次数仍为0，正式archive/bundle/manifest/SHA清单均未生成。
- 恢复需独立授权：复用现有临时测试镜像，仅将测试密钥换为符合现有校验器的随机非弱值后重跑一次完整Jest；达到18 suites / 82 tests才继续本节后续步骤。

Linux Jest已按上述契约恢复为18 suites / 82 tests。前端16/53、build、9 files/51 Playwright及AI preflight 8项、build-image 2项、Compose 7项、LF 3项已通过。Backup fixture因未限定的`bash`解析到WSL、脚本收敛PATH后无法找到Node而暂停；正式镜像构建次数仍为0。再次恢复必须明确使用现有Git for Windows Bash，仅执行一次Backup 8项及剩余Shell门禁，不修改脚本或系统配置。

### F4最终执行状态

- Backup 8项已在Git for Windows Bash通过，全部回归与lint差分达到批准基线。
- 正式镜像仅构建一次并通过内容审计与连续两轮SIGTERM；四项制品均已生成、哈希并完成LF/安全审计。
- 本批容器、网络和端口已清零；镜像、制品、detached worktree及审计现场按计划保留。
- 详细证据见`docs/qa/production-release-fix/f4-local-artifact-rebuild-report.md`。用户已确认F4人工验收通过；F5按独立授权，仅使用该SHA的正式镜像与制品执行全新隔离source/restore链路。

## 8. F5：隔离Compose、配对备份与直接恢复

### 写入范围

只写仓库外全新source/restore数据库、uploads和backup目录；两个Compose project及端口唯一、串行。

### 步骤

1. source执行migration、seed-games、rebuild-tags、seed-demo；禁止embedding和AI。
2. 验证API与数据后，以修复脚本生成唯一配对备份。
3. restore栈不得预跑migration/seed，直接恢复database/uploads。
4. 核对migration、表/数据计数、媒体逐文件SHA、sentinel、manifest内部哈希。
5. 对source和restore的新镜像API分别执行优雅停止验证。
6. 关闭两个project但不使用`-v`，释放端口，保留现场供人工验收。

### 停止点

任一写步骤只执行一次；失败停止并保留容器、日志、`.incomplete`和目录，不自动重试或清理。

### 首次执行记录

- 前置只读门禁通过后，QA编排脚本仅创建全新空目录与日志；因`set -u`局部变量初始化错误，在env生成、Compose启动和数据库连接前退出。
- 现场确认env文件0、PostgreSQL目录条目0、容器/网络/监听0；migration、seed、backup、restore、SIGTERM与AI均未执行。
- 按本节停止点要求未自动修正或重跑。脚本与仓库外现场保留，等待独立恢复授权。

### 恢复执行结果

- 经独立恢复授权，只修正QA编排脚本的局部变量初始化顺序，并使用新的全新根目录；首次失败现场未复用或覆盖。
- source四个写步骤均只执行一次，restore未预跑任何写工具；数据库计数、migration、媒体与sentinel完全一致。
- 唯一配对备份及两套API SIGTERM通过；最终两个project均关闭且未删除bind数据。证据见`docs/qa/production-release-fix/f5-isolated-restore-report.md`。
- 用户已人工确认F5通过。当前仅授权F6.1 ECS新鲜只读门禁；F6.2上传及后续生产写入仍未授权。

## 9. F6：ECS上传、只读兼容与切换

F6需要新的ECS写入、生产备份和切换授权，设计确认不自动授权。

### F6.1 新鲜门禁

- 主机、SSH、UFW、Docker、资源、旧release/B0/B1无漂移。
- 新SHA的release/compose/staging路径不存在。
- 当前生产库只有三条已完成migration，DB-2仍未执行。

首次执行只读确认本机alias在用户权限上下文解析为deploy与2222，并成功建立唯一SSH会话；远端`sudo -n`返回缓存失效，同时PowerShell文本管道令Base64 stdin末尾出现无效输入。脚本在UFW、主机、旧资产和数据库读取前退出。按异常即停契约未自动重连或改换传输方式；恢复前需由用户在自己的deploy终端建立sudo缓存，并使用二进制安全stdin方式重新执行。详见`docs/qa/production-release-fix/f6-1-ecs-readonly-gate-stoppage.md`。

### F6.2 上传

**实际诊断状态（2026-07-23）：** 上传前置脚本在确认新SHA目标路径不存在后，因使用`docker ps -a`断言全部容器总数为1而停止。独立只读诊断确认第二个对象是D4.4按要求保留的旧候选API停止容器（exit 137、非OOM、无restart），生产db仍为原容器且healthy；并无F6.1后的容器漂移。恢复时应核对“运行中仅db + 已知停止API身份不变 + 无未知/oneoff/tool容器”，不得清理旧现场。

**上传恢复停止状态（2026-07-23）：** 纠正后的精确双容器白名单和资源门禁通过；唯一SFTP会话已把四项制品写入新SHA release staging的唯一`.part`路径。finalize在首个制品检查前因Bash `set -u`下同一条`local`声明提前展开变量而停止。未核验/rename、未创建compose staging、未导入镜像。恢复必须复用现有`.part`，不得重新上传。

**恢复完成与收尾状态（2026-07-23）：** 用户授权后从现有`.part`继续，固定SHA、原始LF清单、bundle白名单/语法/安全、release与compose原子提升、唯一一次API镜像导入、镜像身份/内容及PostgreSQL既有身份全部通过；两个既有容器及运行中仅db的状态保持不变。最后的`sudo -n -K`因参数组合不兼容返回非零，尚不能证明缓存清除；只需独立执行正确的`sudo -K`收尾，不得重复F6.2主体。

**最终实施状态（2026-07-23）：** 独立收尾会话中`sudo -K`退出0，随后`sudo -n true`退出1并明确要求认证，证明全局sudo timestamp已清除。F6.2当时进入“已实施，待用户人工验收”门禁，未自动进入F6.3。

- 上传新archive、manifest、bundle和LF清单到全新路径；逐项SHA后原子rename。
- 展开与导入只操作新SHA；旧镜像、release、staging不覆盖不清理。

### F6.3 数据库兼容

- 不执行`migrate deploy`。
- F6.1已用旧候选镜像执行一次只读status作为导入前基线；F6.3只用固定新镜像执行一次独立的兼容status，不重跑F6.1。
- F6.3实际命令必须精确为`node node_modules/prisma/build/index.js migrate status --schema prisma/schema.prisma`，禁止包含deploy/dev/resolve/reset/seed。
- F6.3 status只执行一次并配合只读表/分页核对；必须显示三条已应用、无pending/failed/rolled-back。
- 两次status均不授权生产`migrate deploy`；生产三条migration保持D4.4既有状态。
- 状态异常立即停止，不自动修复或恢复。

**首次执行停止状态（2026-07-23）：** 双容器白名单通过后，deploy身份直接检查root保护的`/etc/black-box/release.env`，权限结果被合并误报为release/compose身份缺失。停止发生在status静态输出和一次性容器创建前；F6.3 status仍为0次，数据库未连接。本地仅改为分项`sudo -n test`，等待独立恢复授权。

**恢复完成状态（2026-07-23）：** 用户授权后恢复执行，固定新镜像的F6.3 status唯一一次调用退出0；3条migration全部finished、pending/rolled-back为0，九张业务表总行数与空分页均为0，DB-2未执行。`--rm`一次性容器残留0，终态仍仅原db运行且旧API保持停止。sudo缓存已清除；当时进入用户人工验收门禁，未自动进入F6.4。

**人工验收状态（2026-07-23）：** 用户确认F6.3通过，并独立授权仅执行F6.4-A；F6.4-B生产配对备份仍未授权。

### F6.4 API切换

1. 保存旧非secret release引用的回滚副本。
2. 原子指向新镜像并启动API；验证loopback liveness/readiness。
3. 执行一次10秒SIGTERM生产验收，必须exit 0；重新启动并验证healthy。

**F6.4-A实施状态（2026-07-23）：** 旧API的脱敏inspect、日志摘要、镜像/退出状态与Compose标签已先保存；旧镜像、旧release、B0/B1保持完整可读。非secret release引用仅原子更新`RELEASE_SHA`、`API_IMAGE`与`API_IMAGE_DIGEST`后，新API使用固定镜像启动并healthy，宿主仅`127.0.0.1:3000`监听；`/api`与空分页均通过。唯一一次SIGTERM在483ms内exit 0，仅signal 15，无signal 9、exit 137、OOM或restart；停止期间HTTP不可达且db持续healthy。随后同一API容器重新启动并再次通过镜像、健康、liveness与空分页检查，终态运行服务精确为api和db，Nginx仍inactive+disabled，80/443关闭。sudo timestamp已清除；当时进入用户人工验收门禁。

**F6.4-A人工验收状态（2026-07-23）：** 用户确认通过；生命周期与生产切换阻塞正式关闭。

**F6.4-B边界：** 用户已独立授权创建“F6 release / pre-DB2”生产配对恢复点。该恢复点不得命名为B2/B3；必须先完成远端完整性与默认SFTP异机副本验证，之后才恢复同一新API。不得将F6.4-A的root受控切换证据目录描述为生产恢复点。

**F6.4-B实施状态（2026-07-23）：** 修复版脚本已创建唯一“F6 release / pre-DB2”恢复点；远端database/uploads、manifest、内部SHA、`pg_restore --list`与tar全部通过。四项文件通过默认SFTP下载到仓库外全新目录，本地大小、SHA、manifest、dump与tar独立验证通过。两端证据通过后同一FIX API恢复healthy，loopback liveness与空分页通过，db持续healthy。未执行DB-2或任何migration/seed/AI/cleanup。独立收尾中`sudo -K`退出0，负向`sudo -n true`退出1；当时进入用户人工验收门禁。

**F6最终验收状态（2026-07-23）：** 用户确认F6.4-B及08整批通过；F0～F6正式关闭。当前生产终态为FIX API与原db均healthy，三条migration、九张业务表为空；B0、B1与“F6 release / pre-DB2”恢复点有效。下一门禁为07计划D4.5 DB-2 `seed-games`，尚未授权。
4. 使用新backup脚本创建新恢复点，验证后恢复API。

### F6.5 回滚

- 新API失败：停止并保留证据，经独立授权恢复旧release引用；数据库不回滚。
- 旧镜像仅为已知缺陷的应急目标；B0/B1不restore，旧资产不删除。
- 不进入Nginx、证书、DNS或Vercel。

## 10. 人工验收门禁

- F1：用户确认两轮新镜像SIGTERM均exit0、无SIGKILL。
- F2：用户确认backup安全检查未弱化且ECS同构路径通过。
- F3：用户审查staged diff后授权commit。
- F4/F5：用户确认同SHA制品链与直接restore证据。
- F6：用户分别授权上传、只读生产兼容、切换和生产备份；最终确认后才恢复D4后续。

本计划确认后也不自动开始实施；每个有副作用批次按其门禁执行。
