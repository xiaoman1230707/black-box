# D3.4 宿主软件实际安装报告

> 日期：2026-07-20
> 状态：已实施、已人工验收通过并关闭
> root 证据：已导出至仓库外保全目录并完成SHA-256闭环，远端临时副本已按授权删除；文档不记录主机地址、认证路径或 secret

## 1. 执行边界

- 安装前重新执行三组只读模拟，结果与批准预检完全一致：Docker `0升级/5新增/0删除`、Nginx `0升级/9新增/0删除`、PG client `1升级/2新增/0删除`；Certbot stable仍为5.7.0 revision5758。
- 使用精确版本和`--no-install-recommends`；未安装rootless extras、推荐包、宿主PostgreSQL server或额外插件。
- 安装脚本SHA-256为`8603F81699CB29903DA48FF2380CEB8A554F96C3F7FBDFC86809DE83D72E0CBD`，本地/远端一致，owner/group=`deploy:deploy`、mode=0700、size=9,534 bytes，Bash语法与secret扫描通过。
- deploy无非交互sudo；用户只在自己的交互终端输入sudo密码并执行脚本，密码未发送给agent、未写入仓库或证据。
- 脚本返回`D3_SOFTWARE_INSTALL_COMPLETE=true`并保留唯一root证据目录。未自动重试、未运行hello-world、未拉取业务镜像、未申请证书、未执行autoremove/额外升级/重启。

## 2. 精确安装终态

| 组件 | 已安装版本 | 来源 |
| --- | --- | --- |
| Docker Engine | `5:29.6.2-1~ubuntu.22.04~jammy` | Docker官方Jammy stable |
| Docker CLI | `5:29.6.2-1~ubuntu.22.04~jammy` | Docker官方Jammy stable |
| containerd.io | `2.2.6-1~ubuntu.22.04~jammy` | Docker官方Jammy stable |
| Buildx plugin | `0.35.0-1~ubuntu.22.04~jammy` | Docker官方Jammy stable |
| Compose plugin | `5.3.1-1~ubuntu.22.04~jammy` | Docker官方Jammy stable |
| Nginx | `1.18.0-6ubuntu14.16` | Ubuntu Jammy updates/security |
| PostgreSQL client 16 | `16.14-1.pgdg22.04+1` | PGDG Jammy main |
| PostgreSQL client common | `293.pgdg22.04+1` | PGDG Jammy main |
| libpq5 | `18.4-1.pgdg22.04+1` | PGDG Jammy main；由Ubuntu 14.23升级 |
| Certbot snap | `5.7.0` revision5758, classic | snap latest/stable |

- `docker --version`为29.6.2，Buildx为0.35.0，Compose为5.3.1。
- `psql`、`pg_dump`、`pg_restore`均为16.14。
- `apt-cache rdepends --installed libpq5`显示`postgresql-client-16`与既有`libmailutils8`；两者保持已安装，`dpkg -V`对目标package及`libmailutils8`均零输出，动态链接缓存可解析`libpq.so.5`，未发现文件完整性异常。

## 3. 服务与权限

- `docker.service`与`containerd.service`均为active+enabled，供D4使用。
- deploy组保持`deploy sudo`，未加入docker组；非sudo `docker info`失败，未放宽Docker socket权限。
- 安装脚本以root执行`docker version/info`、Buildx与Compose检查并成功；agent独立复核客户端版本、服务状态和非sudo拒绝。
- Nginx安装后由脚本以root执行`nginx -t`成功，随后`disable --now`；独立复核为inactive+disabled，80/443无监听。
- 非root独立执行`nginx -t`因无权写日志/PID返回失败，只反映权限上下文；未重试该无效检查，root脚本证据和服务终态仍成立。
- 未出现PostgreSQL server unit，5432无监听。
- Certbot只安装工具；`/etc/letsencrypt`三层内证书文件数为0。安装脚本比较Certbot安装前后Nginx配置SHA无差异，未修改站点配置或运行renew。

## 4. 系统健康与资源

- 80、443、2375、2376、5432均无监听；未修改UFW、安全组或公网端口。
- `dpkg --audit`为空，failed units为空；`cloud-init`、`intel-microcode`两个hold不变；无reboot marker。
- 根盘使用率由预检时15%升至16%，当前可用33,698,885,632 bytes；仍高于30GiB门槛。
- 内存总量1,687,068,672 bytes，可用约1,198,067,712 bytes；2GiB Swap保持启用，采集时使用798,720 bytes。未重启，Swap重启持久性仍留D3.6。
- `CLAUDE.md`、候选`RELEASE_SHA`、业务代码、依赖、schema/migration和既有测试未被本批修改；未进入D3.5、未暂存或提交Git。

## 5. 复验中的非阻塞偏差

- 首个独立版本命令的`dpkg-query`格式串被本地PowerShell提前展开，输出为空；同一命令中Docker版本/服务/权限边界有效。随后改用`dpkg -l`重新采集精确版本。
- 首个独立Nginx检查以deploy执行`nginx -t`，因日志/PID权限失败并中止后续采集；改为不重复该无效检查，分离完成其余只读终态。root安装脚本已成功执行同一配置测试。
- 独立Docker权限检查使用临时输出文件并在同一命令中删除，没有持久残留。
- 尝试以非root运行`apt-get check`因无法取得dpkg frontend lock而失败，未改变系统；该检查不作为证据，也未用提权重跑。安装脚本的成功退出、`dpkg --audit`为空及包完整性检查已经覆盖本批依赖终态。

## 6. 关闭状态

- D3.4软件安装、自动复验与用户人工验收均已通过。
- 原始证据已保存在仓库外并通过6/6导出清单、2/2配对清单和34/34归档文件校验；关闭证据见`d3-software-evidence-closeout.md`。
- 远端安装脚本、root临时证据、审计脚本及临时导出目录已按独立授权删除；正式APT source、keyring、软件、日志和系统配置保持。
- D3.5只读预检已完成，但持久目录/日志、UFW、证书、80/443、业务镜像、Compose生产栈、数据库和AI写入仍分别等待独立授权。
