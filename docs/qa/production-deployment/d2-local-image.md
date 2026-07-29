# D2 干净 release、隔离 Compose 与恢复演练方案

> 日期：2026-07-19
>
> 状态：D2.0～D2.5 已实施并于 2026-07-19 通过用户人工验收；保留现场，D2 正式关闭
>
> 候选 `RELEASE_SHA`：`38247ff057310e0f98125a0bbcafbfab2969877c`

## 1. 边界

- D2 只在本机、仓库外一次性目录和非生产端口写入。
- 不连接 ECS，不操作 Vercel/DNS，不访问真实 AI，不接触本地开发数据库或未来生产数据库。
- 不修改产品代码、部署配置、依赖、lockfile、schema、migration 或既有测试。
- 当前主工作树 `CLAUDE.md` 是用户未提交改动；D2 不 stash、不覆盖、不暂存、不提交该文件。

## 2. 文件与运行目录

| 类别 | 路径/对象 | 口径 |
|---|---|---|
| release来源 | 仓库外 `D2_ROOT/release` | detached worktree，精确指向候选SHA，必须干净 |
| 镜像制品 | `D2_ROOT/artifacts` | 新构建tar、manifest、SHA-256；不复用D1临时制品 |
| source写入 | `D2_ROOT/source/{postgres,uploads,backups,env}` | 全新目录；Compose project `blackbox-d2-source-38247ff` |
| restore写入 | `D2_ROOT/restore/{postgres,uploads,backups,env}` | 全新目录；Compose project `blackbox-d2-restore-38247ff` |
| 仓库证据 | 本文件、07设计/实施计划、production planning | 只记录命令结果、计数、路径、大小、hash，不记录secret |

source API 固定候选端口为 `127.0.0.1:3108`，restore API 为 `127.0.0.1:3109`；执行前端口必须空闲，否则停止并重新确认替代值。5432不发布。

## 3. 数据写入清单

1. source 全新 PostgreSQL bind mount：运行3个现有 migration。
2. source 初始化：依次运行 `seed-games`、`rebuild-tags`、`seed-demo`；每步一次、每步失败即停。
3. source uploads：seed 图片及一个带SHA-256的非产品 sentinel。
4. source backup：一次配对 custom dump + uploads tar + manifest/SHA-256。
5. restore 全新 PostgreSQL/uploads：不先跑migration/seed，从配对备份恢复并只读核对。

D2 不运行 `embedding-backfill` 或 `ai-preflight`，不调用 Search/Chat。预期 seed 数据为35帖、5游戏且每游戏7帖、13评论、31点赞、10条File记录；embedding为空不构成D2失败，也不能被描述为生产初始化完成。

## 4. 资源预算

- 主机可用内存至少4 GiB、可用磁盘至少8 GiB；不足即不执行。
- 构建、source栈、restore栈串行；任一时刻最多一个API/db组合。
- 单栈配置上限：PostgreSQL 640 MiB、API 768 MiB；一次只运行一个写入工具，写工具期间API停止。
- `D2_ROOT`软上限4 GiB；超限停止并保留证据，不清理其他Docker项目或全局缓存。

## 5. 验证矩阵

- 发布源：SHA精确、worktree干净、主工作树及`CLAUDE.md`保护成立。
- 回归：前端16/53、后端17/81、Playwright9/51、两端build及差分lint。
- 镜像：linux/amd64、UID/GID10001、`/app`、真实入口、Node healthcheck、3个migration目录、4个脚本、10张fixture、无secret。
- source：`/api` liveness、`pg_isready`、匿名posts Prisma readiness、初始化计数、重启持久化。
- backup：list/tar可读、双SHA、绝对路径、大小、候选SHA、镜像ID、3个migration。
- restore：独立目录/端口/project，数据库计数、媒体、migration和sentinel与source一致。

## 6. 失败与清理

任何失败均不自动重试；先停止两个D2 project并确认端口释放，保留仓库外隔离目录供诊断。人工验收前不删除worktree、archive、数据库、uploads或备份。

D2通过后的删除需要新的本地清理授权，并先验证目标路径严格受`D2_ROOT`约束；允许移除D2 worktree、D2目录与D2 image tag，禁止`docker system prune`、全局volume清理或触碰其他项目。

## 7. 当前结论

D2.0前置门禁通过：Docker 29.4.3为Linux/amd64，Compose 5.1.3、Buildx 0.33.0可用；3108/3109均无监听；可用内存约41.03GiB、C盘可用约762.49GiB；无旧D2容器或候选镜像。

已在仓库外创建`D2_ROOT/release` detached worktree，HEAD精确为候选SHA且`git status --porcelain`为空。主工作树`CLAUDE.md` SHA-256仍为`A245212777880744CF2F052B909A6F157CF0E481A11D1B70147C85C8557C4445`，release中的版本哈希不同，证明用户改动未进入候选来源。两端依赖均从本机pnpm store离线恢复，下载数为0，lockfile未修改。

D2.1后端首次Jest结果为17 suites中11 passed、6 failed to run，64 tests passed、1 failed。失败原因均为fresh worktree尚未生成构建产物：5个suite无法加载`.prisma/client/default`；`production-start.spec.ts`因`dist/src/main.js`尚不存在失败。现场复核确认两文件均不存在，worktree仍干净，因此不是候选业务测试断言回归。

按失败停止契约，未自动运行`prisma generate`、build或重试Jest；未进入D2.2。当前无D2容器，3108/3109已释放；未构建镜像、未写数据库/uploads、未调用AI或外部服务。worktree及离线依赖现场保留，等待用户确认是否按“Prisma generate→后端build→Jest”的fresh checkout顺序继续。

用户授权从保留现场按修正顺序继续后，使用仅存在于进程的不可连接build-only数据库URL成功完成Prisma generate和Nest build，`dist/src/main.js`已生成，未连接数据库、未修改lockfile或候选SHA。唯一一次授权Jest复跑结果为16/17 suites通过、79 tests通过；仅`ai.controller.spec.ts`在模块加载时因fresh worktree无`.env`而触发运行时校验失败，缺少数据库、JWT及DeepSeek/OpenAI变量，suite未加载。

第二次失败仍不是业务断言回归，而是测试命令除生成物外还依赖完整运行时测试env。按“再次失败立即暂停”要求，未自行注入无效占位env进行第三次复跑。现场复核：worktree HEAD与状态不变、lockfile diff为0、无D2容器、3108/3109无监听、未进入D2.2。后续如获授权，只允许在单个Jest进程注入不可连接数据库URL、足长测试JWT和`.invalid` AI base/无效key，不创建env文件、不访问数据库或AI，并保留前两次失败证据。

用户再次授权后，单次Jest进程已注入完整非敏感变量，但人工构造的JWT占位值包含校验器禁止的弱词`test`。结果仍为16/17 suites、79 tests通过，仅`ai.controller.spec.ts`在导入期被强密钥校验拒绝，没有进入测试断言。按失败停止门禁未自动更换值重试；后续只能在进程内以密码学随机字节生成临时JWT，不记录值、不创建env文件。D2.2仍未开始。

## 8. D2.1 最终基线

- 经用户继续授权，在单个 Jest 进程内使用未输出、未落盘的密码学随机 `TOKEN_SECRET`，并继续使用不可连接数据库 URL、无权限 key 与 `.invalid` provider base。
- 最终后端为 17 suites / 81 passed；后端 build 通过，D1 触及文件定向 lint 为 0 errors / 0 warnings。
- 前端为 16 files / 53 unit passed，build 通过（2460 modules）；Playwright 清单为 9 files / 51 tests，执行结果 51 passed。前端全量 lint 保持批准基线 3 errors / 0 warnings，没有新增债务。
- `prisma generate → build → Jest` 是干净 checkout 的真实生成物前置；测试命令还依赖完整非敏感运行时变量。该自包含性缺口只登记为工程观察项，D2 未修改测试或 package scripts。

## 9. D2.2 候选镜像与制品

- 镜像标签：`black-box-api:38247ff057310e0f98125a0bbcafbfab2969877c`。
- 镜像 ID：`sha256:af0789ef7e7d81337aec69e52b8287ac0343a095457392acdf483f8a768e51d4`；架构 `linux/amd64`，用户 `10001:10001`，工作目录 `/app`，入口 `node dist/src/main.js`。
- OCI revision 与候选 SHA 一致；Node index digest 为 `sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d`，linux/amd64 manifest digest 为 `sha256:d45d78e7929b46875bbd4e29bea672d5bc48186c6c3588306521c815e78352d6`。
- 镜像包含精确 3 个 migration、4 个编译脚本和 10 张 demo fixture；history secret 命中 0，archive 禁止项命中 0。
- archive 位于仓库外 D2 artifacts，大小 `205705216` bytes，SHA-256 为 `e69cfb105c5146c283dfd8b128bbd97a6c43616edc518f9ef032bef71fecbf76`；build manifest SHA-256 为 `f16df86a11f57e18ea1652b17c5de8b3be1e6edd024f54f43f12f52d9e006664`。

## 10. D2.3 source 初始化与持久化

- source Compose project 为 `blackbox-d2-source-38247ff`，API 只绑定 `127.0.0.1:3108`，PostgreSQL 不发布宿主端口；职责分离的 7 个 env 文件只位于仓库外目录，值未写入 QA。
- 先只启动 db，PostgreSQL health/readiness 通过；migration 只执行一次，应用的名称精确为：
  - `20260122120657_init_user`
  - `20260122122848_add_posts`
  - `20260617092158_add_game_and_post_fields`
- 初始化前 `GET /api` liveness 和匿名 posts Prisma readiness 通过，帖子总数为 0。API 停止后，`seed-games → rebuild-tags → seed-demo` 各执行一次且逐步只读验收；未运行 embedding、AI preflight、Search 或 Chat。
- source 终态：35 帖、13 评论、31 点赞、10 条 File 记录、空正文 0、重复标题 0、embedding 0；5 个游戏各 7 帖。
- uploads 共 21 个文件（20 个 seed 图片文件及 1 个 sentinel）。sentinel SHA-256 为 `d1193a4614d8537533eb91875d0b75ce95988f72b635ef1070d7dcdafdf4ff11`；source 媒体 manifest SHA-256 为 `0012e0f60bf5ec64ba1deb202917fc33fc66ec45ae5cc01ae114ea4c80aac12e`。
- API force recreate 后帖子总数仍为 35；10 个媒体 URL 均使用 source 自己的 `http://127.0.0.1:3108/uploads/`，抽样 HTTP 内容 SHA 与 bind mount 文件一致。

## 11. D2.4 配对备份与隔离恢复

- 首次调用备份脚本时未传 source Compose project 上下文，脚本在错误的默认 project 中报告 db 未运行，并保留 1 个 `.incomplete` 目录；该失败未生成完整备份，也未重跑任何 migration/seed。
- 修正为显式 `COMPOSE_PROJECT_NAME=blackbox-d2-source-38247ff` 后只执行一次新的备份。脚本停止 source API 并生成完整目录 `20260719T095257Z-38247ff057310e0f98125a0bbcafbfab2969877c`；失败 `.incomplete` 证据继续保留。
- database dump 为 `33794` bytes，uploads archive 为 `300425` bytes；两者 SHA-256 均与 manifest 一致。manifest 同时匹配候选 SHA、镜像 ID、3 个 migration、绝对路径和大小；`pg_restore --list` 与 `tar -tzf` 均通过。
- source project 完全 down 后才启动独立 restore project `blackbox-d2-restore-38247ff`。restore 使用独立 PostgreSQL、uploads、env 和端口 `3109`；未预跑 migration 或 seed，直接从 custom dump 和 uploads archive 恢复。
- restore 终态与 source 一致：35 帖、13 评论、31 点赞、10 条 File 记录、空正文 0、重复标题 0、embedding 0、5 个游戏各 7 帖、3 个 migration。
- 21 个媒体文件按相对路径和 SHA-256 与 source manifest 完全一致；sentinel SHA-256 一致。restore API liveness、PostgreSQL readiness、Prisma readiness 均通过；10 个媒体 URL 均使用 restore 自己的 `http://127.0.0.1:3109/uploads/`，抽样 HTTP 文件 SHA 与恢复文件一致。

## 12. D2.5 终态门禁

- source 与 restore 两个 Compose project 均已执行 `down --remove-orphans`，未使用 `-v`；3108/3109 监听为 0，D2 容器残留为 0。
- detached release worktree HEAD 仍精确为候选 SHA，状态项 0；两端 lockfile diff 为 0。主工作树暂存项 0，`CLAUDE.md` SHA-256 仍为 `A245212777880744CF2F052B909A6F157CF0E481A11D1B70147C85C8557C4445`。
- 候选镜像、205705216-byte archive、source/restore PostgreSQL、uploads、env、完整备份和失败 `.incomplete` 均保留供人工验收；未执行 prune 或物理清理。
- `D2_ROOT` 文件总量约 `1126969244` bytes，低于 4 GiB 软上限。
- 本批未连接 ECS，未操作 Vercel/DNS，未调用真实 AI，未触碰开发库或未来生产库，未暂存或提交 Git。当前停在 D2 人工验收门禁。

## 13. 人工验收结论

- 用户确认技术链路完整通过，失败、暂停及三次继续授权过程可审计。
- 候选 `RELEASE_SHA` 继续固定为 `38247ff057310e0f98125a0bbcafbfab2969877c`。
- D2 worktree、镜像、archive、source/restore 数据、完整备份和失败 `.incomplete` 暂不清理；清理仍需独立授权。
- D2 正式关闭。该确认只允许进入 D3 施工方案阶段，不授权 SSH、ECS 写入或 D3 实施。
