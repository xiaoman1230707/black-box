# D3.6 重启前技术预检报告

> 日期：2026-07-20
> 状态：重启前只读预检通过，等待独立重启 E 授权
> 边界：未执行 reboot/shutdown/实例停止，未开放 80/443，未修改安全组，未上传镜像、启动 Compose、写数据库或进入 D4

## 1. 执行与证据

- 用户先在自己的 deploy 终端执行 `sudo -v`；agent 仅使用 `sudo -n`。前置新会话确认 deploy key、sudo 组和非交互缓存有效。
- 只读预检脚本在 Gate B 现场精确清理后执行，输出 `D3_REBOOT_PRECHECK_COMPLETE=true` 与 `D3_REBOOT_AUTHORIZED=false`；没有调用任何重启命令。
- 脱敏证据保存在仓库外 `C:\Users\15593\Black-box-backups\d3-reboot-precheck-20260720T081255Z`。归档 SHA-256 为 `472DE33FDC85B0343DCF6EF9BC305AC374024140961CC1092943F62C80E3116B`，包含 23 个文件，内部 manifest 为 22/22 通过。
- 通用扫描的 8 个疑似 secret 均为 OpenSSH 算法名中的 `sk-ssh-*`，不是值或凭据；预检归档中的两处 `0.0.0.0` 是 SSH wildcard 监听记录，不是真实管理 IPv4 或地址泄露。secret 与真实管理源地址扫描仍为 0 命中；仓库外 Gate B 证据和本预检证据均未包含真实管理地址、密码、私钥或服务 secret。
- 预检与独立 postverify 完成后已执行 `sudo -K`；用户随后确认最后一个交互式 SSH 会话已关闭。本机终态复核为 `ssh/scp/sftp` 进程 0、到远端 22 端口的 ESTABLISHED 连接 0。

## 2. SSH 与 sudo

- `sshd -t` 通过；配置中不存在活动 `Match` 块，因此使用 TEST-NET 地址分别执行 root/deploy 的 `sshd -T -C` 不会遗漏地址条件覆盖。
- root 与 deploy 有效值一致：`PermitRootLogin no`、`PasswordAuthentication no`、`KbdInteractiveAuthentication no`、`PubkeyAuthentication yes`、`X11Forwarding no`、`AllowTcpForwarding no`、`AllowAgentForwarding no`。
- 新 deploy 会话登录和 `sudo -n` 通过。sudoers drop-in 为 `root:root 0440`、76 bytes，单文件与全局 `visudo` 均通过；预检后已执行 `sudo -K`。

## 3. 服务、挂载与资源

- `nginx -t` 通过；Nginx 保持 inactive+disabled。
- `dockerd --validate --config-file /etc/docker/daemon.json` 通过；Docker/containerd 均 active+enabled，Docker 29.6.2、日志驱动 `json-file`、容器/镜像均为 0。
- `findmnt --verify` 为 0 parse error、0 error；唯一 warning 是 `/swapfile` 为普通文件，符合 swapfile 设计。
- `/swapfile` 为 `root:root 0600`、2GiB；fstab 有且仅有一条目标记录，运行时 swappiness=10，当前 Swap 使用为 0。重启持久性尚未验证。
- 根盘 40G，使用 16%，约 32G 可用；内存约 1.6GiB，总 available 约 1.1GiB。当前内核为 `5.15.0-181-generic`，采集时 uptime 约 1 天 3 小时。

## 4. 防火墙、系统与目录

- UFW active，默认 deny incoming、allow outgoing、deny routed；唯一 user rule 为可信 IPv4 `/32` 到 `22/tcp`，无 IPv6 SSH allow。监听门禁区分协议与进程归属：TCP仅22/53；UDP仅允许systemd-resolved 53、systemd-networkd DHCP 68与回环chronyd 323。无 80/443/3000/3389/5432/2375/2376。此前“监听仅22/53”是TCP/公网服务暴露的简写，不代表关闭系统必要的DHCP与chrony UDP端口。
- chrony active，`NTPSynchronized=yes`，leap status normal；cloud-init status=done。
- `dpkg --audit` 为空；hold 仍仅 `cloud-init`、`intel-microcode`；failed units 为空，无 reboot marker。
- 七个持久目录 owner/mode 与门禁 A 矩阵一致；uploads 保持数值 UID/GID `10001:10001 0750`，postgres 保持 `root:root 0700`，D4 前仍需按精确镜像 UID/GID 调整。

## 5. 重启后必须复验的终态矩阵

| 项目 | 重启后通过条件 | 失败处置 |
|---|---|---|
| SSH | deploy key 新会话成功；root/password/keyboard-interactive 仍禁用；转发项仍关闭 | 停止后续部署，使用控制台/既有恢复方案核查，不放宽安全组或恢复 root SSH |
| sudo | 用户交互 `sudo -v` 后新会话 `sudo -n` 成功；drop-in owner/mode/内容及 visudo 通过 | 停止，使用交互终端修复，不配置 NOPASSWD |
| Swap | `/swapfile` 自动启用、2GiB、0600；fstab 唯一记录；swappiness=10 | 停止 D4，按 D3.3 备份/回滚口径修复 |
| Docker | docker/containerd active+enabled；daemon 配置校验通过；容器/镜像仍为 0 | 停止，不加载镜像或启动 Compose |
| Nginx | 配置测试通过且仍 inactive+disabled；80/443无监听 | 停止，不开放 Web 端口 |
| UFW | active；三项默认策略不变；唯一 IPv4 `/32` SSH规则；无IPv6/Web/数据库/Docker API规则 | 停止；若SSH失败走已审查恢复口径，不放宽为全网 |
| 时间/系统 | chrony active、NTP同步、cloud-init done、dpkg audit空、hold不变、failed units空 | 停止并诊断，不进入D4 |
| 持久目录 | 七个目录及sudoers/daemon配置owner/mode不变 | 停止并按矩阵修复，不删除已有数据 |
| 资源/监听 | 根盘与内存满足门禁；无持续Swap；TCP仅22/53，UDP仅允许已核验进程的53/68/323；内核/uptime记录为重启后新值 | 出现未知监听、进程归属/绑定范围漂移、failed unit、持续Swap或磁盘不足则D3不通过 |

## 6. 当前门禁

D3.6 的重启前技术条件成立，但这不构成重启授权。下一步必须由用户单独授予 reboot E 权限；授权前不得执行 reboot、shutdown、实例停止或 D4。
