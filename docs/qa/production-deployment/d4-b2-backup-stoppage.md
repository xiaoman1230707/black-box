# B2 `post-DB3 / pre-demo`配对备份暂停报告

> 状态：远端B2与本地异机副本均已完成验证，并于2026-07-23人工验收通过、正式关闭；首次及retry1～retry5失败证据完整保留
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 已完成前置

- D4.5-B / DB-3已由用户人工验收通过。
- B2外层门禁脚本本地通过`bash -n`、LF、SHA-256与敏感信息扫描。
- 唯一一次默认SFTP上传成功，远端脚本经完整SHA、`deploy:deploy 0700`、大小与`bash -n`核验通过。
- 正式执行前`sudo -n`有效；数据库、API、Game、Tag、空业务数据、空uploads、无tool及资源门禁均在脚本内完成只读核对。

## 2. 首次执行失败

正式B2外层脚本只调用一次并以退出码1结束。错误为：

```text
COMPOSE_FILE: readonly variable
BACKUP_ROOT: readonly variable
BACKUP_ROOT must be an absolute path
```

根因是外层脚本先把`COMPOSE_FILE`、`BACKUP_ROOT`等变量声明为`readonly`，随后又以同名临时环境赋值调用FIX release内的`backup-pair.sh`。Bash在启动子进程前拒绝对当前shell的只读变量赋值；子脚本因此没有取得`BACKUP_ROOT`，在绝对路径校验处退出。

这是本批外层编排脚本的变量作用域缺陷，不是FIX `backup-pair.sh`、数据库、归档工具或SFTP失败。

## 3. 状态影响

- 失败发生在FIX备份脚本的`mkdir -p`、API stop、`pg_dump`和uploads归档之前。
- 外层脚本在调用备份脚本返回成功前不会创建导出目录。
- 因而没有形成B2 complete或`.incomplete`恢复点，没有本地下载目录，也没有需要验证的四项归档文件。
- API在本批开始前已经停止，原db保持既有running + healthy基线；本批没有数据库业务写入。
- 未执行seed-demo、embedding、AI、cleanup、restore或migration。

## 4. 当前门禁

严格遵守“任一步失败立即停止且不得自动重试”。当前不修正远端脚本、不再次调用备份、不删除已上传门禁脚本、不启动API、不创建本地副本。恢复需要新的独立授权；建议只修正外层变量传递方式，保持FIX `backup-pair.sh`、唯一B2路径、前置矩阵及全部校验契约不变。

## 5. 获授权恢复与远端B2终态

用户授权从失败点恢复且本批后续无需逐项请示。恢复没有修改FIX `backup-pair.sh`；外层脚本只把子进程调用收敛为`/usr/bin/env NAME=value /usr/bin/bash backup-pair.sh`，并使用全新的唯一B2与导出路径。readonly/env回归fixture、本地及远端语法、LF、SHA、owner/mode/size均通过。

恢复脚本的SSH调用在本地300秒上限处超时，未取得原会话退出码；没有重跑。后续只读现场证明远端进程已结束、没有`.incomplete`，正式B2和deploy导出目录完整存在。完整root只读审计确认：

- 远端正式路径：`/srv/black-box/backups/B2-post-DB3-pre-demo-20260723T054653Z/20260723T055041Z-72350a77acf59ad179b9a89b19544c162033e0ae`。
- `database.dump`：26856 bytes，SHA-256 `4c2f8c48038f0dab067037a30c228b9d9d16f5b01deea30769bee26136d9f9b8`。
- `uploads.tar.gz`：99 bytes，SHA-256 `5ec240651ee71c31d496b0eb06caa7a1dc69e385551e1bf5d3e1c1f1a11b6e3e`。
- `manifest.json`：2169 bytes，SHA-256 `9f593d18a5a4d4aeca6f6acbdcd7892b81beae3bd8807795e78f58c96f137f49`。
- `SHA256SUMS`：161 bytes，SHA-256 `2d99bf13c3ef95f150c5ede9f48122572e3a6c0353a7a88976b487b699b5ab83`。
- 内部SHA、`pg_restore --list`、`tar -tzf`、manifest语义和权限全部通过。
- 快照为3条finished migration、5 Game、5 Tag、其他业务行0、uploads 0文件/0字节；API停止、原db healthy、tool残留0、seed-demo未执行。

## 6. 默认SFTP下载暂停

仓库外本地目标为`C:\Users\15593\Black-box-backups\B2-post-DB3-pre-demo-20260723T054653Z`。唯一默认SFTP会话在本地120秒上限后仍存活；未启动第二次传输，而是等待原SFTP/SSH子进程自行结束。终态两个进程均退出，但本地仅留下被截断且仍为0字节的`database.dump`，其余三项不存在。

因此远端B2已完成且有效，但异机本地副本未闭环。按失败即停约束没有重试、切换legacy SCP、覆盖或删除0字节现场，也没有删除远端导出。sudo缓存未执行计划中的成功后清除动作，因为传输失败后停止了全部远端操作；SSH/SFTP/SCP本机进程已归零。下一步需要新的传输恢复决策。

## 7. retry1在sudo清理步骤超时

用户随后仅授权恢复本地异机副本，并要求第一步单独执行`sudo -K`及`sudo -n true`负向验证。该唯一SSH会话在本地30秒上限处超时，没有返回任何完成标记；原SSH子进程继续存活约73秒后自行退出。

按“任一步再次超时立即停止”约束，没有建立第二个SSH连接，无法证明`sudo -K`或负向验证是否已在远端完成；sudo timestamp状态记为未知。没有执行远端B2复核、没有创建`-retry1`本地目录、没有发起新的SFTP会话，也没有操作数据库、API、tool或seed-demo。历史0字节下载目录保持不变，本机SSH/SFTP/SCP进程最终归零。

## 8. retry2在远端B2只读复核处停止

用户再次授权从暂停点恢复。首次修正后的sudo门禁会话明确返回`sudo -K`退出0，随后`sudo -n true`退出1，证明遗留全局timestamp已清除。其前一条命令曾因本地PowerShell引号转义错误被远端shell在执行前拒绝；该错误没有形成sudo状态证据，修正后未扩大命令范围。

紧接着建立的远端B2只读复核会话返回非零且没有输出任何文件元数据，无法证明四项文件在本次恢复时仍与既有大小和SHA记录一致。既有D3权限证据确认`/srv/black-box/backups`为`root:root 0700`；本次先清除sudo timestamp后再以deploy直接遍历该目录，最符合该“首项前无输出退出”的现象，但不能替代远端元数据证据。按“任一步再次超时或失败立即停止”约束，没有创建新的本地retry目录、没有发起SFTP，也没有重跑`backup-pair.sh`、修改远端B2、连接数据库、启动API/tool或执行seed-demo。历史0字节失败目录继续原样保留。

## 9. retry3在受控导出前的首项SHA解析处停止

用户重新建立deploy全局sudo缓存后，独立验证`sudo -n true`退出0。随后唯一受控导出会话按顺序先以`sudo -n`核对正式B2，再创建deploy导出目录；该会话在首个`database.dump`的SHA输出解析处因`cut`分隔符参数错误退出1。

失败发生在`install -d`之前，因此本次命令没有创建远端导出目录或复制文件；也没有执行计划中的`sudo -K`、创建本地retry1目录或启动SFTP。正式B2未被修改，历史0字节失败目录继续保留，未连接数据库、启动API/tool或执行seed-demo。当前sudo timestamp可能仍有效，必须由后续独立恢复决策处理。

## 10. retry4在首项核对输出处停止

用户再次授权后，独立门禁确认`sudo -n true`退出0。修正版不再使用`cut`，首个`database.dump`的大小和SHA断言已执行，但远端shell将`printf`格式串中的竖线解释为管道并以`command not found`退出1。

该错误仍发生在`install -d`之前，因此没有创建计划中的新远端导出目录或复制四项文件；未执行`sudo -K`、创建本地retry1目录或发起SFTP。正式B2和历史0字节失败目录未修改，未启动API/tool或执行seed-demo；本次sudo timestamp可能仍有效。

## 11. retry5在`SHA256SUMS`大小复核处超时

本次按强制调整将每个远端动作拆成独立SSH命令，未使用远端`printf`、管道、heredoc、awk或组合输出。sudo缓存初始验证通过；`database.dump`、`uploads.tar.gz`、`manifest.json`的`test`、`stat`和`sha256sum`均与固定记录一致，`SHA256SUMS`的`test`也通过。

下一条独立命令`sudo -n stat -c %s <固定SHA256SUMS路径>`在本地64秒上限超时，未取得大小输出。按失败即停，没有执行后续SHA核对、`install -d`、文件复制、本地目录创建或SFTP。获批安全收尾例外已执行：`sudo -K`退出0，随后`sudo -n true`退出1并提示需要认证，确认timestamp已清除。正式B2和历史失败目录未修改，seed-demo未执行。

## 12. retry6受控自主恢复完成

用户批准受控自主执行后，重新建立的sudo缓存验证通过。仓库内一次性门禁脚本先通过`bash -n`、LF、SHA-256和敏感信息扫描，再经SSH stdin执行；脚本只读核对正式B2四项固定路径、大小和SHA，随后创建`/home/deploy/B2-post-DB3-pre-demo-retry1-20260723T064640Z`，目录为`deploy:deploy 0700`，四项导出文件均为`deploy:deploy 0600`。正式源与导出副本逐项大小和SHA一致。

导出后执行`sudo -K`退出0，负向`sudo -n true`退出1并提示需要认证。仓库外创建全新本地目录`C:\Users\15593\Black-box-backups\B2-post-DB3-pre-demo-retry1-20260723T064640Z`；唯一一次默认SFTP会话成功精确下载四项，没有使用legacy SCP、递归、通配符或覆盖历史目录。

本地验证结果：`database.dump` 26856 bytes、SHA-256 `4c2f8c48038f0dab067037a30c228b9d9d16f5b01deea30769bee26136d9f9b8`；`uploads.tar.gz` 99 bytes、SHA-256 `5ec240651ee71c31d496b0eb06caa7a1dc69e385551e1bf5d3e1c1f1a11b6e3e`；`manifest.json` 2169 bytes、SHA-256 `9f593d18a5a4d4aeca6f6acbdcd7892b81beae3bd8807795e78f58c96f137f49`；`SHA256SUMS` 161 bytes、SHA-256 `2d99bf13c3ef95f150c5ede9f48122572e3a6c0353a7a88976b487b699b5ab83`。内部清单两项均OK，`pg_restore --list`为98行，`tar -tzf`可读且仅含`./`，manifest确认FIX SHA、3 migrations、5 Game、5 Tag、其余业务表与uploads为空。

受控自主批内远端导出和默认SFTP均首次成功，无网络重试；仅API停止的无提权只读命令首次被本地PowerShell提前展开，修正后确认3000无监听。该差异未触发远端写入。全批未操作容器或数据库，故db保持批前已验收healthy状态；API继续停止，seed-demo未执行。远端deploy导出按约束保留，等待B2人工验收后独立清理。

## 13. B2人工验收与关闭

- 用户已人工确认远端正式B2和仓库外本地retry1副本通过，B2门禁正式关闭。
- 本地成功副本在关闭时再次核对四项固定大小/SHA、内部`SHA256SUMS`、98行`pg_restore --list`与空uploads归档，结果不变。
- 历史0字节及其他失败目录继续保留；不改写首次和retry1～retry5失败证据。
- 远端deploy导出目录仅是传输接缝，不是正式恢复点；在正式B2和本地副本复核后，获准逐项删除四个固定文件并以`rmdir`删除空目录。正式B2不得修改。
- B2关闭不授权`seed-demo`。下一门禁为D4.6 / DB-4施工方案、生产只读预检与独立数据库/uploads写入授权。
- 关闭后的精确收尾已完成：正式B2与本地副本复核不变后，deploy导出中的四个固定文件分别删除，空目录由`rmdir`删除；正式B2、本地成功副本和历史失败目录均保留。
