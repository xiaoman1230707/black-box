# F6.2 新候选制品上传、审计与镜像导入报告

> 状态：已实施，用户人工验收通过

## 1. 固定候选与恢复前门禁

- `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`。
- 前置门禁精确锁定两个既有容器：原生产db继续running+healthy，旧候选API继续exited 137；两者OOM=false、restart=0，且不存在第三个、oneoff、migrate、tools或其他project容器。
- 新SHA正式release、compose及两个唯一staging路径在创建前均不存在。
- 资源门禁通过：MemAvailable、SwapFree和磁盘可用量均高于批准阈值。
- 只创建了新SHA专属release staging；没有创建正式release、compose或compose staging。

## 2. 唯一SFTP会话

一次SFTP会话退出0，四项固定制品分别写入唯一`.part`路径：

- API image archive；
- build manifest；
- deployment bundle；
- 原始LF `SHA256SUMS`。

未重试、未使用legacy SCP，也未覆盖任何旧候选路径。

## 3. finalize停止点

远端finalize脚本启用`set -u`。`verify_part()`将`name`赋值与依赖该变量的`part`路径拼接放在同一条`local`声明中，Bash在该声明完成前展开`${name}`，因此报告`name: unbound variable`并立即退出。

停止发生在第一个`.part`存在性、大小和SHA检查之前。因此当前现场为：

- 四项上传文件仍保持唯一`.part`名称；
- 尚未对远端制品执行固定大小或SHA核验；
- 尚未rename或原子提升正式release；
- 未创建或展开compose staging，未落正式compose；
- 未执行`docker load`，新FIX API镜像未导入；
- 未创建或启动任何容器，两个既有容器状态没有被脚本修改；
- 未读取或写入生产数据库，未执行migration、seed、restore、AI或cleanup。

## 4. 本地最小修正与恢复边界

本地脚本仅把`local name/size/sha`与`local part=...`拆为两条声明，避免`set -u`提前展开；没有修改校验、上传、镜像或生产契约。按异常即停要求未自动重连或重跑。

恢复时必须从现有四项`.part`继续，禁止重新上传、覆盖或清理；先逐项执行固定大小和SHA核验，任一不符即继续保留现场并停止。恢复仍需用户明确授权。

## 5. 已授权恢复与成功结果

用户授权从现有`.part`继续后，finalize先重新锁定两个既有容器的完整ID和状态，再完成：

- 四项`.part`固定大小和SHA-256全部通过后，在release staging内原子rename；
- 原始LF `SHA256SUMS`在Linux直接执行，API archive、build manifest和deployment bundle三项均输出`OK`，未使用`sed`或重写；
- bundle预展开白名单通过：24个成员、20个文件、4个目录、0 symlink，无绝对路径或`..`穿越；
- release staging原子提升为正式release；compose在独立root staging中完成20文件、0 symlink、3个Shell全LF和`bash -n`、JSON、Compose及敏感内容检查后原子提升；
- API archive在`docker load`前再次通过固定SHA，镜像仅导入一次；镜像ID、linux/amd64、`10001:10001`、`/app`、OCI revision、正式入口和healthcheck全部符合固定候选；
- 直接解析Docker archive分层完成内容审计，无需创建或启动容器：3个migration目录、独立migration lock、4个初始化脚本和10个fixture完整；
- PostgreSQL既有镜像ID与amd64架构只读复核通过，未重复拉取；
- 终态仍精确为原db和已知停止API两个容器，运行中的Compose service仅db；未启动API或tools。

资源前后证据：

| 项目 | 执行前 | 执行后 |
|---|---:|---:|
| MemAvailable kB | 1124140 | 1106012 |
| SwapFree kB | 2096112 | 2095856 |
| `/srv/black-box`可用字节 | 31396884480 | 30829010944 |
| 唯一镜像数 | 2 | 3 |

正式终态：release为4文件，compose为20文件且0 symlink，新API镜像ID为`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`。80/443/3000/5432/2375/2376无监听，failed units为0。

## 6. sudo缓存收尾停止点

收尾命令使用`sudo -n -K`，当前sudo把该组合判为无效用法并返回非零；后续shell仍打印了完成标记，因此该标记不能作为缓存已清除证据。未自动改用`sudo -K`重试。

这是sudo缓存清理命令的参数兼容问题，不影响已完成的制品、正式目录、镜像或容器终态。完成F6.2正式收口前，需要一次精确的`sudo -K`并验证后关闭SSH；不得重复上传、finalize或镜像导入。

## 7. sudo缓存精确收尾

用户独立授权后，在一个deploy SSH会话中仅执行缓存清理及其负向验证：

- `sudo -K`退出码：`0`；
- 紧随其后的`sudo -n true`退出码：`1`；
- 负向验证明确提示需要认证，证明全局sudo timestamp已清除。

本地PowerShell把预期的sudo stderr包装为NativeCommandError，且远端`printf`的换行转义在本地呈现为字符`n`；这不改变分别记录的两个退出码和“需要密码”的负向证据。没有自动重试，也没有修改sudoers、NOPASSWD或timestamp配置。

至此F6.2全部实施项闭环；状态为“已实施，待用户人工验收”。该状态不授权F6.3。

用户已于2026-07-23人工确认F6.2通过，并独立授权仅执行F6.3新镜像数据库兼容只读门禁；该授权不覆盖F6.4生产API切换。
