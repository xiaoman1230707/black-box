# D4.1 制品上传、展开与镜像导入报告

> 日期：2026-07-21
> 状态：旧候选正式失效，D4.1暂停；四项旧制品与唯一失败staging保留，尚未导入镜像
> 候选：`38247ff057310e0f98125a0bbcafbfab2969877c`

## 1. 写入前门禁

- deploy 公钥连接与 `sudo -n` 通过；管理入口为受控 TCP 2222。
- Docker/containerd 正常，Nginx停止，容器/镜像为0，failed units为0。
- 根盘使用16%、可用约31GiB、可用内存1169MiB、Swap约2GiB。
- releases/compose/uploads/postgres均无既有业务现场；受权限保护的uploads/postgres使用`sudo -n`针对性补核为空。

## 2. 唯一 SFTP 与原子落盘

- 仅执行一次默认SFTP会话，退出0；未自动重试、未切legacy SCP。
- 四项制品上传到唯一nonce的`.part`路径；每项均先核对固定大小与SHA，再设为`deploy:deploy 0640`并原子rename。
- API archive：205705216 bytes，SHA `e69cfb105c5146c283dfd8b128bbd97a6c43616edc518f9ef032bef71fecbf76`。
- build manifest：783 bytes，SHA `f16df86a11f57e18ea1652b17c5de8b3be1e6edd024f54f43f12f52d9e006664`。
- deployment bundle：13435 bytes，SHA `6b9d4fac6024ddaeed0b452806e6714e8fc725ab957a5cb290b1231c4db022ff`。
- `SHA256SUMS`：410 bytes，SHA `706a14e6e811ea3e4853ba052b4d3d19b6f8ce1aea17f64c06e57df5572da7b3`。

## 3. 暂停原因与现场

逐项固定SHA验证全部通过后，Linux执行`sha256sum -c SHA256SUMS`时发现该Windows生成清单使用CRLF；工具把行末`\r`纳入文件名，因此三项均为“无法打开”，并非摘要不匹配。

按失败即停契约，未改写控制清单、未重跑交叉校验。当前未展开bundle、未创建compose正式目录、未执行`docker load`、未拉取PostgreSQL镜像、未启动容器或写数据库/uploads。四项最终制品与失败现场保留，等待独立恢复确认。

## 4. CRLF兼容复核与 staging 暂停

用户独立批准后执行只读兼容校验。清单内3个payload全部严格输出`OK`，原始`SHA256SUMS`自身固定SHA另行输出`OK`，合计4项；原文件未修改，历史失败证据继续保留。根因明确登记为Windows CRLF与Linux `sha256sum -c`的文件名兼容问题，不是制品摘要失败。

随后按原D4.1授权进入唯一root staging展开。远端命令非零退出且未到达完成标记，按契约立即停止；staging现场保留，未执行`docker load`或PostgreSQL pull。本地用同一bundle复现Compose YAML和3个Shell文件语法均通过，故障具体落点仍需对精确staging/final路径做一次只读诊断，不据此修改候选制品。

部署工具修正项已登记：后续生成Linux消费的SHA清单统一使用LF并测试换行契约；该项不得在本批修改候选`RELEASE_SHA`或部署源码。

## 5. Linux Shell 换行阻塞

对前次无阶段标记失败做精确只读诊断后确认staging/final均不存在。临时路径断言原本误拦tar内合法父目录`deploy/`；收窄修正后，路径策略、22条目、18文件和0 symlink均通过，并进入原生Shell语法校验。

ECS原生`bash -n`在`backup-pair.test.sh`第12行遇到`{\r`并退出2。对同一候选bundle做本地字节核对后确认3个`.sh`均为纯CRLF：

| 文件 | LF | CRLF | 结论 |
|---|---:|---:|---|
| `backup-pair.sh` | 143 | 143 | 全部CRLF |
| `backup-pair.test.sh` | 145 | 145 | 全部CRLF |
| `verify-stack.sh` | 44 | 44 | 全部CRLF |

这解释了Windows侧语法检查未暴露、Linux原生Bash失败的环境差异。当前唯一staging保留，正式compose目录尚未落地，API/PostgreSQL镜像均未导入。不得在服务器现场转码、忽略脚本或放宽门禁来掩盖候选制品差异；若修Git并产生新release，必须重新建立同SHA制品链。D4.1因此停在人工决策门禁。

### 5.1 三层根因定位

- 旧候选Git blob：3个Shell均为LF，CRLF为0。
- D2 detached worktree：3个Shell均为纯CRLF。
- D4 deployment bundle：3个Shell均为纯CRLF，且逐文件SHA与detached worktree完全一致。
- 旧候选不含`.gitattributes`；生成主机系统级`core.autocrlf=true`。D2 detached worktree在checkout时转为CRLF；D4 bundle并未读取该worktree，实际直接运行`git archive --format=tar.gz --output=<唯一.part> <旧SHA> deploy/production`，随后原子rename。重新执行该命令可稳定复现实际bundle的13435 bytes、整体SHA及3个Shell逐文件SHA，均为CRLF；`git -c core.autocrlf=false archive`则与Git blob逐字节一致为LF。转换点因此精确落在两条各自独立的Git文本导出路径，而不是中间目录、tar压缩、SFTP或ECS。

| Shell | `git show` blob | 直接`git archive` | 实际D4 bundle | 结论 |
|---|---|---|---|---|
| `backup-pair.sh` | 5157 bytes，LF，SHA `ded05b4f...d750` | 5300 bytes，CRLF，SHA `ceaa89a6...ca7f` | 与直接archive相同 | archive首次改变字节 |
| `backup-pair.test.sh` | 4742 bytes，LF，SHA `ea83a162...36d0` | 4887 bytes，CRLF，SHA `65294872...e713` | 与直接archive相同 | archive首次改变字节 |
| `verify-stack.sh` | 2243 bytes，LF，SHA `baa01d65...6972` | 2287 bytes，CRLF，SHA `4a164dde...6d34` | 与直接archive相同 | archive首次改变字节 |

控制组`git -c core.autocrlf=false archive`中，三份文件的大小与SHA分别完全等于上述Git blob；这排除了gzip容器、tar展开和SFTP传输导致换行变化的可能。

旧候选因此正式失效。修正必须在新Git提交中固定Shell LF并增加自动化契约；服务器旧SHA release与staging不得修改、覆盖、删除或与新候选混用。

## 6. 发布源 LF 修正与提交门禁

- TDD RED：新增发布契约测试后，3个生产Shell均显示Git attributes的`text`与`eol`未指定；该失败直接复现旧候选缺少换行契约的问题。
- GREEN：新增根目录`.gitattributes`，固定`*.sh text eol=lf`；测试确认3个Shell均为CRLF 0、bare CR 0且解析为`text=set/eol=lf`。Shell业务内容未改。
- 实际路径一致性：强化后的测试从当前精确暂存Git tree直接执行与D4相同的`git archive`，解包后逐文件比较Git blob与bundle。3个Shell逐字节一致且CRLF/bare CR均为0；当前测试bundle共23条目、19文件、0 symlink，大小14613 bytes，SHA-256为`3FAFC9D0B156F7085A8F4D079FB8C2E2B0AB046D371502DABB0B75CB6CB9EACC`。
- Linux验证：3个Shell的原生`bash -n`全部通过，`backup-pair.test.sh`为4/4；Compose策略7项、AI preflight 8项、镜像输出路径2项以及bundle JSON/PowerShell语法与secret/公网IPv4扫描均通过。
- 应用基线：后端17 suites/81、前端16 files/53、Playwright 9 files/51及两端build通过；前端全量lint保持批准基线3/0，后端全量lint保持D1历史基线833/6，不表述为全仓lint通过。
- 暂存边界：仅`.gitattributes`与`deploy/production/scripts/line-ending-policy.test.ps1`进入暂存区，共144行新增；`CLAUDE.md`与其余历史工作树文件未暂存。

当前停在提交人工门禁。该暂存树尚不是`RELEASE_SHA`；提交获批后必须从新commit创建真正的干净detached worktree，再重建镜像、bundle、manifest和SHA清单并重建D1/D2同SHA证据。旧候选制品及远端staging继续保留，不连接ECS、不现场转码、不恢复D4.1。
