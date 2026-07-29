# D4 镜像、PostgreSQL 与全新生产库初始化施工方案

> 日期：2026-07-20
> 状态：方案已确认；D4已实施并通过自动门禁，待用户人工验收。09安全修复新候选已部署，35/35 backfill、B3与API恢复完成
> 当前候选 `RELEASE_SHA`：`b6b3d93866e390eb2e37bd52649fa2628403b1b4`
> 边界：本文件只定义 D4.0～D4.8 的施工、验证、授权与回滚契约，不授权上传、secret、Compose、数据库或 AI 写入

## 1. 目标与冻结边界

D4 只完成以下工作：

1. 将 D2 从同一 `RELEASE_SHA` 生成并已验收的 `linux/amd64` API 镜像及同 SHA 部署文件落到 ECS。
2. 首次启动精确 PostgreSQL 16 容器，并让数据库、uploads 与备份只写入既有宿主持久目录。
3. 仅对经用户确认的全新作品展示生产库，按固定顺序执行：
   `migrate deploy → seed-games → rebuild-tags → seed-demo → embedding backfill`。
4. 每一步单独授权、单独验收、失败即停；形成初始化前、中、后的恢复点。
5. 在 2GiB 主机上串行运行常驻服务和一次性工具，持续核对内存、Swap、磁盘与容器状态。

D4 明确不做：

- 不配置 Nginx 正式站点、证书、DNS，不开放 80/443，不进入 D5。
- 不运行 cleanup apply，不复制本地开发库，不修改 schema/migration。
- 不修改 Compose、Dockerfile、脚本、业务代码、测试、依赖或 lockfile。
- 不从当前脏工作树复制部署文件，不重新构建候选镜像，不切换 embedding 模型。
- 不并行执行 migration、seed、embedding、备份或 API 流量。
- 不因脚本具备幂等性而自动重跑；任何有副作用步骤的重跑都需要新的对应授权。

## 2. 已核实的真实契约

### 2.1 候选制品

| 项目 | 固定值/契约 |
|---|---|
| `RELEASE_SHA` | `38247ff057310e0f98125a0bbcafbfab2969877c` |
| API image tag | `black-box-api:38247ff057310e0f98125a0bbcafbfab2969877c` |
| API image ID | `sha256:af0789ef7e7d81337aec69e52b8287ac0343a095457392acdf483f8a768e51d4` |
| image archive | `205705216` bytes，SHA-256=`e69cfb105c5146c283dfd8b128bbd97a6c43616edc518f9ef032bef71fecbf76` |
| build manifest | SHA-256=`f16df86a11f57e18ea1652b17c5de8b3be1e6edd024f54f43f12f52d9e006664` |
| image runtime | `linux/amd64`、`10001:10001`、`/app`、`node dist/src/main.js` |
| image content | 3 migrations、4 个编译后初始化脚本、10 张 demo fixture |
| PostgreSQL | `postgres:16.14-bookworm`；index digest=`sha256:92620daddcd947f8d5ab5ba66e848702fe443d87fed30c4cea8e389fd78dfc55`；linux/amd64 manifest=`sha256:c95fd5346040eba2de3c435e14874af18f5d681fb5848d4f081dbead0878af28` |

`D2_ARTIFACT_ROOT` 是仓库外、D2 已保留现场中包含 image archive 与 build manifest 的受控本机目录。执行 D4.0 时必须解析为绝对路径，并以本表大小和 SHA 找到唯一制品；未找到或出现多个候选即停止，不从当前工作树补造镜像。

### 2.2 Compose 与最小权限

真实 `deploy/production/compose.yaml` 已固定：

- `db` 只在内部 `db_net`，无宿主 5432 发布；640MiB、0.75 CPU。
- `api` 只发布 `127.0.0.1:3000`，挂载 `/app/uploads`；768MiB、1 CPU、Node heap 512MiB。
- `migrate`、`seed-games`、`rebuild-tags` 只取得 `database.env` 与内部数据库网络。
- `seed-demo` 只额外取得 `demo-seed.env` 与 uploads bind mount，无外网。
- `embedding-backfill` 只额外取得 `embedding.env` 与外网。
- `ai-preflight` 只取得 `ai-preflight.env` 与外网，不取得数据库变量。
- 所有一次性服务都位于 `tools` profile，绝不随常规 `up` 自动运行。

环境 profile 的真实校验口径是：`database`、`demoSeed`、`embedding` 与完整 `runtime`。`seed-games`、`rebuild-tags` 不因缺少 AI key 失败；embedding 与常驻 API 才取得对应 AI 变量。

### 2.3 初始化脚本

| 步骤 | 编译后入口 | 幂等/副作用 | 失败口径 |
|---|---|---|---|
| migration | Prisma CLI `migrate deploy --schema prisma/schema.prisma` | 对已应用 migration 幂等，但本批仍只授权一次 | 非零即停，不进入 seed |
| games | `dist/src/scripts/seed-games.js` | 按唯一 name upsert；技术可重跑 | 本批不自动重跑；核对5游戏 |
| tags | `dist/src/scripts/rebuild-tags.js` | 先删全部 `PostTag`/`Tag` 再建5类，非事务且对已有内容有破坏性 | 只允许 `Post=0 && PostTag=0` 时执行；失败从最近备份恢复 |
| demo | `dist/src/scripts/seed-demo-posts.js` | 数据库事务定向替换 demo 内容；同时写 uploads 并有本次新文件补偿 | 补偿失败必须非零且保留清单；不宣称完全回滚 |
| embedding | `dist/src/scripts/backfill-embeddings.js` | 无参数只补 null；逐帖调用外部服务，任一失败最终非零 | 保留 null，可在新 AI/DB 授权下只补缺；禁止 `--all` |

D2 已验证非 AI 四步后的稳定计数是：35 帖、13 评论、31 点赞、10 条 File、5 游戏各7帖、空正文0、重复标题0、20个 seed 媒体文件。D4 的第五步终态还必须是 35/35 embedding 且每条1536维。

## 3. 文件与写入职责矩阵

| 对象 | D4动作 | 所有者/权限 | 回滚边界 |
|---|---|---|---|
| `D2_ARTIFACT_ROOT` | 只读定位已验收 archive/manifest | 仓库外本地目录 | 不删除、不覆盖 |
| 本地 deployment bundle | 从精确 `RELEASE_SHA` 用 `git archive` 生成，仅含 `deploy/production` | 仓库外唯一目录 | SHA不符即删除本次 `.part`，不改Git |
| `/srv/black-box/releases/<RELEASE_SHA>/` | 保存 image archive、build manifest、deployment bundle、SHA清单 | `deploy:deploy 0750`；制品0640 | 仅删除本次未导入且已核验失败的唯一制品；不清旧release |
| `/srv/black-box/compose/<RELEASE_SHA>/` | 原子落地同 SHA 的 Compose、脚本、Nginx模板和env示例 | `root:root`；目录0755，配置0644，脚本0755 | 失败保留 staging；未验证不替换使用路径 |
| `/etc/black-box/release.env` | 非secret镜像、路径、loopback参数 | `root:root 0644` | 原子写入；失败恢复不存在/原文件 |
| `/etc/black-box/runtime.env`、`database.env`、`demo-seed.env`、`embedding.env`、`ai-preflight.env`、`postgres.env` | 用户亲自注入真实值；agent只验变量名、格式、owner/mode | `root:root 0600` | 不回显、不复制到release/QA；轮换由用户处理 |
| `/srv/black-box/postgres` | PostgreSQL bind mount | 首启前按精确镜像实测UID/GID收敛，0700 | 非空或身份不符即停；不得递归修未知数据 |
| `/srv/black-box/uploads` | API/seed-demo bind mount | `10001:10001 0750` | 只由应用/seed写；失败按配对备份恢复 |
| `/srv/black-box/backups` | 空库、阶段性和终态配对备份 | `root:root 0700` | `.incomplete`保留诊断；完整目录不覆盖 |
| 仓库文档 | D4 QA、07/主计划/planning状态 | 当前脏工作树 | 不暂存、不提交，不触碰`CLAUDE.md` |

执行 D4 不新建业务代码文件。仓库内 `deploy/production` 必须来自候选 commit；服务器端禁止手改 Compose 或脚本来绕过失败。

## 4. 全局执行规则

1. 远程连接固定使用 `black-box-ecs` 受控 alias（deploy 身份、TCP 2222）；TUN 保持开启并使用已验证的 ECS 专属规则。规则只能指向代理策略组，部署期间必须保持当前节点不变；出口变化立即暂停，不放宽 UFW/安全组来源。连接能力不替代 E/DB/AI 授权。
2. 所有 Docker 命令通过 `sudo` 执行；deploy 不加入 docker 组。sudo 缓存由用户交互建立，agent只用 `sudo -n`，批次末由 deploy 执行 `sudo -K`。
3. Compose 固定 project name `black-box`，固定显式 `--env-file /etc/black-box/release.env` 和精确 SHA 目录中的 `compose.yaml`；不得依赖当前目录或默认 project。
4. 任一时刻最多运行 `db + api`，或 `db + 一个一次性工具`。运行 migration/seed/embedding/备份时 API 必须停止；不并发压缩、拉镜像或其他写工具。
5. 每个写门禁前后记录：`free -m`、Swap使用、`df -h / /srv/black-box`、`docker stats --no-stream`、容器状态、failed units和监听。根盘达到70%进入人工复核、达到85%或可用空间不足8GiB立即阻断；出现OOM、容器137、持续Swap增长或 failed unit立即停止。
6. 日志和QA只记录退出码、耗时、计数、大小、SHA、镜像ID和变量名检查结果；不记录env内容、数据库URL、token、密码、key、真实IP或私钥路径。
7. 每个有副作用命令仅执行一次。失败后保留容器日志和现场，不自动重试、不自动restore、不删除数据目录。

## 5. D4.0 本地制品与主机只读再确认

**授权：** L；若生成新的 deployment bundle，属于仅仓库外制品写入的 LC，不包含 ECS 写入。

执行顺序：

1. 复核当前候选 SHA、D1三个提交、D2已关闭状态、主工作树暂存区为空及 `CLAUDE.md` SHA未变。
2. 从 D2 保留现场定位唯一 image archive/build manifest，核对固定大小与 SHA；复核候选 image ID、架构、OCI revision和secret扫描证据。
3. 从 Git 对象中的精确 `RELEASE_SHA` 以`git archive --format=tar.gz --output=<唯一.part> <RELEASE_SHA> deploy/production`生成bundle，通过后原子改名；不从当前工作树复制，不经过checkout/index export或中间源码目录。记录tar列表、大小、SHA，并扫描真实env、IP、域名值、私钥和构建制品泄露。
   - 生成前后必须验证`*.sh text eol=lf`生效；自动化必须执行上述真实archive路径，证明Git blob、干净worktree和bundle三层Shell字节一致且CRLF为0，Linux原生`bash -n`全部通过。服务器现场转码与忽略脚本均禁止。
4. 组合本次传输清单：image archive、build manifest、deployment bundle、SHA256SUMS；每项都必须追溯同一 SHA。
5. 只读连接 ECS，复核 D3 终态、Docker无容器/镜像、Nginx停止、UFW仅SSH、80/443/3000/5432无监听、持久目录权限、磁盘/内存/Swap满足门禁。

**完成条件：** 本地制品唯一且哈希闭环；主机无漂移；未发生远端写入。任一不符停在 D4.0。

## 6. D4.1 制品上传、展开与镜像导入

**授权：** 独立 E。该授权只覆盖 release/compose 目录写入、PostgreSQL精确镜像拉取和 API archive导入，不覆盖 secret 或数据库。

执行顺序：

1. 在 `/srv/black-box/releases/<RELEASE_SHA>/` 使用唯一 `.part` 名上传四个制品。默认使用 SFTP；单次失败即保留现场并停止，不自动重试、不切 legacy SCP。完整上传后远端逐项计算 SHA，再原子rename。
2. 在 root 控制的唯一 staging 目录展开 deployment bundle，验证文件清单、owner/mode、Shell/PowerShell/JSON/YAML语法与secret扫描；通过后原子落到 `/srv/black-box/compose/<RELEASE_SHA>/`。
3. `docker load` 前再次核对 archive SHA。导入后验证 tag、image ID、`linux/amd64`、用户`10001:10001`、工作目录、入口、healthcheck、OCI revision、3 migrations、4脚本、10 fixtures及history/archive无secret。
4. 仅拉取 Compose 指定的 PostgreSQL index digest。核对架构为amd64、index digest和选中的linux/amd64 manifest与§2.1一致；任何tag漂移或错误架构均停止。
5. 记录导入前后镜像集合、磁盘变化和本批新增镜像；不运行prune，不删除D2本机制品。

**失败/回滚：** SHA不符时不导入；已导入但身份不符时停止，删除该唯一新镜像需新的E授权。不得以重新构建或改tag掩盖差异。

## 7. D4.2 Secret、Compose 与 PostgreSQL UID/GID 预检

**授权：** 用户secret注入 + 独立 E；不含数据库初始化。

执行顺序：

1. 用户在自己的交互终端创建六个 secret env；agent不读取值，只通过固定校验器核对必需变量名、非空、URL/模型/超时/密钥强度契约以及`root:root 0600`。
2. 原子创建非secret `/etc/black-box/release.env`，固定同一 SHA 的 API image、PostgreSQL index digest、`127.0.0.1:3000`、七个绝对路径和 API image ID；不得使用`latest`。
3. 运行 `docker compose --profile tools ... config --quiet` 与 Compose policy检查；不得输出展开后的secret配置。
4. 用已拉取的精确 PostgreSQL镜像执行不挂载、不联网的身份探测，只输出 postgres用户的数值UID/GID；与镜像metadata一并记录。
5. 断言 `/srv/black-box/postgres` 仍为空且为D3预置目录。经本批E授权仅把该目录owner改为实测UID/GID并保持0700；不对非空目录递归chown。
6. 复核 uploads仍为`10001:10001 0750`，backups和`/etc/black-box`为root私有；复核Compose无5432宿主端口且API只绑定loopback。

**完成条件：** env职责不串线、无secret输出、Compose可解析、PostgreSQL UID/GID来自实测且空目录权限正确。失败恢复本批非secret文件；secret由用户处理，不由agent备份内容。

## 8. D4.3 PostgreSQL 首次启动与空库恢复点

**授权：** 独立 E + DB-0。只允许首次初始化精确空目录和创建空库恢复点。

执行顺序：

1. 最后确认目标是未承载用户数据的全新作品展示库；postgres目录和uploads目录业务文件数为0，Compose project无容器。
2. 只启动 `db`，不启动API或tools。检查health、PostgreSQL版本、内存参数、容器用户、bind mount和5432未发布。
3. 只读核对业务schema/migration表尚不存在，业务表计数不可用是空库预期，不据此运行seed。
4. 创建 `B0` 空库恢复点：直接生成custom-format dump与空uploads归档，记录绝对路径、大小、SHA、PostgreSQL镜像身份和“尚无migration”；执行`pg_restore --list`、`tar -tzf`。该恢复点不能替代后续正式配对备份。
5. 停止除db外所有服务，记录资源与日志终态。

**失败/回滚：** 首次初始化失败时停止db并保留postgres目录和日志。删除或重建该目录属于新的破坏性DB/R授权，本批不得自动处理。

## 9. D4.4 第一步：Migration

**授权：** DB-1，仅一次 `migrate`。

执行顺序：

1. 复核仅db运行、无其他write tool、B0可读、资源满足门禁。
2. 运行 tools profile 的 `migrate` 服务一次；保存退出码和脱敏日志。
3. 使用同镜像覆盖command执行 `prisma migrate status`；数据库只读核对精确三条migration均成功且无failed/rolled-back记录。
4. 创建 `B1` post-migration配对恢复点；此时业务表存在但Post=0、uploads为空。
5. 启动loopback API，分别验证 `/api` liveness 与 `/api/posts?page=1&limit=1` Prisma readiness，后者必须返回合法空分页；确认3000只绑定127.0.0.1。验证后停止API，为后续写工具释放资源。

**不得重复：** 即使`migrate deploy`技术上幂等，失败或证据缺失也不得自动再次运行。恢复B0或重建空库后再迁移需要新的DB授权。

## 10. D4.5 第二、三步：Games 与 Tags

这两个步骤顺序相邻，但授权和验收独立，不能合并为一条命令。

### D4.5-A Seed games

- **A1：** 施工方案与完整只读预检，人工验收后才能授权写入。
- **A2：** DB-2唯一一次`seed-games`写入及写后只读核对；成功后API保持停止。

**授权：** DB-2。

1. 复核Post=0、Game=0、仅db运行。
2. 运行 `seed-games` 一次。
3. 核对恰有5个预期游戏、name唯一且无帖子；异常即停。

### D4.5-B Rebuild tags

**授权：** DB-3，只能在 A 已验收后授予。

1. 再次断言Post=0、PostTag=0；任一非0立即取消执行。
2. 运行 `rebuild-tags` 一次。
3. 核对Tag恰为5个内容类型，Post/PostTag仍为0，Game仍为5。
4. 创建 `B2` pre-demo配对备份，记录三条migration、5游戏、5标签、空帖子和空uploads。

**失败/回滚：** `rebuild-tags`非事务且先删除。失败不重跑；停止db写入，只能按独立恢复授权使用当前最新的“F6 release / pre-DB2”配对恢复点，或重建全新库后重新逐步授权。该恢复会撤销5个Game，之后必须重新执行并验收DB-2。

**2026-07-23订正与实测：** 当前可用且最新的失败恢复点为“F6 release / pre-DB2”，不是B1意义上的pre-DB3快照；使用它会同时撤销5个Game，必须重新独立执行DB-2。DB-3方案/只读预检确认原db、5 Game、Post/PostTag/Tag=0、3 migration、空uploads及恢复点均未漂移。随后唯一写入执行1次并以退出码0完成，5个目标Tag与写后矩阵、单一one-off销毁链均通过，当前待用户人工验收。B2只在DB-3写后矩阵获人工验收并取得独立备份授权后创建；详见`docs/qa/production-deployment/d4-db3-rebuild-tags-plan.md`与`d4-db3-rebuild-tags-report.md`。

## 11. D4.6 第四步：Demo seed

**授权：** DB-4。B2完成且可读是硬前置。

执行顺序：

1. 复核`DEMO_USER_PASSWORD`只存在于`demo-seed.env`，常驻API和其他tools不取得该变量；确认uploads为空且可由UID10001写入。
2. 运行 `seed-demo` 一次，期间只运行db+该工具；记录退出码、耗时、峰值资源和脚本摘要，不记录演示密码。
3. 成功后核对：35帖、空正文0、重复标题0、5游戏各7帖、13评论、31点赞、10条File、20个媒体文件；File记录与实际原图/缩略图路径、大小和SHA对应。
4. 以loopback API抽样核对帖子媒体URL使用当前`PUBLIC_BASE_URL`契约，HTTP内容与bind mount文件SHA一致；验证后停止API。
5. embedding必须仍为0/35或null 35条，证明未越权提前调用AI。

**失败/回滚：** 数据库事务失败且文件补偿成功时，仍停下审查，不自动重跑。若补偿删除失败，保存精确路径并判“未完全回滚”；不得手工模糊删除。恢复B2需要新的DB/R授权。

## 12. D4.7 AI合规预检与第五步 Embedding

### D4.7-A AI preflight

**授权：** AI-1，仅一次最小DeepSeek流式调用和一次embedding调用。

1. 先核对香港ECS地区与供应商条款，不绕过地区限制；确认模型仍为`deepseek-v4-flash`与`text-embedding-3-small`。
2. 运行 `ai-preflight` 一次；deadline覆盖响应头和完整body读取。
3. 仅记录成功/失败、耗时、DeepSeek完成流与embedding“1536维且均为有限数”；不记录prompt正文、响应正文或key。
4. 失败即阻断embedding和发布，不换供应商、不换模型、不降低维度断言。

### D4.7-B Embedding backfill

**授权：** DB-5 + AI-2；在报告待处理35条与预计费用后单独确认。

1. 运行无参数 `embedding-backfill`，只补null；禁止`--all`。
2. 脚本逐条串行，最终任一失败必须非零；记录成功/失败数与总耗时，不记录标题正文或provider响应。
3. 成功后核对35/35非null、每条1536维且全为有限数；帖子、评论、点赞、文件和uploads计数不得变化。

**D4.7-B方案/只读预检回填（2026-07-23）：** 完整方案见`docs/qa/production-deployment/d4-db5-embedding-backfill-plan.md`。生产基线精确为35条null、0条非null，35个标题共722字符/2070 UTF-8 bytes；Compose最小权限、DB-4矩阵、20媒体、B2和资源均通过，供应商调用0、one-off创建0。当前FIX脚本虽逐帖串行并关闭两层自动重试，但SDK timeout不能证明覆盖完整body，且写库前没有1536维/有限值校验；因此正式DB-5 + AI-2授权被阻断，必须先完成窄范围代码修复、新候选重建与重新部署，禁止在ECS现场改脚本或用写后审计替代。

**D4.7-B与D4.8终态回填（2026-07-27）：** 上述历史阻塞已由09安全修复批次关闭。新候选完成同SHA上传、镜像导入、零写入兼容核对和唯一无参数backfill；结果为35/35条1536维有限数向量，其他业务数据与20媒体不变。B3远端/本地副本及API loopback恢复通过；证据见`docs/qa/production-embedding-write-safety/e7-production-backfill.md`与`d4-b3-final-report.md`。

**失败/回滚：** provider失败不回滚已验收seed数据，但整体发布不放行。部分null可保留；只允许在新的DB+AI授权下再次执行默认补null模式。B2位于pre-demo，自动恢复会同时撤销DB-4，因此不得把B2作为embedding失败的自动回滚。

## 13. D4.8 终态、持久性与配对备份

**授权：** E + DB只读/备份写入；本机下载属于明确的备份导出授权。不得执行cleanup apply。

执行顺序：

1. 启动db+api，运行`verify-stack.sh base`：PostgreSQL readiness、Nest liveness、Prisma readiness与uploads权限分层通过。
2. 只读核对最终数据矩阵：3 migrations、5游戏、5标签、35帖、5游戏各7帖、13评论、31点赞、10 File、正文与标题质量、35/35×1536 embedding、20个媒体文件。
3. 重启API容器，复核数据与媒体；随后只重启db容器并复核readiness、计数和媒体。D4不再次重启ECS。
4. 运行 uploads cleanup **dry-run**；orphan必须为0，或每个候选有明确解释并阻断D4关闭。不得添加`--apply`。
5. API停止后运行`backup-pair.sh`创建 `B3` final配对备份；manifest必须包含绝对路径、大小、SHA、API image ID、RELEASE_SHA和三条migration。执行`pg_restore --list`、`tar -tzf`与内部SHA检查。
6. 通过默认SFTP把B3数据库dump、uploads归档、manifest和SHA清单下载到用户本机仓库外唯一目录，逐项比较远端/本地SHA；传输失败不自动改用legacy协议。
7. API恢复为loopback运行、db healthy；Nginx仍inactive+disabled，UFW/安全组仍无80/443，公网不可访问3000/5432。
8. 清除deploy sudo缓存，关闭SSH/SFTP连接；更新D4 QA为“已实施，待用户人工验收”。用户确认前不进入D5。

## 14. 资源监测与停止阈值

| 时点 | 必查 | 阻断条件 |
|---|---|---|
| 上传/导入前 | 根盘、Docker root占用、内存/Swap | 根盘≥70%需人工复核；≥85%或可用<8GiB停止 |
| PostgreSQL首启 | MemAvailable、Swap、db health/log | MemAvailable<512MiB、OOM、容器重启循环停止 |
| 每个tools命令前 | 运行服务集合、`docker stats`、写工具进程 | API仍运行、另一个tool运行或上次容器未收口停止 |
| seed/embedding期间 | 容器状态、退出码、Swap增长、磁盘增量 | exit 137、OOM、持续Swap增长、磁盘越线停止 |
| 备份前后 | API已停、无write tool、备份空间 | 任一写工具运行、目标重名、uploads位于backup内停止 |
| 批次结束 | 容器、监听、failed units、磁盘、备份SHA | 5432发布、公网3000、failed unit、备份不可读均阻断 |

主机不编译Node、不构建镜像。所有耗内存步骤串行；Swap只承受瞬时压力，不把持续Swap视为成功。

## 15. 回滚与不得重复矩阵

| 失败点 | 立即动作 | 可恢复点 | 禁止动作 |
|---|---|---|---|
| 上传/SHA | 停止，不load | 本地原制品 | 自动重试、改tag、从脏树补文件 |
| image/load | 停止，不启动Compose | ECS无业务状态 | 删除其他镜像、prune |
| PostgreSQL首启 | 停db、保留现场 | B0或重新初始化需新授权 | 自动清空postgres目录 |
| migration | 停止所有seed | B0 | 自动再跑、改migration |
| games | 停止tags/demo | B1 | 以幂等为由自动重跑 |
| tags | 停止demo | B1 | 在非空帖子库运行、自动重跑 |
| demo | 停止AI，核对补偿 | B2 | 模糊删文件、宣称跨文件系统原子回滚 |
| AI preflight | 阻断embedding和发布 | B2与seed终态保留 | 换模型/绕地区/放宽1536断言 |
| embedding部分失败 | 保留null并停止 | B2；seed不回滚 | `--all`、无授权补跑 |
| final backup | API保持停止或按证据决定 | 最近完整B2/B3 | 用不完整备份放行D5 |

任何restore都是单独DB/R门禁：先停止API和写工具，验证目标备份SHA与release/image兼容，再恢复到隔离或明确目标；不把“失败回滚”写成自动命令链。

## 16. 验证、文档与人工门禁

### 16.1 自动证据

- 制品：同一SHA、archive/build/bundle SHA、image ID、架构、OCI revision、内容和secret扫描。
- Compose：config quiet、7个服务最小env/network、tools不随up、loopback/API与无5432发布。
- PostgreSQL：精确版本/digest、实测UID/GID、health、三条migration、bind mount持久。
- 初始化：每步唯一命令、退出码、前后计数、资源和独立备份点。
- AI：最小preflight完成、embedding 1536有限值、35/35终态。
- 媒体：20文件路径/大小/SHA，API URL内容SHA一致，重启后保持。
- 备份：B0/B1/B2/B3路径、大小、SHA、归档列表、manifest、远端/本地一致。
- 安全：3000仅loopback、5432不发布、80/443仍关闭、无secret/IP进入QA、cleanup只dry-run。

### 16.2 人工验收

用户逐门禁确认：

1. D4.0制品与主机前置。
2. D4.1上传/导入和镜像身份。
3. D4.2 secret存在性与UID/GID权限，不查看值。
4. D4.3首次db与B0。
5. DB-1 migration与B1。
6. DB-2 games。
7. DB-3 tags与B2。
8. DB-4 demo数据/文件。
9. AI-1 preflight。
10. DB-5+AI-2 embedding费用与结果。
11. D4.8终态、B3及本机备份。

### 16.3 D4.5-A1 / DB-2当前状态（2026-07-23）

- 详细施工与只读证据见`docs/qa/production-deployment/d4-db2-seed-games-plan.md`。
- 真实入口、固定5游戏、`Game.name @unique`及顺序upsert语义已经源码核对；脚本非单事务，失败不得自动重跑。
- 生产FIX API/db、三条migration、九表空库、pre-DB2恢复点、uploads与资源均完成只读复核。
- A1、A2与D4.5-B / DB-3均已人工验收通过。用户已独立授权B2 `post-DB3 / pre-demo`备份与下载；seed-demo仍未授权或执行。
- A2已唯一执行一次并获用户人工验收：Docker one-off以`exitCode=0`退出并销毁；精确生成5个批准游戏，其余8张业务表、3条migration和空uploads保持不变。API停止、原db healthy；执行证据见`docs/qa/production-deployment/d4-db2-seed-games-report.md`。

D4只能标记“已实施，待人工验收”；用户整批确认前不得启动D5、配置API_HOST、证书或公网端口。

## 17. 建议执行记录文件

D4实施时只新增/更新以下仓库文档，不改部署代码：

- `docs/qa/production-deployment/d4-runtime-initialization-report.md`：逐门禁事实、计数、资源、SHA与失败记录。
- 本文件：只同步勘误和最终状态，不改写历史门禁。
- `docs/design/07-production-deployment.md`：回填D4实测状态。
- `docs/plans/07-production-deployment-implementation-plan.md`：更新D4 checkbox与门禁。
- `.planning/production-deployment/{task_plan,findings,progress}.md`：持续上下文。

真实env、原始网络信息、数据库dump、uploads归档、镜像archive和运行日志只保存在服务器root目录或仓库外受控证据目录，不进入Git工作树。

## 18. 本方案评审结论

当前没有需要扩大产品范围、修改schema/migration、改变“收藏=点赞”、切换AI模型或新增依赖的事项。D4执行仍需要用户逐项提供或授权：secret已注入确认、ECS制品写入、数据库每一步写入、AI预检费用、embedding费用和最终备份下载。方案通过不自动授予其中任何一项。
