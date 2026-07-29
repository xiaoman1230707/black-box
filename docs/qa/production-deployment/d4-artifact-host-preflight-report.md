# D4.0 制品与主机前置核验报告

> 日期：2026-07-21
> 状态：D4.0主机门禁已人工验收并正式关闭；本节旧候选bundle结论随后被D4.1 Linux Shell CRLF阻塞推翻，旧候选已失效
> 候选：`38247ff057310e0f98125a0bbcafbfab2969877c`
> 边界：D4.0 未上传、导入或拉取镜像，未创建 release/Compose/secret，未写数据库/uploads，未调用 AI；管理入口修复由独立授权完成，D4.1 另行授权

## 1. 工作树保护

- 候选 Git commit 对象存在，完整 SHA 与本报告候选一致。
- deployment tree 通过 `git ls-tree` 从候选对象读取，共 18 个 `deploy/production` 文件。
- 当前暂存区为 0；bundle 未从当前脏工作树复制。
- `CLAUDE.md` SHA-256 保持 `E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。
- `git diff --check` 无补丁错误，仅既存 CRLF 提示。

## 2. D2 制品唯一性与身份

D2 仓库外保留现场的 `artifacts` 目录只有以下两个文件，按固定大小与 SHA 精确命中：

| 对象 | 大小 | SHA-256 | 结果 |
|---|---:|---|---|
| image archive | 205705216 bytes | `e69cfb105c5146c283dfd8b128bbd97a6c43616edc518f9ef032bef71fecbf76` | 通过 |
| build manifest | 783 bytes | `f16df86a11f57e18ea1652b17c5de8b3be1e6edd024f54f43f12f52d9e006664` | 通过 |

未执行 `docker load`。直接读取 archive 的 OCI/Docker 元数据后确认：

- image tag：`black-box-api:38247ff057310e0f98125a0bbcafbfab2969877c`；
- image ID/index digest：`sha256:af0789ef7e7d81337aec69e52b8287ac0343a095457392acdf483f8a768e51d4`；
- 平台：`linux/amd64`；运行用户：`10001:10001`；工作目录：`/app`；
- entrypoint：`docker-entrypoint.sh`；命令：`node dist/src/main.js`；
- OCI revision 与候选 SHA 完全一致；Node base index/amd64 manifest 与 D1 固定值一致；
- 镜像内容包含且仅命中 3 个 migration、4 个初始化脚本和 10 个演示 fixture。

## 3. Deployment bundle

bundle 的实际生成命令链为：创建仓库外唯一证据目录 → `git archive --format=tar.gz --output=<bundle.tar.gz.part> <RELEASE_SHA> deploy/production` → 命令成功后`Move-Item`原子改名为最终bundle → `tar -tzf`生成清单。该链没有checkout/index export或中间源码目录。

- 文件：`black-box-deployment-38247ff057310e0f98125a0bbcafbfab2969877c.tar.gz`；
- 大小：13435 bytes；
- SHA-256：`6b9d4fac6024ddaeed0b452806e6714e8fc725ab957a5cb290b1231c4db022ff`；
- tar 共 22 个目录/文件条目，其中 18 个文件全部位于 `deploy/production`；
- 未包含真实 `.env`、私钥、真实 secret、公网 IPv4、`node_modules`、`dist`、`uploads`、Git 元数据或嵌套构建制品；
- 仅存在 loopback/通配绑定字面值、不可发布 placeholder、`example.invalid` 和既定 provider URL。

D4.1后续字节取证确认：旧SHA的Git blob为LF，但上述直接`git archive`在attributes未指定、系统级`core.autocrlf=true`时导出CRLF；重新执行同一命令可得到与本节实际bundle完全相同的大小、整体SHA和3个Shell逐文件SHA。故本节“来自Git对象”的溯源判断成立，但“Linux可执行”判断不成立，不能再把该旧bundle作为发布制品。

仓库外证据目录：`C:\Users\15593\Black-box-backups\d4-preflight-20260721T032231Z`。其中保存 bundle、文件清单、脱敏扫描结果、`transfer-manifest.json` 和 `SHA256SUMS`。传输 manifest 同时列出 image archive、build manifest 与 deployment bundle，并固定同一 `releaseSha`；复核时三项 size/SHA 全部重新匹配。

## 4. ECS 只读门禁

首次 D4.0 连接在认证完成和远端命令执行前被关闭。用户随后单独授权一次只读恢复核验，执行结果为：

- `ssh -G` 仅做本地解析，确认 user、`BatchMode`、`IdentitiesOnly`、连接超时和 Host alias 均符合本批契约；未把解析出的公网地址或私钥路径写入证据。
- 使用解析结果进行一次 TCP 22 连通性测试，结果为可达。
- 随后只建立一次普通 SSH 会话；连接再次在认证完成和远端命令执行前被关闭，退出码为255。
- 远端只读检查没有开始，未执行 `sudo`，未创建远端脚本或证据文件，也未发生远端写入。

在取得Workbench日志前，Codex侧证据只能把故障边界收窄为“TCP 22 已建立可达，但 SSH 会话在认证完成前被远端关闭”，当时不足以归因于UFW、Docker、Nginx或资源状态，也不能据此修改DIRECT、SSH、安全组、密钥或认证方式。

### 4.1 Workbench 脱敏日志定位

用户随后通过 Workbench 在失败时间窗口内完成只读核查，提供的脱敏证据为：

- `sshd -t`通过；deploy上下文为`pubkeyauthentication yes`、`passwordauthentication no`、`kbdinteractiveauthentication no`、`authenticationmethods any`。
- `MaxStartups`为`10:30:100`，`PerSourceMaxStartups none`；对应截图未出现MaxStartups/drop connection日志。
- 内核在与失败连接对齐的时间窗口内，连续记录`[UFW BLOCK]`、`PROTO=TCP`、`DPT=22`和SYN重传；地址已脱敏。
- socket总量很低；conntrack为`7 / 65536`，不存在conntrack耗尽。
- `/home/deploy/.ssh/authorized_keys`权限链为home可遍历、deploy home `0750`、`.ssh` `0700`、`authorized_keys` `0600`，owner/group均符合deploy账号。
- 此前同一Workbench会话已确认ssh服务active、failed units为0、可用内存约1.1GiB、2GiB Swap未使用；未见OOM或系统资源压力证据。

**根因判断：** 本次Codex侧SSH失败由ECS主机UFW在sshd认证之前拦截TCP 22流量造成。最可能的直接条件是当前连接到达ECS时的来源IPv4不再匹配既有唯一管理`/32`允许规则。该结论解释了“TCP层探测可达但后续SSH认证前关闭”，并排除公钥拒绝、authorized_keys权限、认证方法、MaxStartups、conntrack和OOM作为本次主因。

该根因确认不构成UFW写入授权。修复必须使用Workbench保持可用管理通道，在新的独立E门禁中无泄露地比较当前来源与既有规则，并采用防锁死顺序更新唯一管理`/32`；在此之前D4.0继续暂停。

上述内容是修复前的历史故障快照，不代表 D4.0 终态。经独立网络修复授权，管理链路完成如下收敛：

- 管理 SSH 迁移至 TCP `2222`；本机 `black-box-ecs` 以 deploy 身份和该端口完成公钥登录实测。
- TUN 保持开启；ECS 专属客户端规则受限于只能指向代理策略组，不能绑定具体节点。该限制已被接受，但部署期间必须保持当前节点不变；出口变化即暂停。
- UFW 与阿里云安全组仅保留“批准代理出口 IPv4 `/32` → TCP 2222”。公网 22、80、443、3000、3389、5432 均未开放，无 IPv6 SSH allow；sshd 内部继续监听 22 不等于公网暴露。

修复后使用受控 alias 完成一次新鲜只读主机复核，以下 D4.0 必检项全部通过：

- D3 SSH hardening、Swap、Docker与目录配置无漂移；
- Docker/containerd 正常，业务容器与镜像均为 0；
- Nginx inactive/disabled；
- UFW 仅批准代理出口 IPv4 `/32` 到 TCP 2222，安全组口径一致；
- 80/443/3000/5432 无监听，无异常监听；
- 七个持久目录为空且 owner/mode 符合矩阵；
- 根盘、可用内存和 Swap 满足 D4 阈值，failed units 为空。

恢复核验严格只执行了用户授权的一次连接；失败后未自动重试，未修改 DIRECT/SSH/UFW/安全组或认证配置。本机 SSH/SCP/SFTP 进程复核为 0。

## 5. 门禁结论

- **本地制品：通过。** 候选身份、唯一性、archive/manifest、镜像内容、同 SHA bundle 和传输清单闭环。
- **ECS 主机：通过。** 历史SSH故障已按独立授权修复，2222管理链路、安全边界与主机新鲜只读矩阵均通过。
- **D4.0：正式关闭。** 用户已人工确认，可在独立E授权下进入D4.1；该结论不授权D4.2及后续动作。
