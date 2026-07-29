# D3.4 仓库与精确安装集合预检报告

> 日期：2026-07-20
> 状态：只读预检已完成，等待实际安装独立 E 授权
> 边界：本批添加并验证了已批准的 Docker/PGDG 官方仓库与 key，刷新 APT 索引并执行只读模拟；未安装 package 或 snap，未改变服务、监听、防火墙或安全组

## 1. 仓库与签名

- 主机口径为 Ubuntu 22.04 Jammy、`amd64`。
- Docker 使用 `https://download.docker.com/linux/ubuntu` 的 Jammy stable、独立 `Signed-By` keyring；官方 fingerprint 校验通过。key 与 source 均为 `root:root 0644`。
- PostgreSQL 使用 `https://apt.postgresql.org/pub/repos/apt` 的 `jammy-pgdg/main`、独立 `Signed-By` keyring；官方 fingerprint 校验通过。key 与 source 均为 `root:root 0644`。
- APT update 成功；候选来源分别落在 Docker 官方仓、PGDG 官方仓和现有 Ubuntu Jammy 更新/安全仓。
- 仓库预检公开报告为 `deploy:deploy 0600`、15,990 bytes，SHA-256 为 `0EB4E9FBDF66FF3F2809334063FEC23F279B585287BD4598C24A752D78848827`。预检脚本本地/远端 SHA-256 均为 `7F07F5FC4FCF1578C08A913A82006AF4C19E47A55487558E5CBA74E50344E7B3`。
- 文档仅记录校验摘要和散列，不记录主机地址、认证路径或 secret。

## 2. Docker 五包模拟

执行口径：精确版本 + `--no-install-recommends`。模拟结果为 `0 upgraded / 5 newly installed / 0 removed`；`docker-ce-rootless-extras` 与 `pigz` 仅为推荐项，未进入集合。

| 包 | 精确版本 | 归档 bytes | Installed-Size KiB |
| --- | --- | ---: | ---: |
| `docker-ce` | `5:29.6.2-1~ubuntu.22.04~jammy` | 23,312,180 | 106,703 |
| `docker-ce-cli` | `5:29.6.2-1~ubuntu.22.04~jammy` | 16,889,272 | 44,603 |
| `containerd.io` | `2.2.6-1~ubuntu.22.04~jammy` | 23,621,096 | 91,336 |
| `docker-buildx-plugin` | `0.35.0-1~ubuntu.22.04~jammy` | 17,205,924 | 70,773 |
| `docker-compose-plugin` | `5.3.1-1~ubuntu.22.04~jammy` | 8,099,832 | 31,816 |
| **合计** |  | **89,128,304（84.999 MiB）** | **345,231（337.140 MiB）** |

安装预期副作用：Docker 与 containerd 的 Debian package 会创建 systemd unit，并通常立即设为 active/enabled；实际安装批必须在同一门禁内检查 daemon、socket、日志、`docker info` 和服务自启动状态。不得开放 2375/2376，也不得把 deploy 加入 docker 组。

## 3. Nginx 模拟

模拟精确顶层包 `nginx=1.18.0-6ubuntu14.16`，结果为 `0 upgraded / 9 newly installed / 0 removed`。全部来自现有 Ubuntu Jammy updates/security。

| 实际包集合 | 版本 | 归档 bytes | Installed-Size KiB |
| --- | --- | ---: | ---: |
| `nginx-common` | `1.18.0-6ubuntu14.16` | 40,574 | 284 |
| `libnginx-mod-http-geoip2` | 同上 | 12,468 | 78 |
| `libnginx-mod-http-image-filter` | 同上 | 16,036 | 91 |
| `libnginx-mod-http-xslt-filter` | 同上 | 14,352 | 87 |
| `libnginx-mod-mail` | 同上 | 46,400 | 169 |
| `libnginx-mod-stream` | 同上 | 73,444 | 240 |
| `libnginx-mod-stream-geoip2` | 同上 | 10,140 | 78 |
| `nginx-core` | 同上 | 484,024 | 1,271 |
| `nginx` | 同上 | 3,884 | 50 |
| **合计** |  | **701,322（0.669 MiB）** | **2,348（2.293 MiB）** |

安装预期副作用：Ubuntu package 通常立即启动并启用 `nginx.service`。实际安装批必须在验证 `nginx -t` 后立即禁用默认站点并 `disable --now nginx`，D5 前保持 80/443 无监听。

## 4. PostgreSQL 16 client 模拟

模拟精确顶层包 `postgresql-client-16=16.14-1.pgdg22.04+1` 且不安装 recommends，结果为 `1 upgraded / 2 newly installed / 0 removed`。

| 包 | 变化 | 精确版本 | 归档 bytes | Installed-Size 变化 KiB |
| --- | --- | --- | ---: | ---: |
| `libpq5` | 升级 | `14.23-0ubuntu0.22.04.1` → `18.4-1.pgdg22.04+1` | 257,040 | +813 |
| `postgresql-client-common` | 新增 | `293.pgdg22.04+1` | 107,072 | +210 |
| `postgresql-client-16` | 新增 | `16.14-1.pgdg22.04+1` | 1,934,168 | +9,129 |
| **合计** |  |  | **2,298,280（2.192 MiB）** | **+10,152（9.914 MiB）** |

- `postgresql-16` 仅为 suggested package，未进入实际集合；不会安装宿主 PostgreSQL server 或创建 5432 监听。
- `libpq5` 会跨 Ubuntu 14.x 客户端库升级到 PGDG 18.4。实际安装授权必须显式接受该已安装共享库升级，并在安装后验证 `psql`、`pg_dump`、`pg_restore` 均为 16.x、`dpkg --audit` 为空且宿主没有 PostgreSQL server unit/监听。

## 5. snapd 与 Certbot

- snapd 已存在，socket 为 enabled/active，运行时版本 `2.75.2+ubuntu22.04`；无需新增 snapd package 成本或另开 snapd 安装决策。
- 现有 snap 基础为 core20、core22、lxd、snapd。
- Certbot `latest/stable` 候选为 `5.7.0` revision `5758`、77.1 MB、classic。当前未安装 Certbot snap，未申请证书。
- 安装 Certbot 后由 snapd 承担 snap 生命周期和自动刷新；D3.4 只安装客户端，证书申请、域名验证和 Nginx 接线仍属于 D5 独立门禁。

## 6. 终态与安装门禁

- 目标 Docker/Nginx/PostgreSQL client 包仍未安装；相关服务均未运行。
- 80、443、2375、2376、5432 无监听；`cloud-init` 与 `intel-microcode` 两个 hold 不变；无 reboot marker。
- 根盘 41,882,943,488 bytes，总可用 34,315,689,984 bytes，使用率 15%。三组 APT 净增约 349.35 MiB，另加 Certbot 77.1 MB，低于 1 GiB 软件预算；安装后仍远高于 30 GiB 可用空间门槛。
- 首次 alias 查询在受限执行环境内未解析，改为经批准的受限环境外同一只读命令后成功；不是 ECS 或 DIRECT 故障。一次远端聚合命令因本地/远端引号传递语法失败，未写入；随后改用直接 `apt-cache show` 查询完成。另一次收尾命令在本地 JavaScript 参数解析前失败，未建立会话。
- **当前停点：** 仓库和精确集合预检完成；实际安装 Docker/Nginx/PostgreSQL client/Certbot、服务状态变更、hello-world、证书、端口、防火墙及 D3.5 均未授权。
