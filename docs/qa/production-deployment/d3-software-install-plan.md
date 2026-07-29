# D3.4 宿主软件安装前施工清单

> 日期：2026-07-20
> 状态：精确package/snap已安装并完成自动复验，等待用户人工验收；未申请证书、开放端口或进入D3.5

## 1. 现状与门禁

- D3.1已确认Docker Engine、Compose、Nginx、Certbot与PostgreSQL 16 client均未安装；Docker、Nginx、宿主PostgreSQL服务不存在或未运行。
- D3.3已人工验收并关闭：58包普通upgrade完成，SSH、chrony、Swap、hold与dpkg终态正常，无reboot marker；Swap重启持久性仍留D3.6。
- 本清单不授权任何写入。未来D3.4 E授权必须覆盖“添加两套第三方仓库/密钥、安装明确包、服务启动与立即收口”，但不授权证书申请、80/443开放、Docker业务容器、数据库写入或D3.5。
- 添加仓库后、安装前必须重新执行`apt-get update`与`apt-get -s install`，记录精确版本、依赖、新增/升级/删除数、下载量和安装后磁盘变化；任何删除、内核/引导链包、非清单服务或集合漂移均停止。该精确模拟是安装放行条件，不由当前估算替代。

## 2. 软件来源与精确包名

### 2.1 Docker Engine与Compose

- 官方来源：[Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)，仅使用`https://download.docker.com/linux/ubuntu`的stable组件，不使用`get.docker.com`便利脚本。
- key：从`https://download.docker.com/linux/ubuntu/gpg`下载到`/etc/apt/keyrings/docker.asc`，root写入、所有用户只读；执行时记录SHA-256与`gpg --show-keys --with-fingerprint`输出，不把网络下载直接pipe给shell。
- deb822 source：`/etc/apt/sources.list.d/docker.sources`，固定`Types: deb`、Jammy suite、`Components: stable`、`Architectures: amd64`与显式`Signed-By`。
- 精确安装包：`docker-ce`、`docker-ce-cli`、`containerd.io`、`docker-buildx-plugin`、`docker-compose-plugin`。不安装`docker-ce-rootless-extras`、Docker Desktop、`docker.io`、独立`docker-compose`或额外插件。
- 版本选择：添加仓库后用`apt-cache madison`/`apt list --all-versions`选择同一stable发布组，版本字符串写入D3.4执行证据；不使用无审计的“latest”直接安装。
- 冲突检查：`docker.io`、`docker-compose`、`docker-compose-v2`、`docker-doc`、`podman-docker`、独立`containerd`和`runc`任一已安装即停止，不自动卸载。

### 2.2 Nginx

- 官方来源：[Ubuntu Server Nginx安装文档](https://ubuntu.com/server/docs/how-to/web-services/install-nginx/)，沿用现有Ubuntu Jammy仓库和系统Ubuntu archive签名链，不添加Nginx第三方仓库或新key。
- 精确安装包：`nginx`。只接受APT解析出的Ubuntu依赖；不安装额外动态模块。
- 安装行为：Ubuntu包默认立即启动并启用`nginx.service`。当前安全组未开放80/443，因此安装窗口没有公网入口；安装后立即验证`nginx -t`，删除/禁用默认站点接缝并执行`systemctl disable --now nginx`，D5前保持inactive/disabled且80/443无监听。

### 2.3 Certbot

- 官方来源：[Certbot Nginx + snap说明](https://certbot.eff.org/instructions?ws=nginx&os=snap)，采用官方推荐snap口径，不混装APT版Certbot。
- 前置：先只读确认`snapd`及`snapd.socket`；缺失时未来E清单才允许从Ubuntu仓库安装精确包`snapd`。若系统已有APT版`certbot`或`certbot-auto`残留则停止，不自动移除。
- 精确安装制品：`certbot` snap，使用`sudo snap install --classic certbot`；仅在`/usr/local/bin/certbot`不存在时建立到`/snap/bin/certbot`的受控符号链接。
- 本批不执行`certbot --nginx`、`certbot certonly`、证书申请、DNS验证或renew dry-run。Certbot没有本项目常驻Web服务；snapd自身socket/timer状态及snap自动刷新行为需记录。

### 2.4 PostgreSQL 16 client

- 官方来源：[PostgreSQL Ubuntu下载](https://www.postgresql.org/download/linux/ubuntu/)，使用PGDG对Jammy/amd64的支持，不安装宿主PostgreSQL server。
- key：从`https://www.postgresql.org/media/keys/ACCC4CF8.asc`下载到`/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc`，执行时记录SHA-256和fingerprint。
- deb822 source：`/etc/apt/sources.list.d/pgdg.sources`，固定`Types: deb`、`URIs: https://apt.postgresql.org/pub/repos/apt`、`Suites: jammy-pgdg`、`Architectures: amd64`、`Components: main`与显式`Signed-By`。生产主机不需要`deb-src`。
- 精确安装包：`postgresql-client-16`。允许APT解析其必要依赖（通常包含client-common/libpq），但安装模拟必须逐项列出；禁止`postgresql-16`、`postgresql`、server-dev和宿主数据库服务。
- 验证：`psql --version`、`pg_dump --version`、`pg_restore --version`均为16.x；`postgresql.service`仍不存在或inactive，5432无宿主监听。

### 2.5 基础工具

- 只复用或按缺失安装：`ca-certificates`、`curl`、`gnupg`、`jq`、`openssl`、`tar`、`rsync`。其中ca-certificates、curl、tar已在D3.3更新集合中；其余仍须在未来安装模拟中按真实状态判定，不重复安装已满足项。
- 不安装Node/pnpm构建链、桌面/RDP、管理面板、Redis、宿主PostgreSQL server或监控平台。

## 3. 磁盘与服务预算

- 当前根盘在D3.3后约33GiB可用，远高于8GiB发布门槛。
- 在第三方仓库尚未写入时，无法用本机APT产生Docker/PGDG的权威精确字节数；因此当前采用保守门禁：软件包与snap合计安装变化不得超过1GiB，Docker安装后的`/var/lib/docker`初始数据与`hello-world`另预留1GiB，根盘安装后仍须至少保留30GiB且使用率低于70%。
- 未来E执行中，只有`apt-get -s install`和`snap info certbot`记录的真实下载/安装体积满足上述门禁才可继续；报告必须同时给出逐包版本和总量，不把保守预算写成实际占用。
- 预期服务行为：Docker安装后active/enabled；Nginx安装时可能短暂active/enabled但必须立即收口为inactive/disabled；snapd按现有/安装状态启用其socket与刷新机制；PostgreSQL client不创建数据库服务。

## 4. 实施顺序与停止点

1. 记录包/服务/监听/磁盘/hold/reboot前态，确认无冲突包和无80/443/3000/5432业务监听。
2. 备份APT source/keyring目录清单与SHA；分开写入Docker key/source、PGDG key/source，逐个结构和fingerprint验证。
3. 单次`apt-get update`后分别模拟基础工具、Docker、Nginx、PostgreSQL client；记录完整计划并停在安装前复核。出现删除、计划外服务或超过预算立即停止。
4. 经当前E范围继续时，先安装缺失基础工具与PostgreSQL client，再安装Docker五包并验证，最后安装Nginx并立即停用默认服务。
5. snapd已存在则直接按官方口径安装Certbot snap；若缺失，仅当E清单明确包含`snapd`时安装。D3.4不申请证书。
6. 验证版本、服务、监听、failed units、dpkg audit、hold、Swap、时间和reboot marker；运行一次`sudo docker run hello-world`后只删除本次hello-world容器/镜像，不执行prune。

任何APT/dpkg/snap交互、配置覆盖提示、依赖冲突、新增包超出模拟、服务启动失败或reboot marker变化均停止；不自动重试、卸载或进入D3.5。

## 5. 回滚边界

- 仓库写入但安装前失败：恢复本批前source/keyring清单，只删除本批新建且SHA已记录的Docker/PGDG文件，再运行一次APT索引刷新；不触碰Ubuntu现有source/key。
- 包安装开始后不自动降级。仅在独立回滚授权下按实际已安装集合处理；Docker数据目录、Nginx配置、snap数据和PG客户端配置不执行递归删除。
- Docker安装失败：保留APT/dpkg日志和服务现场；不得自动移除containerd或运行prune。
- Nginx安装成功但配置未就绪：保持`disable --now`，不开放80/443；D5前不提供公网服务。
- Certbot本批未申请证书，回滚不得误删未来证书目录；PG客户端回滚不得触碰任何数据库数据目录。

## 6. 当前结论

- D3.4施工清单已闭合，官方来源、key/source路径、精确顶层包、服务副作用、资源门禁和回滚边界明确。
- 仓库/key写入、APT update和三组只读模拟已按独立授权完成；精确证据见`d3-repository-preflight-report.md`。Docker为5个新包、Nginx为9个新包、PostgreSQL client为2个新包并升级现有`libpq5`，均为0删除且无宿主PostgreSQL server。
- 实际安装已按独立E授权完成：Docker/containerd保持active+enabled；Nginx已验证后收口为inactive+disabled；PG仅安装client；Certbot仅安装工具。完整终态见`d3-software-install-report.md`。
- 未运行hello-world、未申请证书、未开放端口，也未进入D3.5；当前停在D3.4人工验收门禁。
