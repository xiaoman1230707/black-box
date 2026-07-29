# D3.6 单次重启与持久性验证报告

> 日期：2026-07-20
> 状态：已实施、已人工验收通过并完成远端临时现场清理
> 边界：仅执行一次操作系统重启；未开放80/443、未上传业务镜像、未启动Compose、未写数据库、未进入D4

## 1. 重启事实

- 重启前boot ID：`a16d5be0-54c6-4c40-8ba2-9fc223c797b9`。
- 重启后boot ID：`18e6f8a0-7a0b-47e7-b2dc-78b225cbfb33`，与重启前不同。
- 首次轮询即恢复deploy key登录，首次恢复uptime为`19.02`秒；后续排障与证据闭环完成时uptime为`3046.38`秒。
- 仅调用一次`sudo -n systemctl reboot`；未执行第二次reboot、shutdown、实例停止或控制台电源操作。

## 2. 持久性矩阵

- SSH：`sshd -t`通过；root/deploy上下文均保持root登录、密码、keyboard-interactive、X11、TCP forwarding和agent forwarding禁用，公钥认证启用。
- sudo：全局timestamp drop-in仍为`root:root 0440`、76 bytes，SHA-256=`9C2971EE357A9DC4DDB14502DFD0FBE20EC4BA8DA0CAAEBD57738B6C01FBA0DA`；单文件与全局visudo通过，无NOPASSWD。
- Swap：`/swapfile`自动启用，`root:root 0600`，大小`2147479552` bytes；fstab唯一条目、`findmnt --verify`无错误、`vm.swappiness=10`，验证时使用量0。
- Docker：Docker/containerd均active+enabled；daemon配置仍为`root:root 0644`、96 bytes，SHA-256=`F2ED05C6F5934A15F12571139BDC225804F67B8C83561CC39868F7B2296D2697`；日志驱动`json-file`，容器/镜像均0。
- Nginx：配置测试通过，保持inactive+disabled。
- UFW：active，默认deny incoming/allow outgoing/deny routed；唯一IPv4 `/32`到22/tcp规则保留，无IPv6 SSH规则。
- 系统：chrony active、NTP同步、cloud-init done、`dpkg --audit`为空、hold仍仅cloud-init/intel-microcode、failed units为0。
- 目录：七个持久目录、Docker配置和sudoers drop-in的owner/mode全部保持；postgres目录仍为`root:root 0700`，等待D4按镜像UID/GID独立处理。
- 监听：TCP仅22/53；UDP仅systemd-resolved 53、systemd-networkd DHCP 68及回环chronyd 323。无80/443/3000/3389/5432/2375/2376。
- PostgreSQL：宿主机未安装PostgreSQL 16 server、无5432监听；仅保留已批准的客户端工具。
- 资源：根盘可用约31.4GiB，内存available约1.19GiB，Swap未使用。

## 3. 证据闭环

- 历史远端证据目录：`/root/black-box-d3-reboot-20260720T095331Z`；人工验收及仓库外归档闭环后已按精确文件清单删除。
- 历史远端配对归档：`/home/deploy/d3-reboot-pair-20260720T104512Z.tar.gz`，1040 bytes；本地副本验收后已从远端删除。
- 远端与本地归档SHA-256均为`47AB8EFDC529E9067C1C52E5BE4A27D20870EAD7D14F8D9CA549C64B4A6A848C`。
- 仓库外本地证据：`C:\Users\15593\Black-box-backups\d3-reboot-pair-20260720T104512Z`。
- tar共6项并可正常解压；内部`evidence.sha256`覆盖pre-reboot、pre manifest、marker副本及post-reboot，4/4校验通过。
- 本地解压证据共5个文件，raw IPv4与secret值模式扫描均0命中。

## 4. 实施中纠正

- 预检最初把混合TCP/UDP监听强制等于22/53，导致正常的DHCP 68与chrony 323被误判。已按D3.1真实基线改为协议、进程和绑定范围联合验证，未关闭必要系统服务。
- sudoers历史SHA转抄中有一个小写字符，实际字节SHA未漂移；已统一为全大写证据值。
- 首次恢复uptime已在19.02秒时取得；因传输诊断耗时，最终脚本将当前uptime窗口从15分钟调整为1小时，同时继续要求boot ID变化并记录前后UTC。

## 5. 收尾

- 用户已确认 D3.6 人工验收通过，并独立授权关闭 D3 临时现场。
- 删除前重新核对两份仓库外归档：最终重启配对归档为 `1040` bytes、SHA-256=`47AB8EFDC529E9067C1C52E5BE4A27D20870EAD7D14F8D9CA549C64B4A6A848C`、tar 6项；旧预检归档为 `4465` bytes、SHA-256=`472DE33FDC85B0343DCF6EF9BC305AC374024140961CC1092943F62C80E3116B`、tar 24项。两者继续保存在仓库外。
- 远端清理先逐项核对 6 个 deploy 文件 SHA、两个 root 证据目录的完整文件集合及内部 manifest，并确认一个失败现场目录为空；随后仅使用精确路径逐文件删除及空目录 `rmdir`，未使用通配符或递归删除。
- 已删除的远端对象仅限三份 D3.6 候选脚本、reboot marker、两份已下载归档、两份已归档 root 证据目录及一个空失败目录；三条从未落盘的传输路径继续为不存在。正式 SSH、Swap、Docker、UFW、sudoers、七个持久目录和系统配置备份未触碰。
- 清理后复核：SSH hardening、2GiB Swap、`vm.swappiness=10`、Docker/containerd active+enabled、Nginx inactive+disabled、UFW active且唯一 SSH 规则、TCP 22/53、容器0、failed units 0，均无漂移。
- root 脚本上下文内的 `sudo -K` 不会清除 deploy 的 global timestamp；最终由 deploy 会话直接执行 `sudo -K`，并由全新会话确认 `sudo -n`失败。所有 agent SSH/SCP/SFTP 本地进程为0。
- D3.6 与 D3 整批均已关闭。该状态只允许进入 D4 施工方案评审，不代表镜像上传、Compose、secret、数据库、AI、80/443 或 D5 获得授权。

## 6. D3 授权与验收索引

| 阶段 | 实际授权边界 | 终态 |
|---|---|---|
| D3.1 | 只读主机、SSH/IPv6与安全组基线 | 已人工验收；未写远端 |
| D3.2 | deploy账号、sudo密码由用户交互设置、SSH独立snippet与三会话防锁死 | 已人工验收；root/password/forwarding保持禁用 |
| D3.3 | Swap与普通APT upgrade分为两个独立E门禁 | 已人工验收；两个hold保留，未要求重启 |
| D3.4 | 仓库预检与精确软件安装分门禁 | 已人工验收；Docker可用，Nginx停止，宿主无PostgreSQL server |
| D3.5 | 持久目录/日志与UFW分为Gate A/Gate B | 已人工验收；80/443仍关闭 |
| D3.6 | 预检marker与单次reboot分门禁，重启后配对验证 | 已人工验收并完成精确临时现场清理 |
