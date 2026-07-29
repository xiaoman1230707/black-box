# D4.1 新候选制品上传与导入报告

> 日期：2026-07-21
> 候选 SHA：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
> 状态：D4.1已实施并经用户人工验收通过

## 1. 已完成范围

- 新SHA release目录按`deploy:deploy 0750`创建，创建前确认新release、正式compose及唯一staging目标均不存在。
- 在唯一一次SFTP会话中上传API image archive、build manifest、deployment bundle及LF `SHA256SUMS`。每项使用唯一`.part`路径并设为`0640`。
- 四项`.part`先全部通过固定大小和SHA-256核对，再原子rename；release目录终态为4个正式文件、0个`.part`。
- 远端直接运行未经转码的原始LF `SHA256SUMS`，其列出的3项载荷全部返回`OK`。没有使用`sed`或任何现场换行修复。
- transfer manifest职责仅为本地传输溯源证据，未上传，也未混入`SHA256SUMS`三项载荷计数。

## 2. 暂停点与根因

bundle预展开审计在远端Python tar成员路径断言处非零退出。该断言运行在staging创建与tar展开之前，因此本次没有创建新staging、没有落地正式compose目录，也没有执行`docker load`或PostgreSQL pull。

对同一固定bundle在本地只读复现：

- tar成员总数：23；
- 普通文件：19；
- 目录：4；
- symlink：0；
- 文件和目录均位于`deploy/production`受控树下。

根因是Python `tarfile`把目录成员名规范化为`deploy`和`deploy/production`，不保留tar列表显示的尾斜杠；临时审计断言却只把`deploy/`和`deploy/production/`视为两个合法根目录。该结果属于审计工具口径错误，不是bundle集合、换行或哈希失败。

## 3. 当前边界

- 新SHA release中的4项正式制品保留，不覆盖、不删除、不重新上传。
- 旧SHA release/staging未触碰。
- API image尚未导入；指定PostgreSQL镜像尚未拉取；Compose/API/PostgreSQL均未启动。
- 未创建或注入env/secret，未运行migration、seed、embedding或AI调用。
- 未修改Nginx、UFW、安全组、sshd、DNS或Vercel。
- 按失败即停契约没有自动重试或切换传输方式。恢复D4.1前需由用户确认修正后的只读审计口径。

## 4. 首次恢复结果

用户确认修正tar目录名规范化口径后，远端预展开审计确认23个成员、19个文件、4个目录、0 symlink，所有成员均位于受控`deploy/production`树下，且无绝对路径或`..`路径。bundle随后展开到唯一root staging。

审计在Compose语法步骤再次非零退出，错误为`unknown flag: --no-interpolate`。临时命令把`config`子命令专属的`--no-interpolate`、`--no-env-resolution`放在了`config`之前；CLI在读取`compose.yaml`前即拒绝参数。因此该失败不构成Compose配置或候选制品失败。

按照失败即停契约，本次没有重跑。唯一staging保留，正式compose目录仍不存在；没有执行API `docker load`或PostgreSQL pull，也没有启动任何容器。下一次恢复必须从保留staging继续，只修正为`docker compose -f <file> config --quiet --no-interpolate --no-env-resolution`，不得重新展开、覆盖或清理现场。

## 5. 恢复与正式 compose 落地

用户授权本批完成前连续执行后，仅从保留staging继续，没有重复上传或展开。修正后的Compose命令、4个PowerShell文件固定SHA、安全扫描与owner/mode检查全部通过；唯一staging随后原子rename为新SHA正式compose目录。

- 正式compose文件：19；
- Shell：3，全部LF且`bash -n`通过；
- symlink：0；
- 非root owner/group：0；
- private key marker：0；
- 非预期IPv4：0；
- 真实`.env`：0。

## 6. API 镜像审计

`docker load`前再次核对archive SHA-256，结果与固定候选一致。导入后核对：

- image ID与固定候选一致；
- 平台：`linux/amd64`；
- 运行用户：`10001:10001`；
- 工作目录：`/app`；
- 入口：`node dist/src/main.js`；
- healthcheck存在且命中本地`/api` liveness；
- OCI revision等于本次`RELEASE_SHA`；
- Node index与linux/amd64 manifest digest符合build manifest；
- 3个第一层migration目录及独立`migration_lock.toml`存在；
- 4个初始化脚本、10个fixtures存在；
- image history敏感值扫描0命中。

内容检查使用一次`--network none`短生命周期容器，未启动API；退出后容器数恢复为0。

## 7. PostgreSQL 镜像审计

仅执行一次Compose固定digest的PostgreSQL 16拉取。registry index digest、唯一`linux/amd64` manifest及本地镜像平台均与批准证据一致。没有启动PostgreSQL容器，也没有接触生产数据目录。

## 8. D4.1终态

- 新SHA release：4个正式文件、0个`.part`；
- 新SHA compose：19个文件、0 symlink；唯一staging已不存在；
- 镜像：2个批准镜像；容器：0；
- 旧SHA release：仍为4项，未覆盖或删除；
- Docker/containerd：active+enabled；
- Nginx：inactive+disabled；
- 80/443/3000/5432/2375/2376监听：0；
- failed units：0；
- 可用内存约1.07GiB，Swap总量约2GiB且基本空闲，可用磁盘约29.7GiB，满足D4门禁；
- deploy sudo缓存已清除，本机SSH/SCP/SFTP进程0。

D4.1自动门禁完成后已由用户人工验收通过。本报告只关闭D4.1，不授权Compose启动、数据库/uploads写入、migration、seed、embedding、AI、Nginx、证书、DNS或Vercel；D4.2另以独立E授权推进。
