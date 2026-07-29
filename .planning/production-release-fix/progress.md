# 生产发布修复进度

## 2026-07-22 启动

- 已读取AGENTS、07设计/实施计划、D4.4 QA、候选`main.ts`、`PrismaService`、Dockerfile、Compose及backup脚本/测试。
- Git暂存区为空，`CLAUDE.md` SHA保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`；未修改产品/部署代码。
- Docker Desktop已按本地诊断需要启动，Engine 29.4.3/amd64；未修改全局配置。
- 旧候选镜像本地存在且身份与生产一致。
- 两次内联复现工具问题均未形成Docker残留；当前转为固定planning诊断脚本。
- 固定脚本首次运行在Docker资源创建前暴露旧版.NET缺少`Convert.ToHexString`，已改用兼容转换并保留失败记录。
- 第二次运行在读取PID1命令时因跨层转义失败；已精确清理唯一前缀资源，并补齐异常路径API容器回收。
- 第三次运行仍停在inspect模板解析；已改为JSON解析并修正不存在资源的清理语义，候选停止动作尚未执行。

## 2026-07-22 根因闭环

- 固定脚本最终完成两轮旧候选停止复现：两轮均healthy后收到SIGTERM，随后被SIGKILL，exit 137、OOM=false、restart=0；隔离资源已按唯一前缀清理。
- 只读镜像检查确认官方entrypoint最终`exec` Node，Node为PID 1，默认StopSignal为SIGTERM。
- ECS同构backup fixture稳定复现exit 2，精确锁定安装目录向上三级被误当Git根。
- 已生成`docs/design/08-production-release-fix.md`、`docs/plans/08-production-release-fix-implementation-plan.md`和根因QA；未修改候选代码。
- 当前进入文档自审与人工评审门禁，不开始F1实现。

## 2026-07-22 评审补正

- 核对本地Nest 11.1.12实现与类型，确认默认shutdown cleanup末尾为`process.kill`，官方`useProcessExit: true`末尾为`process.exit(0)`。
- 08选定方案已补正为带`useProcessExit`的官方hooks；业务自定义signal/exit/强杀/重复close明确禁止。
- 容器两轮断言和backup Git不可用回退fixture已补入设计与实施计划；仍未修改运行代码。

## 2026-07-22 F1启动

- 用户已人工确认08设计与实施计划，仅授权F1 API生命周期TDD与最小修复。
- 当前HEAD仍为旧候选SHA，暂存区为空，`CLAUDE.md`保护哈希未变；F2、commit、候选重建与ECS均禁止。

## 2026-07-22 F1实施与自动验证

- Prisma销毁钩子单测先RED：`onModuleDestroy is not a function`；最小实现后1 suite / 1 test通过。测试用可控Promise证明`onModuleDestroy()`在`$disconnect()`完成前不会提前resolve。
- `main.ts`仅增加Nest 11.1.12官方`enableShutdownHooks(['SIGTERM', 'SIGINT'], { useProcessExit: true })`；`PrismaService`仅增加`OnModuleDestroy`并await`$disconnect()`，未增加业务signal handler、直接退出、强杀或重复close。
- 旧候选容器RED保留：停止超过10秒；既有两轮证据记录signal 15后signal 9、exit 137、OOM=false、restart=0，未重复无意义诊断。
- 新临时linux/amd64镜像连续两轮GREEN：分别约219ms与210ms退出，均exit 0、仅signal 15、无signal 9、OOM=false、restart=0、数据库持续healthy且停止后HTTP不可达。
- 聚焦Prisma Jest、触及TS文件ESLint 0/0、部署测试脚本`node --check`及后端build均通过。沙箱内首次build因pnpm junction读取EPERM失败，未改依赖；同命令在正常宿主权限下通过。
- F1测试容器、网络和临时目录已精确清理；临时验证镜像保留供人工审查，Docker Desktop已停止。package/lockfile、schema/migration、前端、既有e2e、`CLAUDE.md`均未被F1修改，暂存区保持为空。
- 当前停在F1人工验收门禁；F2、commit、候选制品重建、ECS及生产操作仍未授权。

## 2026-07-22 F1验收与F2启动

- 用户已人工验收通过F1；该状态已同步至08设计、实施计划、F1 QA与planning。
- 用户仅授权F2修改`backup-pair.sh`及其测试，执行backup路径边界TDD与最小修复；F3、commit、候选制品重建、ECS和生产备份仍禁止。
- F1运行代码与测试差异继续受保护，不回滚、不覆盖；`CLAUDE.md`、依赖/lockfile、schema/migration、前端与既有e2e继续以差分和哈希门禁保护。

## 2026-07-22 F2实施与自动验证

- 测试先行新增ECS同构安装布局，旧实现稳定RED：exit 2，错误为`BACKUP_ROOT must be outside the repository`，证明安装分组根被误判为Git仓库根。
- 新增真实Git工作树、Git不可用时祖先`.git`目录、worktree式`.git`文件三项拒绝fixture；均断言拒绝发生在Docker调用前。
- 首轮实现因Windows Git的盘符`show-toplevel`与POSIX`realpath`表示不一致，被真实Git fixture检出；未放宽检查，改为对最近现有祖先直接使用`--is-inside-work-tree`，无法确认时继续扫描祖先Git标记。
- 最终`backup-pair.sh`与测试均通过`bash -n`，8个fixture全部通过；两个Shell保持LF，`git diff --check`与定向静态安全扫描通过。宿主未安装ShellCheck，已如实记录，未引入新依赖。
- 生产脚本差异只替换repo root猜测逻辑；绝对路径、uploads、complete/incomplete重名、写工具、API停写、失败保留、manifest/SHA与恢复身份代码未修改。
- `CLAUDE.md`及package/lockfile哈希保持，schema/migration、前端、既有e2e与F1差异未被修改；暂存区为空，未连接ECS或生产环境。
- 当前停在F2人工验收门禁；F3、commit、正式候选重建及生产备份仍未授权。

## 2026-07-22 F2验收与F3启动

- 用户已人工验收通过F2；F1/F2状态已同步至08设计、实施计划、QA与planning。
- 用户授权F3完整本地门禁、隔离Docker生命周期验证及显式pathspec提交前暂存审查；不授权commit、F4制品重建、ECS或生产操作。
- 当前工作树含大量既有部署记录与用户改动；F3不清理、stash、覆盖或格式化这些文件，只对两组明确修复文件建立暂存边界。

## 2026-07-22 F3后端门禁暂停

- Prisma generate成功，未连接数据库且未改变package/lockfile。
- 后端全量Jest结果为18 suites中17 passed、1 failed to load；80个已加载断言全部通过。唯一失败suite为`demo-seed-files.spec.ts`，其2个断言尚未运行。
- 失败发生在导入Sharp的win32-x64原生模块时，Windows明确返回`An Application Control policy has blocked this file`与`ERR_DLOPEN_FAILED`。这属于本机执行策略阻止原生二进制加载，不是测试断言、F1/F2实现或依赖解析失败。
- 按F3“任一门禁失败立即停止”约束，未继续后端build、Docker生命周期、backup复验、前端、lint、部署测试或暂存；未修改依赖、lockfile、测试或系统策略。
- 停止后只读核对：AGENTS、`CLAUDE.md`、package/lockfile哈希保持；schema/migration与前端无diff；暂存区为空。
- 失败证据见`docs/qa/production-release-fix/f3-regression-stoppage.md`。F3仍未完成，F4与commit均禁止。

## 2026-07-22 F3 Linux替代门禁首次执行停止

- 用户批准保留Windows Application Control失败证据，并改在隔离linux/amd64 Docker环境执行后端完整门禁。
- 已从当前后端Docker context与既有Dockerfile build stage构建唯一临时镜像`black-box-api-f3-test:20260722`；镜像身份为`sha256:4ed252e4b53f8250476409c4d497f56a7cbe3df23ddd846372da2e92e84b55cf`，平台linux/amd64，未设置正式release revision。
- 首次容器命令在Sharp加载与Jest启动前因PowerShell到容器shell的引号传递失败，Node仅输出`-e requires an argument`并以9退出；没有执行suite或断言，不能记为Linux Jest失败或通过。
- 按“任一步失败立即停止”约束未自动修正或重试，未继续build、生命周期、部署脚本、前端、lint或暂存。
- `--rm`已清理失败容器；临时镜像保留。AGENTS、`CLAUDE.md`、package/lockfile哈希不变，暂存区为空。

## 2026-07-22 F3完整回归通过

- 用户授权从停止点持续恢复。Base64环境变量承载探测脚本后，linux/amd64容器实际加载Sharp 0.35.1的`@img/sharp-linux-x64`原生模块；全量Jest 18 suites / 82 tests全部通过，`demo-seed-files.spec.ts`明确执行且通过。Windows Application Control失败记录继续保留，未改写为Windows通过。
- 后端build通过；F1触及TS文件lint 0/0。F1运行时镜像连续两轮SIGTERM约217ms/210ms退出，均exit0、仅signal15、无signal9、OOM=false、restart0、DB持续healthy、HTTP停止后不可达。
- Backup 8项、AI mock预检8项、build-image路径2项、Compose最小权限7项、Git object LF 3项全部通过；当前3个Shell均为LF，MJS/Bash/PowerShell语法与静态secret/公网IP/禁止模式扫描通过。
- 前端16 files / 53 unit、build 2460 modules、Playwright清单9 files / 51且全量51 passed。
- 全量只读lint为后端825 errors / 6 warnings（低于833/6基线）、前端3 errors / 0 warnings（不高于3/0基线）；不表述为全仓lint通过。
- `git diff --check`通过；112个受保护文件聚合SHA保持`E18C1887E81BF7A34F454CDDE29B316AD8BCCA99DB3054D0B3F2E50BEDDBACCE`。
- F3容器/网络残留均为0。保留`black-box-api-f3-test:20260722`与F1临时运行时镜像，均明确不是正式候选；Docker Desktop已停止。
- 完整证据见`docs/qa/production-release-fix/f3-regression-report.md`。下一步仅进行两组显式pathspec暂存审查，不commit、不进入F4。

## 2026-07-22 F3两组暂存审查

- 第一组`fix(runtime): shut down API gracefully`使用4个显式pathspec暂存并通过文件集合、`git diff --cached --check`与secret扫描；统计为4 files、279 insertions、9 deletions。
- 精确撤销第一组暂存后，第二组`fix(deploy): preserve backup path boundaries`使用2个显式pathspec暂存并通过同样审查；统计为2 files、122 insertions、7 deletions。
- 精确撤销第二组后，重新暂存第一组作为当前下一待授权commit。当前index严格只有第一组4文件；第二组2文件保持未暂存且已完成cached diff审查。
- 08设计、计划、QA、planning、既有生产部署记录、AGENTS与`CLAUDE.md`均未暂存。未commit，未生成`FIX_RELEASE_SHA`，未进入F4。

## 2026-07-22 F3两条修复提交完成

- 经用户逐项授权，运行时修复以`fix(runtime): shut down API gracefully`提交，完整SHA为`638ba463947ec2e955d9b5a221f7f70473c8fec4`，文件集合严格为4个已审查文件。
- backup路径边界修复以`fix(deploy): preserve backup path boundaries`提交，完整SHA为`72350a77acf59ad179b9a89b19544c162033e0ae`，文件集合严格为`backup-pair.sh`与`backup-pair.test.sh`；统计为2 files、122 insertions、7 deletions。
- 第二条提交的直接父提交精确为`638ba463947ec2e955d9b5a221f7f70473c8fec4`，其完整SHA正式成为`FIX_RELEASE_SHA`。
- 两次提交后Git index为空。AGENTS与`CLAUDE.md`保护哈希未变化；08设计、实施计划、QA、planning及其他历史工作树内容均未进入提交。
- 未开始F4、未构建正式候选制品、未连接ECS。当前停在F4施工独立授权门禁。

## 2026-07-22 F4首次执行暂停

- 用户授权仅执行新`FIX_RELEASE_SHA`的本地F4制品重建；已创建仓库外detached clean worktree，精确指向`72350a77acf59ad179b9a89b19544c162033e0ae`。
- Docker Desktop启动成功；后端/前端锁定依赖安装未修改package/lockfile。唯一临时linux/amd64 build-stage镜像构建成功，后端build、Prisma generate和Sharp 0.35.1 linux-x64加载通过。
- 首次Jest命令因额外`--`被Jest 30解释为文件模式，没有执行测试；随后以正确命令运行权威门禁。
- 权威Linux Jest发现18 suites：17 suites通过，80个已执行tests通过；`ai.controller.spec.ts`因本批测试`TOKEN_SECRET`包含弱占位词而被现有环境校验器拒绝加载，未达到18 suites / 82 tests。
- 按失败即停约束未自动换值重跑。正式镜像构建次数为0；archive、build manifest、bundle与`SHA256SUMS`均未生成；前端、正式SIGTERM和F4后续门禁未执行。
- 保留detached worktree、临时测试镜像和仓库外证据现场；未prune、未连接ECS、未进入F5、未调用AI或提交Git。证据见`docs/qa/production-release-fix/f4-local-artifact-rebuild-stoppage.md`。

## 2026-07-22 F4恢复后第二次暂停

- 复用同一临时linux/amd64镜像，以当前进程内48字节密码学随机hex密钥唯一重跑Linux Jest；18 suites / 82 tests全部通过，`demo-seed-files.spec.ts`明确通过，密钥未回显或落盘。
- Sharp 0.35.1再次确认加载linux-x64。前端16 files / 53 unit、build 2460 modules、Playwright 9 files / 51全部通过。
- AI preflight 8项、build-image路径2项、Compose最小权限7项、Git object LF 3项通过。
- Backup fixture由默认`bash`启动时实际进入WSL；脚本PATH收敛后第143行找不到Node，未得到8项fixture完整结果。只读定位确认Git for Windows Bash存在，但按失败即停约束未自动切换重跑。
- 未继续lint、正式镜像、SIGTERM或制品生成；正式镜像构建次数仍为0。无F4容器、网络或端口残留，保留临时测试镜像与detached worktree等待恢复授权。

## 2026-07-22 F4自动门禁完成

- 用户授权本批后续持续执行。Backup fixture明确使用Git for Windows Bash，8项全部通过；Shell语法、AI 8项、build-image 2项、Compose 7项和LF 3项完整闭环。
- 宿主Prisma Client generate后，F1触及TS lint恢复0/0；首次4个类型lint错误明确来自未生成Client，不是源码回归。全量lint为后端825/6、前端3/0，均不高于批准基线。
- 正式镜像仅构建一次：image ID为`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`，linux/amd64、`10001:10001`、`/app`、入口/healthcheck/revision及依赖与内容审计通过。
- 正式镜像两轮SIGTERM分别约252ms/225ms，均exit0、仅signal15、无signal9、OOM=false、restart0、DB healthy、HTTP停止后不可达。
- 生成API archive、build manifest、Git object deployment bundle与LF `SHA256SUMS`；哈希、文件集合、0 symlink、3个Shell blob逐字节一致、语法和安全扫描全部通过。
- bundle审计脚本最初误把“Shell逐字节一致”扩大为全部文本文件，并将公开模板端点/占位数据库URL误报为真实凭据；已收敛回权威契约，正式bundle未重建或修改。
- F4容器、网络和测试端口为0；镜像、制品、worktree和审计现场保留。未进入F5、未连接ECS、未调用AI、未提交Git。完整证据见`docs/qa/production-release-fix/f4-local-artifact-rebuild-report.md`。

## 2026-07-22 F4验收与F5启动

- 用户已人工验收通过F4；08设计、实施计划、F4 QA与本planning同步为完成状态。
- F5获得独立写入授权：只使用`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`、正式镜像`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`及F4同源制品。
- source/restore使用仓库外全新隔离目录、Compose project、数据库、uploads、backup与端口；只执行migration、games、tags、demo、配对备份、直接恢复与两套API SIGTERM，明确禁止AI、ECS、F6与Git提交。

## 2026-07-22 F5首次执行暂停

- F5前置只读门禁通过：固定SHA、正式镜像ID/架构/revision、archive SHA、F4 worktree clean、3112/3113空闲，且无历史F5容器或网络。
- 新建QA脚本`.planning/production-release-fix/f5-isolated-restore.sh`并通过`bash -n`；首次实际执行在`write_envs`的局部变量初始化处被`set -u`终止，错误为`base: unbound variable`。
- 仓库外现场仅含空source/restore目录与268-byte日志；env文件0、PostgreSQL条目0、容器0、网络0、端口监听0。migration、games、tags、demo、backup、restore、SIGTERM与AI调用均未执行。
- 按用户固定的失败即停规则，未修正、未重跑、未清理现场。F5状态改为暂停，等待独立恢复授权。

## 2026-07-22 F5恢复授权

- 用户明确授权恢复且本批完成前不再逐项请示。恢复只拆分`base`与`env_dir`两条局部变量声明，不改变候选、Compose、写入顺序、安全边界或验收断言。
- 首次空现场与日志保持原样；恢复运行必须创建新的唯一F5根目录，不能复用或覆盖首次现场。

## 2026-07-22 F5恢复执行完成

- 最小拆分局部变量赋值后`bash -n`通过；恢复使用全新根目录`black-box-f5-72350a77-recovery-20260722T090035Z`，首次空现场未修改。
- source单次完成3条migration、games、tags、demo：5用户、35帖子、13评论、31点赞、10文件、5游戏、5标签、0 embedding，5游戏各7篇；API分页返回35项。
- 唯一配对备份完成：dump 33790 bytes、uploads归档300386 bytes，内部SHA、manifest、`pg_restore --list`和tar可读性通过。
- restore未预跑migration/seed，直接恢复后数据库状态、游戏分布、3条migration、21文件媒体manifest及sentinel与source一致；API分页同为35项。
- source/restore SIGTERM分别504ms/564ms，均exit0、signal15、无signal9、OOM=false、restart0、DB healthy、HTTP不可达。
- 两个project均down且未使用`-v`；F5容器/网络/3112/3113监听均为0，数据库、uploads、backup、制品和证据现场保留。AI调用0，未连接ECS、未进入F6、未提交Git。
- 独立复核阶段三次一次性跨壳命令分别遇到POSIX路径被PowerShell误解、PowerShell组合输出异常、内联引号错误；均为只读QA读取层且未影响现场。改用固定`f5-verify.sh`后完整复核通过。

## 2026-07-22 F5验收与F6.1启动

- 用户已人工验收通过F5；08设计、实施计划、F5 QA与planning同步为正式完成。
- 当前仅授权F6.1 ECS新鲜只读门禁：固定`FIX_RELEASE_SHA`，核对SSH 2222、当前连接来源与UFW唯一来源、主机服务/资源/监听、旧候选资产/B0/B1/Compose DB终态、生产三条migration与九张业务空表、新SHA路径不存在。
- F6.2上传、镜像导入、远端目录创建、migration/seed/AI、Nginx/DNS/Vercel与任何修复均未授权。

## 2026-07-22 F6.1首次连接暂停

- 沙箱身份下`ssh -G`无法读取用户配置而显示默认用户/22；未据此连接。用户权限上下文重新核对后，alias严格解析为deploy与2222。
- 唯一普通SSH会话成功到达ECS；PowerShell将Base64文本通过native pipeline发送时产生末尾无效输入，远端解码报告`base64: invalid input`。脚本已执行到首个`sudo -n true`，该门禁明确返回需要密码。
- 按“任何异常立即停止”未进行第二次连接、未改换stdin方式、未修改sudoers，也未读取UFW、主机、旧资产、B0/B1或数据库。远端写入、服务重启、上传与F6.2均为0。
- 本地SSH/SFTP/SCP进程0，Git index为空，HEAD与AGENTS/CLAUDE保护哈希未变化。恢复需用户自行建立sudo缓存，并改用二进制安全stdin；安全组控制面因本机无阿里云CLI只能继续由用户控制台核验，不能从实例内伪造。

## 2026-07-22 F6.1恢复

- 用户已在自己的deploy终端建立sudo缓存。恢复仅重新执行F6.1只读脚本，使用`cmd`原始文件重定向至SSH stdin，避免PowerShell Base64文本管道。
- 阿里云安全组当次控制台状态尚未由用户确认；实例侧门禁与该控制面证据分开记录，不能相互替代。

## 2026-07-22 F6.1恢复执行再次暂停

- 原始文件stdin单次执行成功到达ECS；deploy身份、`sudo -n`、sshd配置、当前SSH来源匹配UFW唯一2222规则、UFW默认策略、Docker/containerd、Nginx、failed units及reboot marker检查均通过。
- 脚本随后在资源阈值断言组非零退出。该组包含Swap总量、Swap可用、MemAvailable、磁盘可用与swappiness；脚本只在整组通过后输出数值，因此现有证据不能区分具体失败子项。
- 按异常即停约束未建立第二次连接、未追加诊断、未修改主机或数据库。旧资产/B0/B1、Compose/数据库、新SHA路径检查尚未执行，F6.1仍未通过。
- 会话退出后本机SSH/SFTP/SCP进程为0，Git index为空，AGENTS/`CLAUDE.md`保护哈希不变。阿里云安全组控制面仍需用户当次只读确认。

## 2026-07-22 F6.1资源独立只读诊断

- 用户仅授权采集SwapTotal、SwapFree、MemAvailable、磁盘可用、swappiness及底层swapfile/swapon差值；未恢复完整门禁。
- 单一SSH会话完整输出原始值后再计算结论：五项既定资源契约全部PASS。底层`/swapfile`精确`2147483648` bytes，swapon SIZE为`2147479552` bytes、USED为`1060864` bytes，差值恰为4096-byte header页。
- 前次完整门禁失败已定位为旧断言要求swapon SIZE不小于整数2GiB；该断言与D3.3已登记的header页差异冲突。内存、磁盘、Swap可用量和swappiness均不是失败原因。
- D3.6报告中把`2147479552`标成底层文件大小，与D3.3“底层精确2GiB、swapon少一页”及本次双值实测不一致；本轮保留历史证据并明确这是报告标签偏差，不把它解释为主机漂移。
- 未修改审计脚本或任何远端状态，未读取数据库或进入F6.2；完整F6.1继续等待用户决定审计口径与恢复授权。

## 2026-07-22 F6.1审计口径与恢复授权

- 用户拍板Swap必须精确核验底层2GiB文件、4096-byte page size、减一个header页后的swapon SIZE及`SwapTotal`字节一致性；其余资源阈值不变，禁止改成模糊下限规避异常。
- 用户当次通过阿里云控制台人工确认安全组仅存在批准管理来源到TCP 2222的入方向规则且无其他入方向规则；该控制面证据与UFW实例侧证据独立记录。
- 已获准修正本地只读审计脚本并恢复一次完整F6.1；生产库仅允许`prisma migrate status`、migration只读计数、九表空计数及空分页核对。F6.2上传及任何生产写入仍未授权。

## 2026-07-22 F6.1完整恢复再次暂停

- 当次阿里云安全组人工控制面证据已登记；实例侧deploy/sudo/sshd/UFW、Docker/containerd、Nginx、failed/reboot、精确Swap四层一致性、资源、监听及持久目录契约均实际通过。
- 新Swap审计输出：底层文件`2147483648`、page size`4096`、swapon SIZE`2147479552`、SwapTotal`2097148 kB`；其余资源阈值全部通过，旧严格字节误拒绝已关闭。
- 随后deploy非特权`find /srv/black-box -maxdepth 3`因无法遍历正式`uploads/postgres/backups`目录而返回permission denied；脚本在旧/新SHA路径枚举阶段按`pipefail`退出1。
- 该停止点属于只读审计命令权限口径缺口，不是已确认的资产漂移。未执行B0/B1、Compose/镜像、`prisma migrate status`或任何数据库读取，远端写入和F6.2均为0。
- 按异常即停未自动改为sudo或重跑；等待用户决定是否仅授权修正两处路径枚举为`sudo -n find`后恢复剩余完整门禁。

## 2026-07-23 F6.1路径枚举恢复授权

- 用户明确授权本批完成前持续执行，无需逐项请示；授权范围仍仅为完成F6.1，不包括F6.2。
- 最小修正仅把统计旧SHA与确认新SHA不存在的两处跨受保护目录枚举改为`sudo -n find`；路径、深度、匹配条件及全部存在性断言不变，不修改目录权限或给deploy扩权。

## 2026-07-23 F6.1路径恢复与B0/B1权限停止

- 两处`sudo -n find`恢复后，旧SHA路径计数5、旧release/compose存在、新FIX SHA目标路径0均通过，路径阶段未发现漂移。
- 脚本随后在B0/B1可读性组停止；正式backups父目录为`root:root 0700`，deploy直接`cd`无权限。该停止未执行Compose、镜像、`prisma migrate status`或数据库读取。
- 根据本批持续授权，最小修正仅将既有B0/B1 `sha256sum`、`pg_restore --list`和`tar -tzf`读取封装在`sudo -n bash`内；不修改备份、目录权限或验收断言。

## 2026-07-23 F6.1 B0/B1恢复与env检查停止

- B0/B1在root只读上下文中完整通过内部SHA、dump清单和tar可读性检查。
- 随后deploy对`/etc/black-box/release.env`执行非特权`[[ -f ]]`时因父目录`root:root 0700`停止；这是正式secret目录权限与审计身份不匹配，不是已确认的env缺失。
- 最小修正仅改为`sudo -n test -f`检查compose与release env存在，不读取内容、不修改权限或文件。

## 2026-07-23 F6.1 env恢复与数据库续段

- env存在性改为root只读检查后，Compose前置、仅db运行、db健康/无OOM/无重启、镜像集合与FIX镜像不存在均通过。
- 一次性`prisma migrate status`实际以0返回；但`docker compose run`未加`-T`并消费SSH stdin中的后续脚本文本，导致没有执行SQL计数及最终标记。该现象不是数据库失败，也不能视为完整门禁通过。
- 按“migrate status只执行一次”契约不重跑该命令。新增独立只读续段先确认migrate容器已由`--rm`清除、仅db运行，再执行三条migration、九表空计数和空分页SQL及终态核对。

## 2026-07-23 F6.1数据库续段stdin修正

- 续段确认migrate容器残留0、仅db运行；首个只读migration计数查询以0返回。
- `docker compose exec -T`仍继承SSH脚本stdin并消费剩余文本，说明`-T`仅禁用TTY。最小修正为每次只读exec显式接入`</dev/null>`；不重跑`prisma migrate status`，仅重复无副作用SQL计数以完成证据。

## 2026-07-23 F6.1完整技术门禁通过

- 显式关闭Compose exec stdin后，数据库续段完整输出：migrate status退出0、migrate容器残留0、3条migration全部finished、pending/rolled-back均0、九张业务表总行数0、空分页0、DB-2未执行。
- 终态仍仅db运行且healthy；API未启动。与此前已通过的安全组人工控制面、SSH/UFW、服务、精确Swap、资源、监听、目录、旧资产、新SHA隔离、B0/B1及镜像证据合并后，F6.1全部技术断言闭环。
- 未发生migration/seed/restore/embedding/cleanup/AI、上传、镜像导入、新SHA目录创建或任何生产状态修改。当前仅标记“待用户人工验收”，不进入F6.2。

## 2026-07-23 F6.1验收与F6.2启动

- 用户已人工验收通过F6.1，并独立授权仅执行F6.2：四项固定新候选制品上传、Linux原始SHA清单校验、bundle安全审计与原子提升、唯一一次API镜像导入及PostgreSQL既有身份复核。
- F6.2禁止启动任何容器/API/tools、读取或写入数据库、migration/seed/restore/embedding/cleanup/AI，以及Nginx/证书/DNS/Vercel/UFW/安全组/SSH修改；F6.3未授权。

## 2026-07-23 F6.2上传前置门禁暂停

- 本地四项固定制品大小与SHA重新核对通过，`SHA256SUMS`继续保持LF、无BOM。
- 唯一远端前置会话在确认新SHA三个目标路径不存在后，发现现有Docker容器总数偏离F6.1“仅db”基线并非零退出。
- 失败发生在release目录创建之前；未发起SFTP、未上传、未展开bundle、未导入镜像，且未触碰容器、数据库或任何生产配置。
- 按异常即停契约保留现场。恢复前需要独立只读容器身份与状态清单，不能自动清理或继续F6.2。

## 2026-07-23 F6.2容器漂移首次只读诊断停止

- 唯一SSH会话确认当前共有2个Docker容器，证明F6.1后确有一个额外容器对象。
- 详情输出前因远端Docker模板不支持`trimPrefix`函数而非零退出；尚未取得容器身份、Compose标签或events，不能推断漂移来源。
- 远端未发生任何写入或容器状态变化。本地脚本仅改用基础`.Name`字段并通过静态修正，按“采集异常即停”要求未自动重连；等待新的单次只读诊断授权。

## 2026-07-23 F6.2容器漂移身份确认

- 再授权后的只读`inspect`完整取得2个容器：原生产db继续running+healthy、OOM=false、restart=0；第二个是D4.4已登记并要求保留的旧候选API，创建和停止时间均早于F6.1，状态exited 137、OOM=false、restart=0，Compose service=api且非oneoff。
- Docker events采集因远端模板应使用`.Actor.ID`而非`.ID`停止，daemon journal未到达；操作者级时间线记为未知，不推断。该缺口不影响两个对象的身份与F6.1前后关系判断。
- 根因是F6.2前置脚本错误把F6.1“仅db运行、migrate残留0”收紧成“`docker ps -a`总数必须为1”。当前没有生产容器漂移，也无需清理旧API现场。
- 建议恢复门禁精确锁定原db与已知停止API两种身份，并拒绝任何第三个、oneoff、migrate或其他project容器；上传仍等待用户恢复决定。

## 2026-07-23 F6.2上传完成后finalize暂停

- 用户批准按精确双容器白名单恢复F6.2。门禁确认原db/旧API完整ID与状态不变、无第三个或oneoff/tool容器，资源满足阈值；随后创建唯一release staging。
- 唯一SFTP会话退出0，四项固定制品写入各自唯一`.part`，未重试或切换协议。
- finalize启用`set -u`，在首个制品核验前因同一条`local`声明引用尚未完成赋值的`name`而退出。四项仍为`.part`；未执行大小/SHA、rename、bundle展开、正式目录提升或`docker load`。
- 本地仅将变量赋值和路径拼接拆成两条声明；按失败即停未自动恢复。下一次必须从现有`.part`继续，禁止重新上传或清理。

## 2026-07-23 F6.2主体完成与缓存清理暂停

- 用户授权后仅从现有四项`.part`恢复。固定大小/SHA、Linux原始LF清单3/3、bundle 24成员/20文件/4目录/0 symlink、3个Shell LF+Bash、Compose/JSON/安全扫描全部通过；release与compose分别从唯一staging原子提升。
- API archive仅执行一次`docker load`；固定image ID、amd64、UID/GID、工作目录、OCI revision、入口、healthcheck及3 migration/lock、4脚本、10 fixture内容审计通过。PostgreSQL既有镜像只读复核通过，未拉取。
- 全程未创建或启动新容器，终态仍为原db running+healthy和旧API exited 137；运行中仅db。未触碰数据库、secret、Nginx、网络边界或外部服务。
- 收尾误用`sudo -n -K`，当前sudo返回用法错误；随后打印的完成标记无证明力。按异常即停未自动改用`sudo -K`，F6.2主体不重跑，仅待精确缓存清理。

## 2026-07-23 F6.2 sudo缓存收尾完成

- 用户仅授权一个deploy SSH会话执行`sudo -K`及`sudo -n true`负向验证。前者退出0，后者退出1并提示需要认证，证明全局timestamp已清除。
- 本地PowerShell把预期stderr包装为错误记录，但远端两个退出码和认证提示完整可判定；未重试、未修改sudoers或其他生产状态。
- SSH关闭后F6.2标记为“已实施，待用户人工验收”；F6.3仍未授权。

## 2026-07-23 F6.2验收与F6.3准备

- 用户人工确认F6.2通过并仅授权F6.3数据库兼容只读门禁。
- 文档明确拆分：F6.1是旧候选镜像的导入前基线status且已执行一次；F6.3是固定新镜像兼容status且只允许执行一次。两者均只读，生产库始终禁止`migrate deploy`。
- 已冻结F6.3精确命令、双容器白名单、新release/compose/image身份、三条migration、九表空计数、空分页及`--rm`无残留断言。
- F6.2已执行`sudo -K`并证明缓存清除；执行F6.3前需要用户在自己的deploy终端重新`sudo -v`。缓存建立前不连接ECS、不运行status。

## 2026-07-23 F6.3首次执行在status前暂停

- 用户建立sudo缓存后启动F6.3。精确双容器白名单通过，随后合并路径检查以deploy身份直接访问root保护的`/etc/black-box/release.env`，因不可遍历而误报FIX身份缺失。
- 失败发生在status静态输出与`docker compose run`之前；F6.3 status执行次数仍为0、一次性容器0、数据库访问0。
- 本地仅把release/compose/env检查拆为`sudo -n test`并用sudo只读计数，未改变固定新镜像、精确status命令或SQL契约；按失败即停未自动恢复。

## 2026-07-23 F6.3恢复执行完成

- 用户授权后恢复；双容器、FIX release/compose/image及精确status命令静态检查通过。
- 固定新镜像的F6.3唯一一次`prisma migrate status`退出0；SQL核对为migration 3/finished 3/pending 0/rolled-back 0，九张业务表总行数0、空分页0、DB-2未执行。
- `--rm`兼容容器残留0；终态仍仅原db运行并healthy，旧API保持exited 137，未启动API或其他tools。
- `sudo -K`退出0，负向`sudo -n true`退出1；SSH关闭。F6.3标记为“已实施，待用户人工验收”，F6.4未授权。

## 2026-07-23 F6.3验收与F6.4-A准备

- 用户人工确认F6.3通过，并独立授权仅执行F6.4-A生产API切换、只读健康核验和一次10秒SIGTERM验收；F6.4-B生产配对备份未授权。
- F6.4-A允许Compose替换已停止旧API对象，但必须先把其脱敏inspect、日志摘要、镜像/退出状态/Compose标签及旧release引用保存到root受控证据；旧镜像、旧release、B0/B1不得删除。
- F6.3已清除sudo timestamp；实际切换前需要用户在自己的deploy终端重新`sudo -v`，agent不接触密码。
- 本地F4保留现场重新复算：archive、build manifest、bundle和LF SHA256SUMS的大小及完整SHA均与人工固定身份一致，SHA清单CR=0、LF=3、BOM=0。

## 2026-07-23 F6.4-A实施完成

- 切换前原db、九张空表、旧停止API、旧镜像/release、B0/B1、新release/compose/image及六个secret env权限全部通过；旧API脱敏inspect、日志摘要和旧非secret release引用已保存到root受控证据目录。
- 非secret `release.env`仅原子更新`RELEASE_SHA`、`API_IMAGE`和`API_IMAGE_DIGEST`。新API镜像身份、非root运行、loopback `127.0.0.1:3000`、healthy、`/api` liveness及空分页均通过。
- 唯一一次SIGTERM耗时483ms，exit 0，仅signal 15，无signal 9、exit 137、OOM或restart；停止后HTTP不可达且db持续healthy。随后同一API容器重启并再次通过身份、健康、liveness和空分页。
- 终态运行服务精确为api与db；Nginx保持inactive+disabled，80/443关闭。未执行migration、seed、embedding、AI、cleanup、restore或backup，`F6_4B_BACKUP_EXECUTED=false`。
- `sudo -K`退出0，随后`sudo -n true`退出1，SSH已关闭。F6.4-A现为“已实施，待用户人工验收”；F6.4-B仍需独立授权。

## 2026-07-23 F6.4-A验收与F6.4-B启动

- 用户人工确认F6.4-A通过，生产API切换与生命周期阻塞关闭。
- 用户独立授权F6.4-B，仅创建标识为“F6 release / pre-DB2”的新候选发布后恢复点；禁止命名为B2/B3，禁止进入DB-2。
- 执行严格分三段：远端脚本停止API并生成/验证配对备份；默认SFTP下载四项到仓库外唯一目录并完成大小、SHA、`pg_restore --list`与tar核验；仅在两端证据全部通过后恢复同一新API。

## 2026-07-23 F6.4-B sudo前置停止

- 本地编排脚本已锁定修复版`backup-pair.sh`完整SHA，并通过Bash语法与补丁检查。
- 唯一SSH前置检查中`sudo -n true`明确返回需要认证；停止发生在备份目录创建、API停止、数据库读取和SFTP之前，生产状态写入为0。
- 必须由用户在自己的deploy终端执行`sudo -v`建立缓存后才能恢复；agent不读取、索取或传递密码。

## 2026-07-23 F6.4-B主体完成与sudo收尾暂停

- 用户建立缓存后，固定镜像/release、api+db健康、loopback、三条migration、九表空库、无写工具、B0/B1/旧资产、唯一备份路径和资源门禁全部通过。
- 修复版`backup-pair.sh`停止API并创建唯一“F6 release / pre-DB2”恢复点；database 26,567 bytes、uploads 99 bytes，内部SHA、dump/tar及扩展manifest全部通过。未执行migration、seed、restore、AI、embedding或cleanup。
- 四项文件经一次默认SFTP下载至仓库外全新目录，远端/本地大小和SHA逐项一致；本地`pg_restore --list`、tar、内部SHA与manifest核对通过。uploads只有1个真实控制目录项，无业务媒体。
- 两端证据通过后，同一新API容器恢复healthy，loopback/liveness/空分页通过，db持续healthy；终态运行服务为api和db，Nginx仍停止，80/443关闭。
- 最后的sudo清理命令因SSH远端命令引号错误在shell解析阶段退出2，不能证明`sudo -K`执行。按异常即停未自动重试；正式备份、本地副本和API终态不受影响。当前仅待新的独立收尾授权。

## 2026-07-23 F6.4-B sudo收尾完成

- 用户明确授权恢复并覆盖本批完成前的后续操作；仅执行一次纠正后的sudo timestamp清理，没有重复备份、SFTP、API或数据库步骤。
- `sudo -K`退出0，随后`sudo -n true`退出1，证明全局timestamp已清除。F6.4-B现为“已实施，待用户人工验收”，不得自动进入DB-2或恢复D4流程。

## 2026-07-23 08批次最终人工验收通过

- 用户最终确认F6.4-B和08生产发布修复批次通过；F0～F6全部关闭。
- 08最终清单逐项绑定实际QA，保留首次RED、环境失败、暂停与授权恢复记录，不改写为首次全部通过。
- 当前生产终态为FIX API与原db healthy；三条migration、九张业务表为空；B0、B1及“F6 release / pre-DB2”恢复点有效。DB-2未执行。
- 活动计划切回`production-deployment`，下一门禁为D4.5 DB-2 `seed-games`施工方案/独立数据库写入授权；本次未执行任何生产连接或写入。
