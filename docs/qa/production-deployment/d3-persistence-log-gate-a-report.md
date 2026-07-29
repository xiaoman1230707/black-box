# D3.5 门禁 A：持久目录与 Docker 日志实施报告

> 日期：2026-07-20
> 状态：已实现、已人工验收并完成现场清理
> 范围：仅创建持久目录并配置 Docker 默认日志；未修改 UFW、安全组、80/443、镜像、secret、Compose、数据库或业务代码

## 1. 授权与执行

- 用户独立授权门禁 A 后，以一次性 root 审计脚本执行；脚本 SHA-256 为 `F8A6F838D84DA5014BCEA38D22F9AD3277DD81B386469DA17BEA3DBFCC660B69`。
- 写入前重新确认七个目标目录和 `/etc/docker/daemon.json` 均不存在，Docker 无容器和镜像；任一漂移会在业务写入前停止。
- 脚本返回 `D3_GATE_A_COMPLETE=true`，root 证据目录为 `/root/black-box-d3-gate-a-20260720T060742Z`。
- 独立 root 复核脚本返回 `D3_GATE_A_INDEPENDENT_VERIFY=true`；证据已保存至仓库外 `C:\Users\15593\Black-box-backups\d3-gate-a-20260720T060742Z`。

## 2. 目录终态

| 路径 | owner/group | UID/GID | mode | 说明 |
|---|---|---:|---:|---|
| `/srv/black-box` | `root:root` | `0:0` | `0755` | 持久根目录 |
| `/srv/black-box/releases` | `deploy:deploy` | `1000:1000` | `0750` | 后续制品落地 |
| `/srv/black-box/compose` | `root:root` | `0:0` | `0755` | Compose 配置目录 |
| `/srv/black-box/backups` | `root:root` | `0:0` | `0700` | 本机备份目录 |
| `/srv/black-box/uploads` | 名称未分配 | `10001:10001` | `0750` | API 运行 UID/GID；宿主显示 `UNKNOWN` 属预期 |
| `/srv/black-box/postgres` | `root:root` | `0:0` | `0700` | D4 启动前必须按精确 PostgreSQL 镜像 UID/GID 复核并调整 |
| `/etc/black-box` | `root:root` | `0:0` | `0700` | 后续 secret 文件目录；本批未创建任何 env |

## 3. Docker 日志配置

- `/etc/docker/daemon.json` 由同目录临时文件写入并通过同文件系统 rename 原子落地。
- owner/group=`root:root`，mode=`0644`，大小 96 bytes，SHA-256 为 `F2ED05C6F5934A15F12571139BDC225804F67B8C83561CC39868F7B2296D2697`。
- 结构化复核仅包含：默认 driver=`json-file`，`max-size=10m`，`max-file=3`。
- 临时文件与最终路径均通过 `dockerd --validate --config-file`；之后只重启 `docker.service`。
- Docker/containerd 均为 active+enabled；Docker 29.6.2、Buildx 0.35.0、Compose 5.3.1 可用，容器=0、镜像=0。

## 4. 非目标不变证据

- Nginx 保持 inactive+disabled；`/etc/logrotate.d/nginx` 仍为 `root:root 0644`，前后 SHA-256 均为 `C6F585F3A98E424C30C5208F2F52C8E39665B76744CD5BCC523EFDEE0A7D69EE`，未新建第二套规则。
- UFW 前后内容哈希一致且独立复核为 inactive；未执行 enable、allow、deny、delete 或 default 写入。
- TCP 监听端口前后均仅为 22、53；无 80、443、3000、3389 或 5432。
- 根盘仍为 16%，约 33.70 GB 可用；2 GiB Swap 正常，failed units 为空，无 reboot marker。
- 未上传或加载镜像，未启动 Compose，未创建 secret，未进入 D4。

## 5. 证据完整性与安全

- 仓库外导出清单 3/3 通过；root 证据清单 12/12 通过；归档包含 13 个文件且可解压。
- root 证据归档 SHA-256 为 `FA569D3F9572B0BBB0A895B8FC2462531C64C6024D34A472AB35A535E610969B`。
- 独立复核文件 SHA-256 为 `4FA79D622E7804E41998FB01DD4ED2E6FBCA1B6056168BF230C8519CC2355603`。
- 16 个文本文件的 secret 模式和原始 IPv4 模式均为 0；真实地址、密码、连接串和私钥路径未写入 QA。

## 6. 失败与回滚边界

- 脚本在写入前要求全部目标仍为 absent；因此不会接管或删除既有目录。
- 任一步失败时，trap 先删除本次 daemon 配置并在已经尝试重启的情况下恢复 Docker 无项目配置的启动状态，再按逆序仅 `rmdir` 本批新建且仍为空的目录。
- 配置临时文件由 trap 单独清理；非空目录不会被强删。软件、APT source、系统日志、Nginx/UFW、安全组和业务数据不在回滚写面。
- 本次执行成功，未触发回滚；回滚实现由已保全的脚本 SHA 和源码审查证明，不以破坏成功现场的方式演练。

## 7. 当前门禁

门禁 A 已获用户人工验收通过。仓库外证据 `C:\Users\15593\Black-box-backups\d3-gate-a-20260720T060742Z` 保留且未修改；远端施工脚本、导出脚本、导出目录和 root 证据目录在逐项复核固定路径、SHA-256、manifest 与文件集合后按精确路径删除。独立复核确认四个路径均不存在，正式目录、`/etc/docker/daemon.json`、软件、日志和仓库外证据未删除；Docker/containerd 保持 active+enabled，Docker 日志驱动仍为 `json-file`，容器/镜像均为 0，监听仍仅 22、53。

## 8. deploy sudo 全局缓存接缝

- 新增 `/etc/sudoers.d/90-black-box-deploy-cache`，内容仅为 `Defaults:deploy timestamp_type=global` 与 `Defaults:deploy timestamp_timeout=120`；未配置 `NOPASSWD`，未修改 `/etc/sudoers` 主文件、deploy 组、docker 组或 root SSH。
- 文件为 `root:root 0440`、76 bytes，SHA-256 为 `9C2971EE357A9DC4DDB14502DFD0FBE20EC4BA8DA0CAAEBD57738B6C01FBA0DA`；单文件 `visudo -cf` 与全局 `visudo -c` 均通过。
- 用户仅在自己的交互 deploy 终端执行 `sudo -K`、`sudo -v` 并输入密码；密码未提供给 agent，未通过 stdin、环境变量、文件或日志传递。
- 新 SSH 会话的 `sudo -n` 正向验证成功，`sudo -l` 显示 `timestamp_type=global`、`timestamp_timeout=120`，原有 `(ALL : ALL) ALL` 权限不变。agent 随后执行 `sudo -K`，第二个全新会话的 `sudo -n` 明确因需要密码失败，证明缓存可清除且未转为免密。
- 测试结束后，用户按约定在自己的终端再次执行 `sudo -v`；agent 仅以全新会话确认 `sudo -n true` 成功，未执行任何系统写入，也未清除该缓存。该缓存只为下一次已授权批次提供提权接缝，不构成新的写入授权。
- 本批新增的两个 deploy 临时验证脚本已按精确路径删除。门禁 B（UFW）、80/443、重启、镜像上传和 D4 均未开始。
