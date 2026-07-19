# 生产部署设计进度

## 2026-07-19

- 已执行 planning-with-files session catchup。
- 已冻结工作树基线：分支 `main`，HEAD `96f92457900f24b8bdcefce16779a1265d586bce`。
- 已确认 O2 未提交改动与 `CLAUDE.md` 用户改动存在，本批次仅新增设计/planning 文档。
- 已创建独立规划目录并切换活动计划为 `production-deployment`。
- 已读取 AGENTS、现有 phase4 部署/维护文档、00/05/06 设计与最终 QA 的相关状态，以及前后端 package/env example。
- 已核对 Prisma schema/migrations、生产入口、env profiles、CORS/TRUST_PROXY、限流、uploads 路径、SSE data stream、seed/cleanup 安全契约。
- 已核对 Vercel、Docker、PostgreSQL、Nginx、阿里云 ECS/安全组/监控计费、DeepSeek、OpenAI 与 302.AI 官方资料。
- 发现 DeepSeek 旧别名即将弃用、OpenAI 香港直连不受支持，以及宿主 Nginx→Docker bridge 与现有 `TRUST_PROXY=loopback` 的真实 IP 冲突。
- 已完成 migration、healthcheck、证书、备份、费用与下线契约核对。
- 已新增 `docs/design/07-production-deployment.md`，状态为“待人工评审，尚未实施”。
- 已完成设计自审：未发现模糊占位、真实 secret、范围扩张或与当前代码事实相冲突的已授权动作。
- 本轮仅修改 07 设计、独立 planning 记录和活动计划指针；未修改业务代码、测试、依赖、配置、数据库、原型、`AGENTS.md` 或 `CLAUDE.md`，未执行云端操作或 Git commit。
- 当前门禁：等待用户人工评审 07；未编写生产部署实施计划。

## 2026-07-19 首轮设计评审补正

- 用户总体认可架构，但要求在确认前补齐全新库初始化、健康语义和前后端发布溯源三项。
- 已只读核对 `seed-games.ts`、`rebuild-tags.ts`、`seed-demo-posts.ts`、`backfill-embeddings.ts`、`AppController`、帖子公共列表和 phase4 maintenance 旧口径。
- 已在 07 §7.3 固定五步初始化顺序，逐项写清编译后入口、最小依赖、幂等性、失败停止和独立授权，并把生产 seed 例外限定为未承载用户数据的全新作品展示库。
- 已新增 07 §6.4，区分 Nest liveness、PostgreSQL readiness、真实 Prisma readiness 与公网发布放行，不新增健康接口。
- 已新增 07 §10.4，要求 Vercel Production 与后端镜像来自同一 `RELEASE_SHA`，记录 deployment metadata 和成对回滚目标。
- 本次仍只修改 07 与 production-deployment planning；未修改业务代码、依赖、配置、云端资源或 Git 状态，仍等待 07 人工评审。

## 2026-07-19 设计确认与实施计划阶段

- 用户已明确确认 07 生产部署设计通过人工评审。
- 07 状态已同步为“已确认，进入实施计划阶段”；该状态不授权任何云端、DNS、secret、数据库或发布写入。
- 当前任务切换为编写 `docs/plans/07-production-deployment-implementation-plan.md`，本轮只写计划并停在人工评审门禁。
- 已新增实施计划并拆为D0～D8九个可独立验收/回滚批次，覆盖O2提交、one-hop、镜像/Compose、ECS、五步初始化、API边缘、Vercel同SHA、全链路和运维下线。
- 已建立完整文件矩阵、授权类型、自动验证、人工门禁、失败停止和回滚边界；migration、各seed、embedding、DNS/Vercel和付费资源均未被设计确认自动授权。
- 已完成占位词、secret、必需主题、批次数量和尾随空白自审；现停在实施计划人工评审门禁。
- 本轮未修改业务代码、部署配置、依赖、lockfile、云端或数据库，未登录ECS、未操作Vercel/DNS、未暂存或提交Git。

## 2026-07-19 实施计划首轮评审补正

- 用户当时要求把SSH连接从ECS写入授权中拆成独立逐次门禁；该初版随后已由当前TUN开启+专属DIRECT规则勘误覆盖。
- 当前S门禁固定“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”作为每次建立/重建连接的必要条件。
- 已覆盖D3主机、D4上传/数据库、D5边缘、D6后端CORS重启、D7远程审计和D8备份/监控；当前口径统一为每批结束通知“本轮 SSH 操作完成，连接已关闭”。
- 未连接ECS，未修改业务代码、部署配置或云端状态，未暂存或提交Git；仍停在实施计划人工评审门禁。

## 2026-07-19 计划确认与D0开始

- 用户确认生产部署实施计划总体批准，并说明TUN开启状态下的ECS专属DIRECT规则已人工验证成功。
- 已将全局S门禁和D3～D8远程步骤统一修正为“TUN保持开启+专属DIRECT规则+逐次确认”，删除关闭/恢复TUN旧口径。
- 实施计划状态已改为“已确认，进入D0”；当前只执行O2审计、保护哈希、自动基线和显式暂存，不连接ECS、不提交Git。

## 2026-07-19 D0完成，停在O2 commit门禁

- 已审计O2显式白名单并按pathspec暂存；`CLAUDE.md`、07设计/计划、production planning与D0 QA均未暂存。
- 前端实测：16 files/53 unit passed；build成功（2460 modules）；Playwright清单9 files/51 tests且全量51 passed；O2定向lint 0/0；全量lint保持历史3 errors/0 warnings。
- 后端实测：17 suites/74 Jest passed；build成功；O2新增文件lint 0/0；三个历史触及文件保持278 errors/0 warnings，未运行带`--fix`的全量lint。
- 受保护集合前后均为191项，SHA-256差异0；`CLAUDE.md`哈希未变且仍未暂存。
- 本轮未连接ECS，未操作Docker云端、Vercel、DNS、数据库或AI，未提交Git；当前等待用户审阅staged diff并单独授权commit。

## 2026-07-19 D0关闭

- 用户已人工确认D0 staged diff，并仅授权提交该O2集合。
- 提交成功：`7fef3bec831e047c4834f3d4765e930e9a7680eb feat(personal): add personal post lists`，共75个文件、4123行新增、49行删除。
- 提交后`git show`文件清单与审查集合一致；`CLAUDE.md`仍为未暂存用户改动且哈希未变。
- 07设计、生产部署实施计划、production planning和D0 QA仍在工作树，未被提交；未push、未重新暂存其他文件。
- 当前D0关闭，停在D1施工方案门禁；未开始D1，未连接ECS。

## 2026-07-19 D1施工方案调研

- 已同步实施计划状态为“D0已关闭；D1施工方案待人工评审”。
- 已只读核对env类型/校验、main映射、编译产物、Prisma CLI、四个初始化脚本、fixtures、uploads路径、前端Vite/Playwright变量契约和现有operations文档。
- 已依据官方资料选定Node 24.18.0 Bookworm slim与PostgreSQL 16.14 Bookworm精确镜像，并写明digest复核/停止规则。
- 已形成D1新增/修改/禁改文件矩阵、八步施工顺序、Docker/Compose/Nginx/Vercel/四脚本契约、验证命令、风险、回滚和三commit建议。
- 已完成方案一致性自审：补齐preflight测试文件、仓库外临时Compose校验env、集中风险停止表，并统一全局与D1的三份提交拆分。
- 本轮只修改生产实施计划与production planning；未修改代码、部署配置、依赖、数据库、既有测试或`CLAUDE.md`，未构建镜像、未连接ECS、未调用AI、未暂存或提交Git。
- 当前停在D1施工方案人工评审门禁。

## 2026-07-19 D1实施获批

- 用户已确认D1施工方案并授权本地实施，但未授权任何Git commit。
- 施工前复核HEAD为O2提交、暂存区为空、`CLAUDE.md`哈希与D0保护清单一致。
- 已订正PostgreSQL 16.14镜像证据：index为`92620d...`，linux/amd64 manifest为`c95fd534...`；`05dd391...`属于linux/386，不再作为amd64证据。
- 当前开始D1本地施工；不连接ECS，不运行真实数据库、seed、embedding或AI预检，不操作Vercel/DNS。

## 2026-07-19 D1镜像验证暂停

- one-hop已完成TDD RED/GREEN：RED准确暴露旧校验与缺失映射；GREEN为16/16，后端触及文件定向lint 0/0。
- `ai-preflight`已完成TDD RED/GREEN：RED因实现模块缺失失败，GREEN为Node内建测试6/6，未进行真实AI调用。
- Compose非敏感配置验证通过；默认服务仅`db,api`，tools profile才包含migrate/games/tags/demo/embedding/preflight。
- Buildx已实测Node与PostgreSQL的index/amd64 digest均与订正值一致。
- 第二次本地镜像构建因Prisma需要额外系统包`openssl`以及完整build的`unrs-resolver`白名单缺口非零退出，未加载候选镜像。根据用户“额外系统包立即暂停”约束，D1当前停在系统包范围确认门禁。
- 用户随后明确一并授权：镜像OS基础层安装`openssl`，并将`unrs-resolver`加入临时显式构建白名单；未授权其他系统包、依赖或lockfile变更，D1恢复施工。

## 2026-07-19 D1本地施工完成

- 镜像在用户授权后仅安装`openssl`并将`unrs-resolver`加入中间层`allowBuilds`白名单；未修改package/lockfile。
- 实测发现Docker build若不复制根目录`prisma.config.ts`会生成与本地不同的`dist/*`结构；已补入该文件并用非敏感build-only URL完成Prisma generate，最终镜像恢复既有`dist/src/main.js`和`dist/src/scripts/*`契约。
- 本地linux/amd64验证镜像通过架构、UID/GID10001、工作目录、入口、healthcheck、OCI release/base digest、OpenSSL、bcrypt/sharp/Prisma、4组migration、4个初始化脚本和10张fixture检查；最终临时archive SHA-256为`7152DAC86E7230E339349C46CD6C42AA145305180363411BE03978AB6E7A8113`，记录后已删除。
- Compose默认服务为`api,db`；tools profile额外包含migrate、games、tags、demo、embedding和AI preflight，未启动任何真实stack。Nginx、Vercel、PowerShell/POSIX/Node脚本语法、fail-fast和静态扫描通过。
- 回归结果：后端env 16/16、后端全量17 suites/81、后端build、D1定向lint0/0；前端16 files/53、build、Playwright9 files/51。前端历史lint保持3/0，后端历史lint833/6，低于P6的881/7。
- HEAD仍为O2 SHA，暂存区为空；CLAUDE.md哈希与D0一致，package/lock、schema/migrations和既有e2e均未变化。当前停在D1人工验收与提交授权门禁，未进入D2。

## 2026-07-19 D1提交前安全复核修复

- 用户认可原自动门禁但阻止提交，指出env/网络最小权限、AI body超时、备份manifest、备份重名/嵌套/写入口及build输出根目录五项缺口。
- 先以失败测试复现：AI body读取可无限等待；旧Compose无法满足服务级env标记；build输出等于repo根目录会调用Docker；backup位于uploads会进入备份流程。
- 最小修复后：AI preflight 8/8、Compose策略7项、build路径2项、backup安全fixture4项全部通过。常驻API不再持有seed密码；各tools按职责拆分env和网络。
- 备份manifest新增镜像digest、migration清单、绝对路径、大小与SHA；拒绝同名complete/incomplete、uploads/仓库嵌套和运行中的写入型tools。
- 当前仍未暂存/提交，未进入D2，未连接ECS，未调用真实AI/数据库，等待完整回归与D1再次人工验收。
- 验证中两次命令环境误用均未触及文件：后端首次把`--runInBand`多传了一个`--`而未发现测试；前端首次把build变量注入unit而使“缺变量失败”用例按预期报错。更正命令后分别为17 suites/81与16 files/53全过。
- 文档文件矩阵首次补丁因上下文不匹配被整体拒绝、无部分写入；拆为精确上下文后成功。
- 本地镜像复核首次因PowerShell与Docker Go template嵌套引号导致模板解析失败，未启动容器；改用JSON结构化inspect后确认amd64、UID/GID10001、`/app`、Node healthcheck和编译产物均保持通过。

## 2026-07-19 D1人工验收通过

- 用户确认D1人工验收通过，授权仅使用显式pathspec暂存D1文件并进行staged diff审查。
- 当前不得提交、进入D2、连接ECS、调用真实AI/数据库或操作Vercel/DNS；三个建议commit分别等待独立授权。
