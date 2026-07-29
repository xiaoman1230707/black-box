# D3.5 持久目录、日志与网络只读预检

> 日期：2026-07-20
> 状态：主体为 D3.5 写入前只读快照；门禁 A、B 均已人工验收并正式关闭；D3.6 重启前只读预检通过但未获重启授权

> 口径说明：第 1～2 节保留采集时的原始前置事实，不用门禁 A 终态覆盖历史快照；门禁 A 的实施、验收与清理终态见 `d3-persistence-log-gate-a-report.md`。

## 1. 只读基线

- `/srv/black-box`、其 `releases/compose/backups/uploads/postgres` 子目录及 `/etc/black-box` 均不存在。
- UID/GID `10001` 当前未占用；`deploy` 为 UID/GID `1000:1000`。
- 根盘约 41.88 GB，已用约 6.25 GB（16%），可用约 33.70 GB；满足当前 D3 目录和日志预算。
- 内存约 1.69 GB，可用约 1.20 GB；2 GiB Swap 已启用，采集时仅使用约 0.8 MB。重启持久性仍留 D3.6。
- Docker 29.6.2 active+enabled，无容器、镜像、volume 或 build cache；默认日志驱动为 `json-file`，`/etc/docker/daemon.json` 尚不存在。
- Nginx inactive+disabled；现有 `/etc/logrotate.d/nginx` 为 daily、rotate 14、compress、delaycompress，配置文件 `root:root`、`0644`。
- journal 占用约 24 MB，`/var/log` 约 26.7 MB；当前无需扩大日志改造范围。
- UFW inactive，`IPV6=yes`，默认策略为 incoming deny、outgoing allow、forward deny；当前无 UFW 放行规则。
- 监听仅含 SSH 22 与系统 DNS/DHCP/chrony；无 80、443、3000、3389 或 5432 监听。D3.1 已确认无公网 IPv6、无 IPv6 默认路由及无 IPv6 SSH 安全组规则；sshd 的 IPv6 wildcard socket 不等于公网可达。
- Docker 已创建 `DOCKER-USER`/`DOCKER-FORWARD` 链，FORWARD policy 为 DROP；UFW 不替代 Compose 的端口绑定约束。
- Docker/containerd active+enabled，Nginx inactive+disabled；failed units 为空，hold 仍为 `cloud-init`、`intel-microcode`，无 reboot marker。

## 2. Compose 网络契约复核

- `deploy/production/compose.yaml` 只将 API 发布为 `${API_BIND_ADDRESS:-127.0.0.1}:${API_PORT:-3000}:3000`；生产 `release.env` 契约固定 `API_BIND_ADDRESS=127.0.0.1`。
- PostgreSQL 服务没有 `ports`，仅接入 Compose 内部 `db_net`。
- API 与 PostgreSQL 均显式使用 `json-file`、`max-size=10m`、`max-file=3`。
- `compose-policy.test.ps1` 通过 7 个 service policy；测试仅执行 `docker compose config`，未启动容器、数据库或外部 AI。

## 3. 写入门禁 A：持久目录与 Docker 日志

该门禁已获独立 E 授权、实施并经人工验收正式关闭，详细证据见`d3-persistence-log-gate-a-report.md`；实施期间未启用 UFW：

1. 记录目录不存在状态、磁盘、Docker 服务状态与 `/etc/docker/daemon.json` 不存在状态。
2. 建立 `/srv/black-box`（`root:root 0755`）、`releases`（`deploy:deploy 0750`）、`compose`（`root:root 0755`）、`backups`（`root:root 0700`）、`uploads`（`10001:10001 0750`）、`postgres`（`root:root 0700`，D4 在启动前按精确 PostgreSQL 镜像 UID/GID 复核后调整）及 `/etc/black-box`（`root:root 0700`）。
3. 以原子写入创建项目独立 Docker daemon 配置，保持 `json-file` 并限制默认日志为 `10m × 3`；先执行 `dockerd --validate --config-file`，再重启 Docker。当前无容器，仍须验证 Docker active+enabled、Buildx/Compose 可用且无新监听。
4. 保留 Nginx 现有 logrotate，不新建第二套 Nginx 日志轮换规则。
5. 任一步失败立即停止。仅删除本门禁新建且为空的目录；Docker 配置失败时恢复“文件原先不存在”的状态并重启复核，不触碰软件、APT source 或业务数据。

## 4. 写入门禁 B：UFW 启用

该门禁已在门禁 A 关闭后获得独立 E 授权；80/443 继续关闭：

1. 保持一个已验证的原 deploy 会话，记录 UFW inactive/空规则、默认策略、iptables/ip6tables/nft 与监听的脱敏快照。
2. 用户在交互终端静默输入控制台已核对的可信管理 IPv4；仅允许该 `/32` 访问 `22/tcp`，不得把地址写入 shell 历史、脚本、日志或仓库。
3. 保持 `IPV6=yes`，但不增加 IPv6 SSH allow；当前无公网 IPv6及安全组 IPv6 SSH规则。设置 incoming deny、outgoing allow、routed deny，添加唯一 IPv4 SSH allow 后再执行 `ufw --force enable`。
4. 不添加 80、443、3000、3389、5432 规则；安全组继续保持既有边界。
5. 启用后在原会话不退出的前提下建立第二个全新 deploy 会话，验证 key 登录、`sudo -v`、SSH 22 唯一管理放行、UFW active 与规则数量；同时复核 Docker 的 API 端口仍只允许 loopback、数据库无宿主发布端口。
6. 新会话失败时立即在原会话执行 `ufw --force disable`，删除本次新增 SSH allow，复核回到 inactive/空规则；不得放宽为 `0.0.0.0/0` 或 `::/0`，不得修改安全组、密钥或 sshd。
7. 第二会话成功并完成证据后才关闭两会话。80/443 的 UFW 与安全组规则继续等待 D5 前独立 E 授权。

## 5. 当前结论

D3.5 的写入前只读快照成立且保持历史口径，门禁 A、B 均已人工验收并正式关闭。D3.6 重启前技术预检通过，但重启仍需独立 E 授权；当前仍不允许上传镜像、开放80/443、重启或进入 D4。实施终态见 `d3-ufw-gate-b-report.md`，重启前矩阵见 `d3-reboot-precheck-report.md`。
