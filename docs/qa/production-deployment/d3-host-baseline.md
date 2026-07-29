# D3.1 ECS 主机只读基线

> 日期：2026-07-19
> 状态：D3.1 已人工验收通过；D3.2 已获范围内 E 写入授权，root 管理会话已建立并保持

> D3.2 进度：root 管理会话已获S授权并保持；deploy账号、home、唯一已验证公钥和sudo组已配置；尚未修改sshd。

> D3.2 密码门禁：用户已亲自设置sudo密码；原root会话只读确认密码状态为已设置，deploy/sudo组、公钥一致性及0700/0600权限均保持正确。密码值未被agent接触或记录，sshd仍未修改。

> D3.2 hardening过程：用户保持中的第二deploy会话完成key、home、组和`sudo -v`验证。原root会话随后备份现有SSH配置，写入独立snippet并reload；reload前后`sshd -t`及root/deploy双上下文均通过。该阶段曾保持root与deploy会话，直至第三个全新deploy会话验证成功。

> D3.2 状态：已人工验收通过并关闭；root及两个deploy SSH会话均已关闭。当前等待D3.3只读预检的独立S授权。

## D3.2 SSH无锁死加固证据

- deploy账号/home/bash shell、deploy/sudo组、公钥一致性及0700/0600权限通过；未加入docker组。用户独立设置sudo密码，agent未接触值。
- 用户经独立S授权建立并保持第二deploy会话，验证key登录、身份、home与sudo成功；验证前未修改sshd。
- 原SSH配置及snippet目录已备份到root私有固定目录并生成SHA manifest；备份不包含`authorized_keys`。
- hardening snippet为root:root、0600，固定：公钥开启；密码、keyboard-interactive、root远程、X11、TCP forwarding、agent forwarding关闭。
- reload前后`sshd -t`、SSH service active及root/deploy双上下文`sshd -T -C`均通过；仅reload，未restart。
- 用户经第三次独立S授权建立全新deploy会话并再次验证key、身份、home与sudo。root终态复核同时观察到两个deploy sshd会话。
- 未获root/password/interactive等负向连接的独立S授权，因此没有实际执行；双上下文静态证据已证明相关有效值关闭。
- `cloud-init`、`intel-microcode`hold保持不变；未安装/升级软件，未配置Swap/UFW/安全组或进入D3.3。
- agent持有的原root连接已在终态通过后关闭；用户随后确认第二、第三deploy会话均已退出。D3.2结束时无保留SSH会话。

## 执行边界

- 用户以固定语句授予本次 S 权限后，通过本机已配置的 `black-box-ecs` Host alias 建立一次 SSH 会话。
- 本次仅执行只读命令；未创建用户、修改 SSH、安装软件、启用 UFW、修改安全组或写入云端配置。
- 远端输出在采集阶段脱敏；本文不记录公网 IP、出口 IP、用户名、私钥路径或认证材料。
- 会话命令结束后 SSH 连接已关闭；因逐连接 S 门禁，本次不自动重连。

## 本地保护证据

- 当前 HEAD 与候选 `RELEASE_SHA` 一致：`38247ff057310e0f98125a0bbcafbfab2969877c`。
- 暂存区文件数：`0`。
- `CLAUDE.md` SHA-256 与 D0 保护值一致。
- D2 QA 仍记录仓库外候选镜像 archive、build manifest、source/restore 数据与配对备份处于保留状态；本次未触碰 D2 现场。

## 主机事实

| 项目 | 只读结果 | 判定 |
| --- | --- | --- |
| OS / 架构 | Ubuntu 22.04 Jammy / `x86_64` | 符合 |
| Kernel | `5.15.0-181-generic` | 记录 |
| CPU | 2 vCPU | 符合实例规格 |
| 内存 | 总计约 1.6 GiB，可用约 1.0 GiB | 符合 2 GiB 规格的系统可见值 |
| Swap | 0，未配置 | D3.3 待实施 |
| 根磁盘 | 40 GiB，总使用约 9%，可用约 35 GiB | 高于 8 GiB 门槛 |
| cloud-init | done | 符合 |
| 时间同步 | 已同步 | 符合 |
| 时区 | Asia/Shanghai | 记录，D3 后续按运行口径复核 |
| failed units | 0 | 符合 |

## 网络与 IPv6

- 已解释监听：SSH `22/tcp` 同时绑定 IPv4/IPv6 wildcard；本地 DNS、DHCP 与 chrony 为系统服务。
- 未发现 `3000`、`5432`、`3389` 或其他业务监听。
- 全局 IPv6 地址数为 0；无公网 IPv6，无 IPv6 默认路由。
- `/etc/default/ufw` 的 `IPV6=yes`，但 UFW 当前 inactive、规则数为 0。
- `[::]:22` 监听只表示 sshd IPv6 wildcard socket；在无全局 IPv6与默认路由的当前主机上，不等同于公网 IPv6 已开放。
- 用户已在阿里云控制台人工确认：SSH 22仅可信IPv4 `/32`；无3389、3000、5432、80、443或IPv6 SSH入方向规则。
- 公网IPv4 ICMP作为用户已批准的临时诊断例外保留；该结论不附截图、不保存真实地址或安全组敏感信息，并在最终安全收口/下线清单中重新核对。

## SSH 有效配置（D3.1加固前历史快照）

- 现有 `Match` 指令数：0；`sshd_config.d` snippet 数：0。
- 已分别执行 root 与 deploy 上下文的 `sshd -T -C user=...,host=...,addr=...`，两者结果一致，不存在 `Match` 覆盖差异。
- 生效项：公钥认证开启；密码认证关闭；keyboard-interactive 关闭；PAM 开启。
- D3.1采集时的加固前历史快照显示root登录、X11 forwarding、TCP forwarding与agent forwarding仍允许；这不是当前终态。D3.2已将它们统一收口为`no`，最终值见本文件D3.2证据。首批部署无这些转发用途，未来如需开启必须独立评审。
- deploy 上下文解析成功不代表 deploy 系统账号已存在；本次未执行登录尝试。

## 软件与更新基线

- Docker Engine、Compose、Nginx、Certbot 与 PostgreSQL 客户端均未安装。
- APT hold 数为 2，准确包名为`cloud-init`与`intel-microcode`；待升级包为 59 个，包含 OpenSSH、cloud-init、curl、证书与系统库更新。后续不得自动取消hold，变更前先报告实际APT计划。
- `docker.service`、`docker.socket`、`nginx.service`、`postgresql.service`均为not-found/inactive；与软件未安装事实一致。

## 补充只读采集

- 用户再次以固定语句授予S权限后建立一次连接；修正后的临时脚本正常输出完成标记，随后连接关闭。
- deploy账号不存在，符合D3.2“新建普通deploy用户”的前置；当前没有deploy组信息可继承。
- UID 0账号仅1个、无重复UID 0；没有UID≥1000且具交互shell的普通账号，未发现新增异常交互用户。
- 监听仍仅为SSH及系统DNS/DHCP/chrony；未新增3389、3000、5432或其他业务监听。
- 全局/公网IPv6仍为0，无IPv6默认路由，暴露面相较主基线无漂移。

## 执行异常与未知项

- UFW 统计命令出现一条 awk 转义 warning，但随后得到的 UFW inactive、规则数 0 与 IPv6 规则数 0 均正常输出；未据此执行任何写入。
- 首次远端脚本最后的 `service_state` 小节因 shell 末尾语法错误未执行；当时遵守S门禁未自动重连。后续在用户新的S授权下以修正脚本补采成功，首次失败证据继续保留以维持审计链。
- 安全组、deploy账号、APT hold、系统交互账号、相关service状态、监听与IPv6等原未知项现均已闭合；未发现需要在D3.2前改变既定方案的异常。

## D3.1 结论

主机 OS、架构、cloud-init、资源、磁盘、账号、service和监听满足D3.2前置；未发现既有 Docker/Nginx/PostgreSQL 运行现场，安全组暴露面已由用户人工确认，补充采集未发现漂移。该结论是D3.1关闭时的前置判断；D3.2现已另行获E/S授权、实施并人工验收通过，当前终态以本文件D3.2证据为准。
