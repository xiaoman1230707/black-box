# D4.1 新候选 ECS 新鲜只读门禁

> 日期：2026-07-21
> 候选SHA：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
> 状态：只读门禁通过；停在D4.1独立E授权门禁

## 1. 执行边界

- 仅使用受控`black-box-ecs` alias建立普通SSH只读会话；解析结果为`deploy`与TCP 2222。
- 未上传、创建或修改远端文件，未导入/拉取镜像，未启动Compose，未读取secret，未修改UFW、sshd、安全组或服务。
- 真实ECS地址、代理出口、管理来源、密钥路径和secret均未写入仓库或本报告。

## 2. 首次审计命令失败证据

- 首次只读脚本已成功取得全部主机状态，但审计层把Swap字节数严格要求为不少于`2147483648`；实际持久Swap为`2147479552` bytes，仅少一个4KiB页，应按“约2GiB”契约允许该页级差异。
- 同一脚本末尾存在本地拼接造成的Bash EOF语法错误，因而没有输出完整完成标记。
- 两项均是只读审计脚本问题，不是主机状态失败。修正版先在本地通过`bash -n`，再执行完整只读矩阵；没有修改远端状态。

## 3. 新鲜主机终态

- SSH alias：deploy身份、TCP 2222；当前连接来源与UFW唯一批准IPv4 `/32`严格匹配。
- Docker与containerd均为active+enabled；Nginx为inactive+disabled。
- UFW为active，默认deny-in/allow-out/deny-routed；仅一条IPv4来源到2222规则，无IPv6规则和其他端口规则。
- 80、443、3000、5432、2375、2376监听均为0。
- Swap为`2147479552` bytes，符合约2GiB契约；可用内存约1.13GiB，`/srv/black-box`所在文件系统可用约31.17GiB、使用率17%，满足D4阈值。
- failed units为0，D3 reboot marker不存在。
- 七个持久路径owner/mode全部保持D3终态：root、releases、compose、backups、uploads、postgres与`/etc/black-box`均无漂移。
- Docker容器0、镜像0。
- 旧SHA release存在且含4项顶层制品；旧SHA staging匹配1项，均只读保留。
- 新SHA release、compose正式目录和匹配staging均不存在，后续D4.1不会覆盖既有路径。

## 4. 连接收口与结论

- 修正版输出`D4_FRESH_READONLY_GATE_OK=true`。
- 会话退出后，本机`ssh`/`scp`/`sftp`进程0，相关已建立连接0。
- 新候选D4.1前置只读门禁通过。该结论不授权上传、目录创建、镜像导入、PostgreSQL拉取、旧现场清理或其他远端写入；下一步仍需用户独立E授权。
