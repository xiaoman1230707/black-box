# 生产部署设计调研发现

## 当前基线

- O2 已完成、关闭并经用户授权独立提交；提交为 `7fef3bec831e047c4834f3d4765e930e9a7680eb`，部署批次继续保护未暂存的用户 `CLAUDE.md` 改动。
- 最终自动基线：前端 16 files / 53 unit passed；后端 17 suites / 74 Jest passed；Playwright 9 files / 51 passed。
- `AGENTS.md` 中 7 files / 41 tests 和 my-posts/my-likes 债务描述已过期，本设计不沿用。
- 当前工作树包含 O2 与用户 `CLAUDE.md` 改动，本批次不得覆盖或纳入部署变更。

## 本地实现证据

- `docs/operations/phase4-deployment.md` 已定义应用级环境变量、精确 CORS、`TRUST_PROXY`、SSE 透传、限流和生产启动校验，但尚未形成 Vercel + ECS + Docker Compose + PostgreSQL 的完整基础设施设计。
- 前端 `package.json` 使用 Vite 静态构建：`pnpm build` 产物为 `dist`；`VITE_API_BASE_URL` 必须显式注入，`.env.example` 不会自动加载。
- 后端 `package.json` 的生产入口已修正为 `node dist/src/main.js`；现有维护命令包括 uploads cleanup、demo seed、embedding backfill 和组合 `seed:demo:full`。
- 后端 runtime 环境变量已覆盖 `DATABASE_URL`、`TOKEN_SECRET`、DeepSeek/OpenAI、`PUBLIC_BASE_URL`、`FRONTEND_ORIGIN`、`TRUST_PROXY`、AI timeout 与限流参数；文档和设计不得记录真实值。
- 当前依赖中没有 Docker/Nginx/生产发布工具；本轮不新增依赖或配置，只设计后续落地契约。
- O2 终态以 06 设计与 QA 为准：前端 16/53、后端 17/74、Playwright 9/51；`AGENTS.md` 的 7/41 与 my-posts/my-likes 债务为过期信息。
- 仓库当前没有 Dockerfile、Compose、Nginx 或 Vercel 配置文件；生产部署需要后续实施批次新增这些工程文件。
- Nest 以 `process.cwd()/uploads` 同时作为静态资源根目录和上传写入根目录；容器工作目录必须稳定，且整个 uploads 根目录需 bind mount，不能只挂缩略图子目录。
- uploads 结构包含帖子原图 `uploads/{base}.jpg`、帖子缩略图 `uploads/resized/{base}-thumbnail.jpg`、头像 `uploads/avatar/resized/{base}-small|large.jpg`。
- Prisma 使用 PostgreSQL，现有 3 个正式 migration；生产必须使用 `prisma migrate deploy`，不能使用开发库复制或 `migrate dev`。
- `seed:demo` 会同时写数据库和 uploads，并有数据库事务与文件补偿；embedding 是随后独立外部调用阶段，组合命令失败必须视为未完成，不能声称整批原子回滚。
- Chat 响应为 `text/plain` data stream，含 `x-vercel-ai-data-stream: v1`、`Cache-Control: no-cache`、`Connection: keep-alive`；Nginx 必须关闭代理缓冲并保留流式响应。
- Nest 静态文件和上传路径都依赖进程 cwd；生产镜像/Compose 的 working directory 必须与该契约一致。
- `PUBLIC_BASE_URL` 直接生成 `${API origin}/uploads/...`，生产应设为 `https://API_HOST`，不能带 `/api`；前端 `VITE_API_BASE_URL` 则必须是 `https://API_HOST/api`。
- CORS 仅允许精确 `FRONTEND_ORIGIN`，methods 为 GET/POST/DELETE/OPTIONS，headers 为 Authorization/Content-Type，且当前不使用 cookie credentials；Preview 域名不能与 Production 共用生产后端 origin。
- `TRUST_PROXY` 只接受 `false|loopback`；宿主 Nginx 经 Docker 端口映射进入容器时，Nest 通常看到 Docker bridge 地址而非 loopback，现状不足以可靠恢复真实客户端 IP。07 采用最小部署前置：新增受控 `one-hop` 值，并且只在 API 端口绑定宿主 loopback、3000 不公网开放、Nginx 为唯一入口时映射为 Express 一跳可信代理。
- 限流 storage 是 Nest 默认进程内存；本架构固定单 Nest 容器，因此当前语义可接受，但重启会清零，多副本不共享。
- embedding 模型固定 `text-embedding-3-small`，当前 1536 维；切换供应商/模型前必须先验证协议、维度和全量重算，不可混用向量空间。
- uploads 写入使用内存上传缓冲后由 Sharp 生成 JPEG；Nginx body 限制与 Node/应用内存预算必须共同约束，避免 2GB 实例被并发大文件挤压。
- 演示 seed 的幂等口径是按 manifest 定向替换，主键会前进；图片仅创建不存在的输出并记录本次新建路径，失败时补偿删除本次新建文件，不删除运行前已有文件。

## 官方平台证据

- Vercel 官方支持为 monorepo 项目设置 Root Directory；本项目应固定为 `frontend/black_box`，Framework=Vite，Build=`pnpm build`，Output=`dist`。
- Vercel 环境变量按 Production/Preview/Development 隔离；生产 `VITE_API_BASE_URL` 只能指向生产 `https://API_HOST/api`。当前没有独立预览后端，Preview 必须失败关闭，不能默认访问生产 API。
- Vercel SPA 需要项目根 `vercel.json` catch-all rewrite 到 `/index.html`；该文件当前不存在，属于未来实施文件。
- Docker 官方推荐 Ubuntu 使用其 apt repository 安装 Engine、Buildx 和 Compose plugin；Compose standalone 已属 legacy。
- Docker Buildx 支持明确目标平台与构建元数据；本设计可用本地 `linux/amd64` 构建、导出 image archive、SHA-256 后经 SSH 传输，避免在 2GB ECS 上编译 Node/Sharp 依赖。
- PostgreSQL 官方对 major 版本支持 5 年；PostgreSQL 16 当前受支持至 2028-11-09。Docker 官方 `postgres:16` 的持久目录是 `/var/lib/postgresql/data`，不能误挂父目录导致匿名 volume。
- Nginx 官方支持 `proxy_buffering off`、`proxy_read_timeout`、真实 IP 转发和 `client_max_body_size`；Chat location 需要独立禁用响应缓冲。
- 阿里云官方建议公网网站仅开放 80/443，SSH 只允许管理员可信 IP，数据库端口不得公网暴露；与当前 22 限定 /32、3389 删除的现状一致。
- 阿里云 CloudMonitor 可监控 CPU、磁盘、IOPS 并配置告警；停止按量 ECS 不必然停止所有费用，释放实例后仍要检查磁盘、快照、EIP 等独立计费资源。
- DeepSeek 官方当前 base URL 为 `https://api.deepseek.com`，并公告 `deepseek-chat`/`deepseek-reasoner` 于 2026-07-24 15:59 UTC 弃用；生产应显式设置并验证 `deepseek-v4-flash`，不能继续依赖即将失效的默认别名。
- OpenAI 官方支持地区列表明确说明未列出的地区不受支持，当前列表不含 Hong Kong；如果 `OPENAI_BASE_URL` 直连 OpenAI，香港 ECS 部署必须阻断，不得以代理或绕行规避限制。
- 302.AI 官方文档提供 OpenAI-compatible `/v1/embeddings` 与按量计费，其条款称平台本身不作地域限制但用户须遵守当地及上游规则；部署仍需确认当前账号、模型和上游条款，并从 ECS 做最小 1536 维实测。

## 差异与风险

- 当前工作树位于 `main`、HEAD `96f92457900f24b8bdcefce16779a1265d586bce`，包含未提交 O2 文件和用户 `CLAUDE.md` 改动；部署批次不能把“当前工作树直接上传服务器”当作发布制品来源。
- 本轮一次读取误写文件名 `src/config/public-media-url.ts`，真实文件为 `src/config/public-url.ts`；已停止使用错误路径并改按引用定位。
- `UploadController` 使用 Multer memoryStorage，5MB 校验发生在 controller 接收后、service 内处理；Nginx 必须先用约 6MB multipart 上限拦截，且并发上传要受现有限流保护。
- `nest build` 不复制 `src/scripts/fixtures/phase4-demo-images`；未来生产镜像若要执行编译后的 demo seed，必须显式复制 fixture 到与 `dist/src/scripts/seed-demo-posts.js` 的 `__dirname` 相匹配的位置。
- 宿主 Nginx 经 Docker bridge 访问 Nest 时，容器看到的代理地址通常不是 loopback，而代码只接受 `TRUST_PROXY=false|loopback`。若直接采用 `127.0.0.1:3000` 端口映射，真实客户端 IP/按 IP 限流契约可能失真；07 必须选择明确网络方案或登记最小部署配置改造。

## 最终设计决议

- 唯一发布路线为：干净 `RELEASE_SHA` 的本地 Docker Buildx `linux/amd64` 构建，导出镜像归档与 SHA-256 后直传 ECS；不在 2GB ECS 内编译，不在首批引入镜像仓库。
- 宿主只承担 Nginx、SSH、持久目录与基础运维；Compose 固定单 API + PostgreSQL 16，3000 仅绑定 loopback，5432 仅 Compose 内网。
- 前端 Vercel Root Directory 为 `frontend/black_box`；Production 指向生产 API，Preview 使用保留无效地址失败关闭，不共享生产后端。
- PostgreSQL、uploads 和备份全部使用宿主 bind mount；migration、seed/backfill、cleanup apply、Production 切流分别设人工授权门禁。
- DeepSeek 生产模型显式设为仍受支持的 `deepseek-v4-flash`；embedding 保持 `text-embedding-3-small`/1536维。香港 ECS 不得直连不支持该地区的 OpenAI 官方 API，也不得绕过限制。
- 配对备份必须包含数据库 dump、uploads 归档和 manifest/SHA-256；恢复先在隔离 Compose project 演练，回滚不允许只恢复其中一侧。
- 当前 Node 24.18.0、pnpm 11.9.0 为调研环境事实；生产镜像在实施时选择受支持 Node LTS 并锁定 digest，不把开发机版本自动视为生产版本。

## 首轮评审补正核对

- 全新生产库必须严格按 `prisma migrate deploy` → `seed-games` → `rebuild-tags` → `seed-demo` → 默认补缺 embedding backfill 执行；现有 `seed:demo:full` 只包含后两步，不能替代完整初始化。
- 编译后脚本入口分别为 `dist/src/scripts/seed-games.js`、`rebuild-tags.js`、`seed-demo-posts.js`、`backfill-embeddings.js`。生产镜像必须携带这些产物；demo seed 还依赖编译后 fixtures 与可写 uploads。
- `seed-games` 按唯一 name upsert，可安全重跑；`rebuild-tags` 会删除全部 PostTag/Tag，只能在 Post/PostTag 都为 0 的全新库执行，对已有生产数据不具备安全幂等性。
- demo seed 只在全新作品展示生产库获得窄范围生产例外，且仍需独立授权、配对备份和文件补偿；这不改变 phase4-maintenance 对一般生产库禁止 seed 的安全口径。
- 全新库的 embedding 使用默认补缺模式，不用 `--all` 重算；部分失败最终非零，存在 null 或非1536维即阻断发布。
- `GET /api` 的实现只返回 AppService 字符串，不访问 Prisma，只能作为 Nest liveness。现有匿名 `GET /api/posts?page=1&limit=1` 会执行 post count/findMany，可作为应用/数据库 readiness；`pg_isready` 仅表示 PostgreSQL 接受连接。
- Vercel Git branch 最新状态不能证明前后端同源；必须从 deployment metadata 核对 source commit SHA，并把 deployment ID/immutable URL、Production alias、构建变量状态和回滚 deployment 与后端镜像 digest 一起写入 release pair。

## 实施计划阶段代码核对

- `RuntimeEnv.trustProxy` 当前类型为 `false | 'loopback'`，解析器只接受字符串 `false|loopback`；最小施工必须同步修改类型、解析分支、错误信息、env 单测和 `main.ts` 映射，不能只改示例 env。
- `env.spec.ts` 已有“拒绝非法代理值”和“接受 loopback”测试接缝；新增 one-hop 应先写接受值测试，同时保留 `true` 等任意信任配置拒绝测试。
- `nest-cli.json` 当前无 assets，`tsconfig.build.json` 排除 spec；生产 Docker build 必须显式复制 demo fixture，而不是假设 Nest 自动带入。
- Vite 构建会在 config 加载时校验 `VITE_API_BASE_URL`；Playwright webServer 已显式注入本地测试值。Vercel Production 必须在构建前设置该变量，Preview 使用失败关闭值。
- 当前工作树仍为 `main`/HEAD `96f92457900f24b8bdcefce16779a1265d586bce`，O2 与 `CLAUDE.md` 用户改动混在未提交状态；D0 必须先做逐文件归属审计，禁止 `git add .`，并在用户确认后仅提交 O2/权威文档，不纳入 `CLAUDE.md`。

## 实施计划分批结论

- 采用 D0～D8 九个批次：发布源、部署文件、本地镜像、ECS主机、生产库、API边缘、Vercel切流、全链路验收、运维交接。每批可独立拒绝、回滚和重新验收。
- D0 先用显式白名单独立提交已验收 O2；07/计划和部署施工使用后续提交。最终 `RELEASE_SHA` 是包含 O2+D1部署变更、排除用户 `CLAUDE.md` 改动的干净commit。
- D1 不新增依赖：one-hop 用现有 env/main 接缝；部署脚本只用 PowerShell、POSIX shell和Node内建能力。`ai-preflight` 通过tools profile只读挂载，不进入常驻产品路径。
- D4 将migration、games、tags、demo、AI预检/embedding拆成五个数据库停点和独立AI费用门禁；不使用`seed:demo:full`绕过中间验收。
- D6才允许Vercel Production和前端DNS切流；D7只验证不开发；D8只形成监控/下线闭环，不自动释放付费资源。

## SSH/DIRECT 规则勘误

- 用户已在TUN开启状态下人工验证ECS专属DIRECT规则，旧“关闭TUN后连接”口径作废；实施始终保持TUN开启。
- 连接确认从一般ECS授权中拆成独立S门禁；批次获批、E授权和之前连接成功都不能替代当次握手。
- 每次SSH/SCP/SFTP/rsync-over-SSH或重连仍需独立S授权，固定确认语句改为“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”。
- 连接失败先暂停并请用户核对本地DIRECT规则，不自动关闭TUN，也不修改安全组、密钥、sshd或认证方式。
- 每组远程操作结束只通知“本轮 SSH 操作完成，连接已关闭”，不再提示恢复TUN。
- 文档只记录“专属 DIRECT 规则已人工验证”，不保存真实ECS IP、出口IP或私钥路径。

## D0 提交事实（2026-07-19）

- O2 staged集合经用户人工验收后，以`feat(personal): add personal post lists`独立提交。
- 完整`O2_SHA`为`7fef3bec831e047c4834f3d4765e930e9a7680eb`，提交范围为75个已审查文件。
- `CLAUDE.md`前后哈希一致且未进入提交；07设计、生产计划、production planning和D0 QA也未进入提交。
- D0未push、未连接ECS、未执行云端、数据库或AI操作。

## D1施工调研事实（2026-07-19）

- Node 24.18.0是当前最新LTS；选定官方`24.18.0-bookworm-slim`并锁定多平台index digest。PostgreSQL选定16.14 Bookworm并同样锁定index digest；D1施工先用Buildx复核，不一致即停。
- 当前`RuntimeEnv.trustProxy`只有`false|'loopback'`；D1增加`'one-hop'`并用纯函数映射为Express数字`1`，拒绝`true`、数字字符串、CIDR和任意文本。
- `main.ts`当前定向lint为11 errors/1 warning，均在D1触及范围；施工完成必须收敛该文件到0/0，不把历史问题留在已修改文件。
- 当前Nest build真实产物为`dist/src/main.js`和四个`dist/src/scripts/*.js`，但fixtures目录不存在；Dockerfile必须显式复制10张demo fixture到编译后`__dirname`路径。
- Prisma CLI当前位于生产dependencies，migrate可用镜像内`node node_modules/prisma/build/index.js`执行，无需runtime Corepack或新增依赖。
- uploads基于`process.cwd()/uploads`，因此runtime固定`WORKDIR /app`并bind整个`/app/uploads`可同时覆盖原图、缩略图和头像。
- Compose采用db内部网络+api egress双网络；3000只绑定宿主loopback，5432不发布。migrate/games/tags/demo/embedding/preflight全在tools profile且只能显式run。
- Nginx覆盖客户端转发IP头为`$remote_addr`，和one-hop共同阻止伪造链；Chat独立关闭buffer/cache/gzip并保留data-stream协议。
- 首次D1镜像构建被pnpm 11默认`strictDepBuilds`阻断，明确列出Nest/Prisma/bcrypt构建脚本为未批准；未修改package/lock。官方11.x契约要求使用`allowBuilds`，因此Dockerfile只在中间阶段生成临时`pnpm-workspace.yaml`白名单，不使用`dangerouslyAllowAllBuilds`，该文件不进入runtime或仓库配置。
- 第二次构建证明显式白名单生效，bcrypt与Prisma构建脚本开始运行；随后Prisma在Node Bookworm slim中明确警告无法检测OpenSSL并要求安装`openssl`，完整build阶段同时发现锁内`unrs-resolver@1.11.1`需要加入显式白名单。用户已独立授权两项最小修正；最终镜像仅新增OpenSSL runtime包与该显式白名单项，native modules和Prisma均通过镜像内加载检查。
- D1不新增package依赖；`ai-preflight`测试使用Node内建test/mock fetch，其余脚本使用PowerShell/POSIX/Node现有能力。
- 本地`nest build`之所以输出`dist/src/*`，是因为根目录`prisma.config.ts`参与tsconfig共同根目录推断；Docker build若遗漏该文件会漂移为`dist/*`。镜像必须复制`prisma.config.ts`，并仅对Prisma generate使用非敏感build-only URL，才能与package/runbook保持同一真实入口且不接触数据库。
- D1最终自动基线为后端17 suites/81（one-hop新增7条）、前端16 files/53、Playwright9 files/51；固定写死的旧后端74条仅是D0施工前基线，后续门禁应以81为准。
- D1提交前复核证明Compose不能让常驻API与一次性tools共用完整backend env：最终按runtime/database/demoSeed/embedding/AI preflight拆分env，且网络分别最小化为db、db+egress或egress。
- `fetch()`解析到响应头不代表AI预检完成；deadline必须覆盖`text()`/`json()`完整body消费，避免上游半开连接造成无限等待。
- 配对备份恢复身份至少包含release SHA、API镜像digest、已应用migration、数据库/uploads绝对路径、大小和SHA；备份目录必须唯一并在创建前排除路径嵌套及并发写工具。
- PowerShell路径边界需同时拒绝“等于仓库根目录”和“位于仓库子目录”，只检查带分隔符前缀会漏掉前者。

## D1关闭与D2施工方案事实（2026-07-19）

- D1已拆为三个经审查的本地提交：`854ecf961356727df22e7654ac3073b4ffb66d1f`、`478655e206daf189a00e3894051b2115c83c1b3b`、`38247ff057310e0f98125a0bbcafbfab2969877c`；当前候选RELEASE_SHA为第三个提交，暂存区为空，工作树仅保留用户`CLAUDE.md`改动。
- 当前真实Prisma migration目录是3个，而D1 QA/计划曾写“4组migration”；镜像内容检查实际断言目录非空但未锁数量。D2方案及D1证据已订正为3个目录，执行时必须核对名称与候选SHA完全一致。
- `build-image.ps1`要求构建来源工作树干净且HEAD精确等于ReleaseSha，输出目录不得等于或位于该worktree内；因此D2采用仓库外`D2_ROOT/release` detached worktree和同级`artifacts`。
- Compose db不发布宿主端口，API端口可参数化；D2固定候选3108/3109并在执行前做空闲门禁。source/restore使用不同project、postgres、uploads、backup和env，且串行运行。
- API运行时env校验需要AI变量，但D2禁止真实AI；方案使用无真实权限占位key与`.invalid` base满足启动校验，同时禁止embedding/preflight/Search/Chat调用。
- D2初始化只在全新source隔离库执行migrate→seed-games→rebuild-tags→seed-demo。该流程验证编译脚本和文件补偿，但不运行embedding，因此不是07生产五步初始化的完成证据。
- 恢复目标不先运行migration：在空PostgreSQL实例中恢复custom dump和uploads，然后核对`_prisma_migrations`、Prisma readiness、seed计数与sentinel SHA，避免将重建流程和恢复流程混合。
- 资源采用串行预算：构建、source栈、restore栈不并行；主机至少4GiB可用内存/8GiB可用磁盘，D2_ROOT软上限4GiB。Compose单栈沿用db640MiB+API768MiB，一次只运行一个写工具。
- D2结束先down两个project并释放端口，但保留隔离证据供人工验收；删除worktree、数据、备份、env、archive和D2 image tag需独立本地清理授权，不执行全局Docker prune。
- fresh detached worktree离线`pnpm install`不会自动生成Prisma Client，且`production-start.spec.ts`要求`dist/src/main.js`已存在；因此后端基线的真实前置顺序必须是非敏感build-only URL下`prisma generate`→Nest build→Jest。首次Jest已按失败门禁停止，没有据此修改候选代码或自动重试。
- Prisma generate与Nest build完成后，fresh checkout的`ai.controller.spec.ts`仍会在模块加载时调用运行时env校验；现有测试命令还需要数据库、JWT、DeepSeek/OpenAI六类变量。D2只可在Jest单进程注入不可连接/无效占位值，不创建`.env`、不调用provider；这是测试命令非自包含的工程观察项，不在D2修改测试或package scripts。
- `TOKEN_SECRET`校验不仅要求长度，还拒绝`test`等常见弱占位词。D2测试进程不应人工拼接可预测占位字符串，应在同一进程启动前用密码学随机字节生成临时值且不输出；该值只满足启动校验，不写入文件或QA。

## D2 本地镜像与恢复实测事实（2026-07-19）

- 最终完整非敏感测试 env 复跑为后端 17 suites / 81 passed；前端 16 files / 53、build 2460 modules、Playwright 9 files / 51 passed，批准的 lint 基线无新增。
- 候选镜像 ID 为 `sha256:af0789ef7e7d81337aec69e52b8287ac0343a095457392acdf483f8a768e51d4`，archive 为 205705216 bytes，SHA-256 为 `e69cfb105c5146c283dfd8b128bbd97a6c43616edc518f9ef032bef71fecbf76`；镜像架构、非 root、入口、healthcheck、3 migrations、4 scripts、10 fixtures 和 secret 扫描均通过。
- source 初始化严格只运行 `migrate → seed-games → rebuild-tags → seed-demo`，未运行 embedding/AI；终态为 35 帖、13 评论、31 点赞、10 File、5 游戏各 7 帖、21 个媒体/哨兵文件，API 重建后保持。
- `backup-pair.sh` 依赖调用方提供正确的 Compose project 上下文。遗漏 `COMPOSE_PROJECT_NAME` 会检查错误的默认 project；D2 保留该次 `.incomplete` 失败证据，并在显式 source project 下成功生成一份新的完整备份。该执行观察不在 D2 修改候选脚本。
- 完整备份通过双 SHA、manifest、`pg_restore --list` 与 `tar -tzf`；restore 未预跑 migration/seed，直接恢复后数据库计数、migration、媒体相对路径/SHA、sentinel、3109媒体URL和HTTP内容均与source一致。
- 两个project已down，3108/3109无监听、无D2容器残留；D2_ROOT约1126969244 bytes并保留全部证据。release worktree干净且精确指向候选SHA，lockfile无差异，主工作树暂存区为空，`CLAUDE.md`哈希不变。

## D2关闭与D3施工方案事实（2026-07-19）

- 用户已人工确认D2技术链路、授权记录和候选SHA，D2正式关闭；worktree、镜像、archive、source/restore数据、完整备份和失败现场暂不清理。
- D3只建立Ubuntu宿主运行底座，不上传候选镜像、不启动业务Compose、不写数据库、不注入生产secret。设计确认、D2确认或ECS写入授权均不能替代每次SSH连接的S授权。
- SSH加固采用保留原会话、deploy第二会话、reload后第三会话的顺序；独立`00-black-box-hardening.conf`经`sshd -t/-T`通过才reload，不设置`AllowUsers`、不删除原云账号。
- `deploy`加入Ubuntu sudo组但不加入docker组；sudo本地密码由用户交互设置且agent不接触，SSH层继续禁用密码/交互认证。
- 2GiB swap先临时启用再写入fstab，并以`findmnt --verify`和独立重启门禁证明持久；任何reboot后重连仍重新申请S。
- Docker只使用官方Ubuntu APT仓库，不使用便利脚本；Nginx使用Ubuntu Jammy受支持包且D5前保持停止；Certbot采用官方推荐snap口径。
- Ubuntu22.04默认PostgreSQL客户端主版本不保证为16，而`pg_dump`不能dump更新主版本服务器；D3固定使用PGDG仓库的`postgresql-client-16`，不安装宿主PostgreSQL server。
- 目录权限固定：releases供deploy落地，compose/root配置、backups与`/etc/black-box`由root控制，uploads预置UID/GID10001，postgres目录延迟到D4按精确镜像实际UID/GID授权。
- UFW与阿里云安全组双层保持22仅可信`/32`，3389/3000/5432关闭；80/443拆为独立E授权。Docker端口绑定仍是首要边界，UFW不替代`127.0.0.1:3000`与5432不发布契约。
- SSH有效配置必须按root/deploy目标上下文分别使用`sshd -T -C user=...,host=...,addr=...`核对，普通`sshd -T`无法暴露`Match`块对特定用户/来源的覆盖。每个新会话和每种负向登录测试仍是独立S连接。
- D3.1同时核对公网IPv6分配、默认路由、`[::]`监听、UFW IPv6开关/规则及阿里云IPv6安全组。未独立批准时不得为SSH使用`::/0`；需要IPv6管理时仅允许可信来源`/128`。

## D3.1只读主机事实（2026-07-19）

- 用户按固定语句授予本次S权限后，通过本机Host alias建立一次SSH会话；输出在远端脱敏，连接结束后已关闭，未执行任何云端写入。
- 主机为Ubuntu 22.04 Jammy/x86_64、2 vCPU、约1.6GiB可见内存、40GiB根盘且约35GiB可用；cloud-init done、时间同步正常、failed units为0。
- 当前无Swap；Docker/Compose/Nginx/Certbot/PostgreSQL客户端均未安装。APT有2个hold和59个待升级包，hold包名须在D3.2写入前先只读核对。
- 监听仅见SSH及系统DNS/DHCP/chrony，没有3389/3000/5432。主机无全局/公网IPv6和IPv6默认路由；UFW配置允许IPv6但服务inactive、规则为0；sshd仍有IPv6 wildcard socket。
- D3.1加固前历史快照中，root/deploy各自的`sshd -T -C`结果一致且无Match/snippet；当时公钥开启、密码和keyboard-interactive关闭，但root登录、X11/TCP/agent forwarding仍允许。D3.2终态已将这些项关闭，该历史事实不得被表述为当前配置。
- 远端采集最后的service enabled/active小节因脚本末尾语法错误未执行；依照逐连接S门禁未自动重连。安全组、deploy账号存在性、APT hold包名、非默认账号与独立service状态作为显式未知项等待核对。
- 用户已在控制台确认22仅可信IPv4 `/32`，无3389/3000/5432/80/443和IPv6 SSH规则；公网IPv4 ICMP是已批准的临时诊断例外。planning只记录结论，不保存截图、地址或安全组敏感信息。
- D3.2加固目标新增明确值：`X11Forwarding no`、`AllowTcpForwarding no`、`AllowAgentForwarding no`。首批部署无转发用途；未来启用任一能力须独立安全评审。
- 下一次SSH只补采deploy账号及组、两个APT hold包名、Docker/Nginx/PostgreSQL相关service状态，并复核用户/监听/IPv6无漂移；补采S授权不能替代D3.2的E写入授权。

## D3.1补充只读结果（2026-07-19）

- 用户以新的固定S语句授权后完成补采；修正脚本正常结束，连接已关闭且无远端写入。
- deploy账号不存在；UID 0账号只有1个，无重复UID 0或UID≥1000的交互普通账号。
- 两个APT hold为`cloud-init`和`intel-microcode`；后续系统更新不得自动unhold，先报告APT计划。
- Docker service/socket、Nginx和PostgreSQL service均not-found/inactive；监听仍仅SSH和系统DNS/DHCP/chrony。
- 无全局/公网IPv6和IPv6默认路由，监听与IPv6相较主基线无漂移；D3.1未知项已闭合，进入D3.2仍需独立E与新的S授权。

## D3.2 SSH加固结果（2026-07-19）

- deploy账号/home/唯一既有公钥/sudo组按授权建立，用户独立注入sudo密码；第二和第三deploy会话分别经独立S授权验证key、home、组和sudo成功。
- 原配置有root私有备份与SHA manifest；独立snippet关闭root、密码、交互认证、X11、TCP及agent forwarding并保持公钥开启。
- reload前后`sshd -t`及root/deploy双上下文均通过；终态SSH active、snippet 0600/root、两个deploy会话存在，两个APT hold不变。
- 未实际执行任何负向登录，因为没有对应独立S授权；静态上下文证据已记录。未安装软件、配置Swap/UFW/安全组或进入D3.3。

## D3.3只读预检主体事实（2026-07-19）

- 关闭所有旧会话后，用户先以新deploy会话人工复验sudo；agent随后经独立S以deploy非特权采集，两个连接均已关闭。
- 当前无Swap和`/swapfile`，fstab仅根/EFI且验证通过；`vm.swappiness=0`并已有一条持久配置，与计划目标10冲突，需先定位来源并避免双值配置。
- chrony enabled/active且同步正常，timesyncd inactive；不切换时间服务。
- APT使用阿里云Ubuntu镜像，hold为cloud-init/intel-microcode。模拟升级为58升级、0新增、0删除、cloud-init kept back；包集合已有完整名称证据。
- 脚本在最后4个包逐项元数据及总体积/reboot汇总前结束，没有完成标记；按S门禁未自动重连，不猜测缺失值。当前等待一次紧凑只读补采，未执行系统写入。
- 第一次尾段补采确认唯一swappiness来源为`/etc/sysctl.d/99-apsara-sysctl.conf`的值0；该文件不是symlink。后续不能另加重复定义，应备份后定向修改唯一来源。
- 同次APT逻辑仍按58包逐个启动`apt-cache`/`dpkg-query`，在总体汇总前结束且无完成标记；连接已关闭。下一次采用一次批量查询，属于不同实现路径，不重复相同失败。

## D3.3只读预检闭环（2026-07-19）

- 第三次独立S授权连接改用单次批量查询并输出完成标记；58/58个候选包元数据完整，预计下载49,125,108 bytes（46.85MiB）、安装后磁盘变化约-6KiB，当前无reboot marker，候选集合无运行时kernel image/modules包。
- 根盘使用率9%、可用约34.1GiB；`cloud-init`与`intel-microcode`hold未变。OpenSSH、ca-certificates、tzdata属于服务敏感升级项，更新后必须保留原会话并以新的独立S验证新deploy会话。
- 唯一持久swappiness来源是`/etc/sysctl.d/99-apsara-sysctl.conf`；实施时定向把唯一值0改为10，不创建第二个`99-black-box-memory.conf`。
- 首次主体采集用`mktemp`创建并由trap删除了临时列表；没有持久文件或系统配置变化，但违反该次严格只读口径，作为非持久边界偏差保留，不将其描述为“全程零文件写入”。
- D3.3后续固定拆分为门禁A Swap写入和门禁B软件包更新。门禁A实施并人工验收前，门禁B不得授权或执行；任何`apt-get update`后的候选漂移都必须重新评审。

## SSH/DIRECT现行口径与Swap门禁A授权（2026-07-19）

- 用户将旧逐次S门禁替换为现行口径：TUN保持开启，后续统一通过已配置的`black-box-ecs` Host alias及已验证DIRECT规则连接，不再逐次请求S。
- 该变化只取消连接握手，不合并任何写入权限；ECS系统、数据库、AI、DNS、Vercel、计费和释放门禁仍分别授权。
- 用户已独立授权D3.3门禁A：创建并启用2GiB持久Swap；明确禁止本批APT更新/升级、软件安装、重启或D3.4。
- 用户覆盖了先前“修改唯一云厂商sysctl来源”的施工选择：`99-apsara-sysctl.conf`保持不变，项目以排序更后的`99-black-box-memory.conf`独立覆盖`vm.swappiness=10`，并验证最终加载值。
- `black-box-ecs` alias默认选择root而被`PermitRootLogin no`拒绝，证明D3.2 hardening正常生效；这不是产品或主机故障。用户批准后续命令统一显式deploy身份，SSH固定为`ssh -l deploy black-box-ecs`，不恢复root SSH。
## D3.3 门禁B首次实际升级尝试的停止根因

- 用户交互执行脚本在任何`apt-get upgrade`写入前输出`D3_APT_UPGRADE_COMPLETE=false`，原因是包名集合比较失败；证据目录为root私有路径，未在仓库记录其内容。
- agent随后只读重新采集：远端仍为已批准的58升级、0新增、0删除、1保留，hold、版本、下载量和无内核/引导候选均未漂移。
- 根因是比较器非对称排序：实际包名经`LC_ALL=C sort -u`，预期包名沿人工清单顺序直接写入。C序中连字符先于句点，导致`python3-distupgrade`、`python3-httplib2`、`python3-idna`与`python3.10*`产生6个纯顺序差异。
- 最小修正为预期包名同样经过`sort -u`后再`diff`；版本比较原本已双侧排序，无需改变。该问题不是APT候选漂移或主机故障。
- 按“失败立即停止、不自动重试”契约，修正后不自动再次执行upgrade；必须等待用户明确允许从当前未升级状态重新执行。

## D3.3关闭与D3.4安装前事实

- 用户确认D3.3人工验收通过。远端临时升级脚本删除前为`deploy:deploy`、0700、10,356 bytes，SHA-256与本地副本一致；同SHA副本敏感模式扫描0命中。按授权删除并验证路径不存在，本机SSH进程和已建立22端口连接均为0。
- Swap重启持久性没有在D3.3补做，继续留D3.6独立重启门禁。
- Docker官方Jammy仓库使用`docker.asc`+deb822 source，顶层五包为docker-ce/cli、containerd.io、buildx、compose plugin；安装后Docker默认自动启动。
- Nginx沿用Ubuntu仓库，仅装`nginx`；Ubuntu包默认启动并启用，D3.4安装后必须立即`disable --now`，80/443继续由安全组关闭。
- Certbot官方推荐snap，仅安装`certbot --classic`，本批不申请证书；PGDG Jammy/amd64只安装`postgresql-client-16`，不安装宿主server。
- 第三方仓库未写入前无法取得本机APT权威精确体积；采用1GiB软件+1GiB Docker初始数据的保守预算，未来E中添加source后必须先精确模拟并再次停点，不能把预算冒充实际值。
- D3.4补充只读包状态查询首次被PowerShell提前展开dpkg格式串而无有效输出；改用默认格式后连接被远端关闭。遵守DIRECT失败口径未自动重连、未改网络。D3.1已有目标软件未安装证据，安装前清单不依赖该补采。

## D3.4仓库与精确集合预检

- Docker/PGDG官方Jammy amd64仓库、独立keyring与APT update已按授权完成；fingerprint、权限、候选来源通过，未使用`apt-key`、便利脚本或pipe-to-shell。
- Docker精确集合为5个新包、0升级、0删除；`--no-install-recommends`确保rootless extras/pigz不进入集合。下载84.999MiB，安装占用337.140MiB。
- Ubuntu Nginx元包解析为9个新包、0升级、0删除；下载0.669MiB，安装占用2.293MiB。安装时会有服务启动副作用，未来E必须同批验证后立即disable/stop至D5。
- PG client 16解析为2新增、1升级、0删除；会将现有`libpq5`从Ubuntu 14.23升级至PGDG 18.4，净增9.914MiB；未引入`postgresql-16` server。该共享库升级需在实际安装授权中显式接受。
- snapd已经存在并active/enabled，运行时2.75.2；Certbot stable 5.7.0、77.1MB，因此不需要另装snapd，但Certbot snap本身仍等待E授权。
- 预检后目标包仍未安装，相关服务inactive，80/443/2375/2376/5432无监听，两个hold与无reboot marker不变，根盘可用约31.95GiB。
- 首次alias查询受本地受限执行环境影响无法解析；经批准在受限环境外执行同一只读命令后正常，不是ECS或DIRECT故障。一次远端循环聚合因跨shell引号失败、一次命令在本地JS解析前失败，均未写入；改用直接查询完成证据。

## D3.4实际安装终态

- 精确安装集合无漂移：Docker 29.6.2/containerd 2.2.6/Buildx 0.35.0/Compose 5.3.1，Ubuntu Nginx 1.18.0-6ubuntu14.16，PG client 16.14/client-common293/libpq5 18.4，Certbot5.7.0 revision5758。
- Docker/containerd active+enabled；deploy不在docker组且非sudo daemon访问失败。Docker操作继续使用sudo，不降低socket权限。
- Nginx安装后root配置测试通过并立即disable/stop，80/443无监听；D5前不提供Web入口。
- PG只安装client，psql/pg_dump/pg_restore均16.14，无server unit或5432监听；libpq5的已安装反向依赖为PG client与既有`libmailutils8`，二者`dpkg -V`均无异常，动态链接缓存正常。
- Certbot只安装snap工具，证书文件0，安装前后Nginx配置SHA一致；未申请证书、未运行renew。
- `dpkg --audit`与failed units为空，hold不变，无reboot marker；根盘使用率16%，2GiB Swap正常。D3.4待人工验收，不进入D3.5。

## D3.4关闭与D3.5只读预检

- 用户已确认D3.4人工验收通过。完整导出在仓库外保全，6/6导出文件、2/2配对文件和34/34归档文件SHA-256一致；40个文本文件secret扫描0命中。含原始网络输出的证据不进入Git工作树。
- 远端D3.4安装脚本、root临时证据、审计脚本及v1～v4临时导出目录已由root清理脚本逐项删除并返回完成标记；deploy只读复核home临时路径为空，正式Docker/PGDG source与keyring及Docker/Nginx/PG client软件仍在。
- D3.5只读基线：目标持久目录均缺失，UID/GID10001未占用；根盘16%且约33.70GB可用；Docker无容器/镜像、daemon配置缺失；Nginx既有logrotate有效；UFW inactive且空规则；无80/443/3000/3389/5432监听。
- Compose policy 7项通过，API固定宿主loopback、PostgreSQL无宿主端口。后续拆为“持久目录与Docker日志”和“UFW启用”两个独立E门禁，80/443继续关闭。

## D3.5门禁A实施终态

- 七个持久目录按批准矩阵创建；uploads使用数值`10001:10001`且宿主无对应名称，显示UNKNOWN属预期。postgres仍为`root:root 0700`，D4启动前必须按精确镜像复核。
- `/etc/docker/daemon.json`以同目录临时文件验证后原子rename，内容仅为`json-file`、`10m × 3`，SHA-256为`F2ED05C6F5934A15F12571139BDC225804F67B8C83561CC39868F7B2296D2697`。
- Docker/containerd active+enabled，Docker29.6.2、Buildx0.35.0、Compose5.3.1，容器/镜像为0；Nginx inactive+disabled且logrotate哈希不变；UFW仍inactive，监听仅22/53。
- 仓库外导出3/3、root证据12/12，16个文本secret/raw IPv4扫描均0。当前仅标门禁A已实施待人工验收，不进入UFW门禁B。
## 2026-07-20 Gate A 清理与 sudo 缓存机制施工事实

- Gate A 仓库外证据已经独立复核，远端可清理对象固定为 `/home/deploy/d3-persistence-log-gate-a.sh`、`/home/deploy/d3-gate-a-export.sh`、`/home/deploy/d3-gate-a-export-20260720T060742Z` 与 `/root/black-box-d3-gate-a-20260720T060742Z`，禁止模糊匹配其他路径。
- deploy 侧执行脚本 SHA 为 `f8a6f838...`，导出脚本 SHA 为 `b8c56075...`，导出归档与独立复核 SHA 分别为 `fa569d3f...`、`4fa79d62...`；与仓库外证据一致。
- sudo 缓存 drop-in 固定为 root:root 0440、76 bytes，仅含 `timestamp_type=global` 与 `timestamp_timeout=120`；不配置 `NOPASSWD`，不改主 sudoers、用户组、Docker 组或 SSH。
- 当前 sudo 非交互缓存不可用，因此首次 root 施工必须由用户在自己的 deploy 终端运行已审查脚本并输入密码；后续正/负缓存验证使用全新 SSH 会话完成。
- sudoers drop-in 在一次 sudo 命令运行过程中安装，不会追溯改变该次认证已创建的 timestamp 类型；因此配置写入后必须显式 `sudo -K` + `sudo -v`，再从全新 SSH 会话验证 `timestamp_type=global`。首次直接跨会话 `sudo -n` 失败是验证顺序证据，不表示 drop-in 已失效。
## 2026-07-20 Gate A 与 sudo 缓存终态

- Gate A已人工验收并完成远端临时现场清理；正式持久目录、Docker daemon配置、软件、日志及仓库外证据均保留。
- `timestamp_type=global`只改变sudo timestamp作用域，不改变deploy原有授权，也不构成`NOPASSWD`。正向跨会话验证和`sudo -K`后负向验证共同证明机制按预期工作。
- 密码仅由用户在交互终端输入；agent未读取、索取、记录或通过stdin/环境变量传递密码。后续每个系统写入仍需独立E授权。
## 2026-07-20 UFW Gate B 内存规则接缝

- UFW CLI只能通过argv接收source CIDR，不满足本批“真实地址不进入命令行参数”的严格口径；改用系统已安装的`ufw.frontend`，由固定helper从stdin读取CIDR、复用parser/backend与`/run/ufw.lock`，避免地址落入argv或脚本。
- 直接使用frontend必须先执行与`/usr/sbin/ufw`相同的`gettext.install(ufw.common.programName)`；缺失时parser错误路径会因builtins `_`不存在而失败。TEST-NET只读parse RED/GREEN已证明该前置。
- Gate B只在当前inactive/空规则、默认策略已是目标、Docker容器0时施工；失败回滚固定禁用UFW并从root证据恢复四个pre-state配置文件，不放宽SSH来源。
## 2026-07-20 UFW Gate B 实施终态

- UFW已从inactive/空规则切换为active，默认deny-in/allow-out/deny-routed；唯一user rule为可信管理IPv4 `/32`到22/tcp，未增加IPv6 SSH或80/443/3000/3389/5432规则。
- 原会话保持到第二个新deploy会话完成key、sudo、UFW、Docker和端口验证；防锁死链路成立，未触发回滚。
- 脱敏证据不含真实IPv4或secret；实际管理地址只存在于服务器UFW规则。安全组和Compose绑定均未变。
## 2026-07-20 D3.6重启前终态

- Gate B远端临时现场已精确清理，仓库外证据保留；UFW正式规则与其他系统配置不受清理影响。
- 文件集合比较必须固定`LC_ALL=C`，否则locale会改变`user.rules`与`user6.rules`的排序并产生假漂移；首次失败发生在删除前。
- 重启前所有技术条件成立。`findmnt --verify`的唯一warning是swapfile作为普通文件，非解析或挂载错误；重启后仍必须实际确认自动swapon与swappiness。
- 预检通过不等于reboot授权；重启仍是独立E门禁，失败时不得顺手进入D4或放宽SSH/UFW。
- D3.6 marker前失败的真实根因是监听断言把混合TCP/UDP端口强制等于22/53；只读诊断确认额外UDP 68属于systemd-networkd DHCP客户端，UDP 323属于chronyd且仅回环绑定，和D3.1“DNS/DHCP/chrony为系统服务”的基线一致。门禁已改为TCP 22/53；UDP 53/68/323并核对进程与chrony绑定范围，不关闭必要系统服务。
- D3.6单次重启已真实完成：boot ID变化，首次恢复uptime 19.02秒；Swap、Docker、UFW、SSH hardening、时间、目录、监听和资源均通过重启后验证。配对归档远端/本地SHA一致，tar与4/4内部manifest通过，证据raw IPv4/secret模式0命中。该条记录的是实施完成时的历史门禁；随后用户已人工验收并完成D3收尾。

## 2026-07-20 D3 收尾事实

- D3.6 已由用户人工验收通过。远端登记临时脚本、marker、deploy 侧归档及已下载的 root 临时证据目录均在删除前完成 SHA/文件集合/manifest 复核，并以逐文件删除加空目录 `rmdir` 的方式关闭；三条未落盘的传输路径保持不存在。
- 仓库外归档是关闭远端临时证据的前提：最终重启配对归档 SHA 为 `47AB8EFD...A848C`，旧预检归档 SHA 为 `472DE33F...116B`；两者均未放入工作树。
- 正式 SSH、Swap、Docker daemon、UFW、sudoers、七个持久目录与系统配置备份均不属于临时清理对象，收尾后复核无漂移。
- `sudo -K` 的 timestamp 清理与调用用户有关：在 `sudo bash` 的 root 上下文执行不会清除 deploy 的 global timestamp；必须由 deploy shell 直接执行 `sudo -K`，再从新会话验证 `sudo -n` 失败。

## 2026-07-20 D4 施工方案事实

- D1真实Compose已有7个职责隔离服务：常驻db/api及tools profile中的migrate、games、tags、demo、embedding、AI preflight；一次性服务不会随`up`运行，D4无需新增或修改部署文件。
- D2保留候选镜像固定为`RELEASE_SHA=38247ff...`、image ID=`af0789ef...`、archive 205705216 bytes/SHA=`e69cfb10...`；D4必须复用该制品并从同一Git SHA生成非敏感deployment bundle，不能从当前脏工作树复制。
- PostgreSQL宿主目录在D3保持`root:root 0700`是有意停点；D4拉取精确16.14 amd64镜像后必须实测容器postgres数值UID/GID，且只在目录仍为空时授权收敛权限。
- 生产五步固定为migration→games→tags→demo→embedding。AI preflight是第五步前的独立AI合规/维度门禁，不改变五步业务顺序。
- D4恢复点采用B0空库、B1 post-migration、B2 pre-demo、B3 final配对层级；restore永远是独立DB/R授权，不嵌入失败处理自动执行。
- 2GiB主机不构建镜像，写工具与API串行；D4每步记录内存、Swap、磁盘、容器退出和监听，出现OOM/137、持续Swap、磁盘越线或并发写工具即停止。

## 2026-07-21 D4.0执行边界

- D4方案已确认，但本批只允许本地同SHA制品闭环、从Git对象生成非敏感deployment bundle及ECS只读基线；不存在由方案确认推导出的D4.1写入授权。
- image archive、build manifest或主机状态任一不满足唯一性、固定SHA、身份或资源阈值时，D4.0直接阻断，不补造制品、不重构建、不自动修复主机。
- 本地制品门禁已由archive自身元数据与Git对象闭环，不依赖本机Docker导入；ECS连接在认证前关闭属于主机门禁未完成，不得用D3历史快照代替新鲜核验，也不改变已通过的本地制品结论。
- 单次恢复诊断证明Host alias的安全参数解析正确且TCP22可达，但SSH仍在认证完成前关闭；当前不能把原因归结为端口、UFW或应用状态，也不具备修改DIRECT/sshd/安全组/密钥的证据。后续必须先由用户从本机或云控制台核对认证阶段日志，再决定新的独立核验动作。
- Workbench按失败时间对齐后确认内核连续`UFW BLOCK` TCP/22；sshd、公钥认证契约、authorized_keys权限、MaxStartups、conntrack和资源证据均无异常。根因是当前SSH流量来源未命中既有管理`/32`允许规则，阻断发生在sshd之前；修复UFW仍需独立E授权和Workbench防锁死通道，不能由D4.0只读授权推导。

## 2026-07-21 D4.0 管理链路修复与关闭

- 上述TCP22/UFW结论保留为修复前历史快照。经独立授权，ECS管理SSH迁移到TCP2222；本机受控alias固定deploy身份和该端口，公钥登录实测通过。
- 客户端ECS规则只能指向代理策略组，不能锁定组内具体节点。该限制已接受；部署期间保持当前节点不变，出口变化立即停，不自动放宽来源。
- UFW和安全组仅允许批准代理出口IPv4 `/32`到2222；公网22、80、443、3000、3389、5432仍关闭。sshd内部监听22不构成公网暴露。
- 修复后主机只读复核通过：Docker/containerd正常，Nginx停止，业务容器/镜像0，目录为空且权限正确，资源门禁通过，无异常监听或failed unit。D4.0正式关闭。

## 2026-07-21 旧候选 Shell CRLF 根因

- 旧SHA三份Shell Git blob为LF；D2 detached worktree与D4 bundle均为纯CRLF，且后两层逐文件SHA一致。
- 旧树没有`.gitattributes`，生成主机系统级`core.autocrlf=true`。D2 detached worktree在checkout时转为CRLF；D4实际bundle不经过该worktree，而是直接`git archive --format=tar.gz --output=<part> <SHA> deploy/production`后原子rename。该直接archive稳定得到与实际bundle完全相同的大小、SHA和CRLF；关闭autocrlf的控制组则与blob完全一致为LF。根因是attributes缺失时两条独立Git文本导出路径都服从本机转换配置，不是tar/SFTP/ECS。
- 发布源修正固定为`*.sh text eol=lf`并增加自动化LF契约。旧候选正式失效；禁止ECS现场转码、忽略Bash失败或复用旧镜像/远端staging。

## 2026-07-21 发布源 LF 契约验证终态

- `.gitattributes`固定`*.sh text eol=lf`；自动化测试同时检查磁盘字节中CRLF/bare CR为0及Git attributes解析结果，覆盖当前3个生产Shell。
- 当前Shell Git内容本来就是LF，因此修正不改脚本业务字节；变化仅为attributes与契约测试。RED证明旧树attributes未指定，GREEN证明新契约生效。
- 强化后的契约测试直接从当前精确暂存Git tree执行正式`git archive`路径，解包后比较Git blob与bundle逐文件SHA，并检查attributes、CRLF与bare CR；不再只检查当前工作树。
- 当前暂存树还不是commit，不能命名为新候选。提交授权后必须从新SHA重新执行干净worktree、镜像、bundle、manifest与D1/D2同SHA证据链。

## 2026-07-21 LF修正提交与重建边界

- 新候选固定为`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`；只从仓库外全新detached worktree构建。
- 新source/restore必须使用全新project、端口和bind mount，旧D2现场只保留审计，不能作为输入。
- 用户已授权本地Docker构建、隔离migration/非AI seed、配对备份与恢复；禁止任何ECS连接、AI/embedding/Search/Chat及旧现场清理。

- 用户授权的两文件提交已创建：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`；commit不含`CLAUDE.md`或其他工作树内容，提交后暂存区为空。
- 从该commit运行强化LF测试通过，证明直接`git archive`中的3个Shell与Git blob逐字节一致；这只关闭发布源缺口，不替代镜像、Compose、数据库、备份恢复和D4.0制品验收。
- D1发布门禁、D2.0～D2.5及D4.0本地制品必须从新SHA完整重建。旧ECS release/staging保留并按SHA/nonce隔离，清理仍是独立E授权。

## 2026-07-21 R1本地命令兼容性停止点

- 当前Windows PowerShell/.NET不提供静态`RandomNumberGenerator.GetBytes(int)`；该调用在Jest启动前失败，使`TOKEN_SECRET`为空并触发导入期env校验。
- 兼容替代是使用`RandomNumberGenerator.Create()`实例填充预分配byte数组，再转为十六进制；值只存在于单个测试进程，不输出、不落盘。
- 本轮有“失败即停、不自动重跑”约束，因此只登记修正路径，未执行第二次Jest。该停止点不是候选业务断言失败。
- 继续授权后的实测补充：实例式`RandomNumberGenerator.Create().GetBytes(byte[])`可用，但`Convert.ToHexString(byte[])`同样不受当前PowerShell/.NET支持。下次唯一兼容路径应为`-join ($bytes | ForEach-Object { $_.ToString('x2') })`，不依赖新.NET静态便利API。
- 镜像中的`/app/prisma/migrations`包含3个migration目录以及合法同级文件`migration_lock.toml`；目录数量审计必须读取Dirent并只统计`isDirectory()`，不能直接使用全部条目长度。
- Prisma模型`Post.titleEmbedding`在PostgreSQL中的真实物理列名是`posts.title_embedding`；直接SQL审计必须以migration/schema映射为准并启用`psql -v ON_ERROR_STOP=1`，不能使用TypeScript字段名。

## 2026-07-21 新候选R3/R4终态

- source固定为35帖子、13评论、31点赞、10文件、5游戏、5标签、0 embedding、3 migration，5个游戏各7篇；migration与三个非AI初始化工具均未重复执行。
- 配对备份的dump/uploads归档、内部SHA与manifest通过；restore未预跑migration/seed，恢复后数据库计数、migration、21个媒体文件及sentinel逐SHA一致。
- source/restore媒体清单整体SHA差异来自排序与LF/CRLF序列化；逻辑集合相同，按source清单逐文件核对为0 mismatch，不能误报为恢复失败。
- 新bundle直接来自Git object，19文件、3 Shell全LF、0 symlink；LF `SHA256SUMS`在无网络Linux容器中3/3通过。新候选本地链当前仅待人工验收，不授权ECS或D4.1。

- 用户已人工验收通过新候选R0～R4本地制品链；该结论仅关闭本地重建，不推导D4.1写入授权。下一门禁是ECS新鲜只读基线，成功后仍须等待独立E授权。

- D4.1前ECS新鲜只读门禁已通过：当前连接来源与UFW唯一批准`/32`匹配；主机服务、资源、目录和旧现场无漂移，新SHA目标路径不存在。约2GiB Swap实际报告比整数2GiB少一个4KiB页，验收阈值应按页级容差判断，不能误报主机资源失败。

## 2026-07-21 新候选 D4.1 tar 审计口径停止点

- 新SHA release目录创建成功；四项受控制品在唯一一次SFTP会话中写入各自唯一`.part`，固定大小与SHA全部通过后才原子rename。transfer manifest仅作本地溯源证据，未上传且不计入`SHA256SUMS`载荷。
- 远端直接执行原始LF `SHA256SUMS`，API archive、build manifest和deployment bundle三项均为`OK`；没有使用`sed`、现场转码、重新上传或重新构建。
- bundle展开前的临时Python审计因`tarfile`将目录成员规范化为`deploy`与`deploy/production`（移除tar列表展示的尾斜杠），而断言仅允许带尾斜杠形式，触发非零退出。相同固定bundle的本地只读检查仍为23项、19文件、4目录、0 symlink，故这是审计工具口径错误，不是制品集合或哈希失败。
- 失败发生在`install -d`创建新staging之前；未展开bundle、未落地新compose目录、未执行`docker load`或PostgreSQL pull。按失败即停契约未自动重试，等待用户人工确认恢复方式。

## 2026-07-21 新候选 D4.1 Compose 审计命令停止点

- 用户确认修正目录名规范化口径后，远端tar成员数量、类型、顶层边界、绝对路径、`..`与symlink检查通过；bundle随后展开到唯一root staging。
- 临时命令使用`docker compose --no-interpolate --no-env-resolution -f ... config --quiet`，但`--no-interpolate`和`--no-env-resolution`属于`config`子命令参数，应位于`config`之后。远端CLI因此在读取Compose文件前返回`unknown flag: --no-interpolate`。
- 这是审计命令参数位置错误，不是Compose YAML或候选制品失败。按失败即停未重跑；staging保留，正式compose路径仍不存在，API archive未导入，PostgreSQL未拉取。

## 2026-07-21 新候选 D4.1 自动门禁终态

- 用户授权本批后续连续执行。只从保留staging恢复，将Compose解析参数移到`config`子命令后；Compose、4个PowerShell文件字节身份、安全扫描和owner/mode均通过，随后staging原子rename为新SHA正式compose目录。
- API archive在`docker load`前再次通过固定SHA；导入后的image ID、linux/amd64、`10001:10001`、`/app`、生产入口、healthcheck、OCI revision、Node基础镜像digest均与新候选证据一致。
- 镜像内审计确认3个第一层migration目录、独立`migration_lock.toml`、4个初始化脚本和10个fixtures；临时检查容器使用`--network none`且退出后容器为0，history敏感值扫描0命中。
- PostgreSQL仅单次拉取Compose固定index digest；linux/amd64选中manifest与批准值一致，未启动数据库容器。
- 终态为4个release文件、19个compose文件、0 symlink、2个镜像、0容器；旧SHA release仍为4项且未触碰。Docker/containerd active+enabled，Nginx inactive+disabled，禁止端口监听0，failed units 0，资源仍高于D4阈值。
- deploy sudo缓存已清除，本机SSH/SCP/SFTP进程0。D4.1当前只待人工验收，不推导D4.2、secret、Compose、数据库/uploads或AI授权。

## 2026-07-22 D4.1关闭与生产embedding决议

- 用户人工验收通过D4.1；新候选制品、compose目录、API镜像与PostgreSQL固定digest成为D4.2配置前置，不推导D4.3或数据库写入授权。
- 用户明确接受帖子标题和搜索关键词交由302.AI处理；生产embedding固定为该供应商的OpenAI-compatible API、`text-embedding-3-small`、1536维。禁止OpenAI官方直连、回退或自动切换模型/供应商。
- 候选代码中LangChain客户端以`OPENAI_BASE_URL`作为base并追加embedding资源路径；AI preflight明确追加`/embeddings`。供应商兼容契约的完整资源路径含版本段，因此受控base必须止于版本段，不能重复或遗漏。
- 真实endpoint、生产域名、key及账号信息仅进入ECS受控env；Git文档和QA只记录变量名、角色与PASS/FAIL。
## 2026-07-22 D4.2 首次传输失败事实

- 一次性交互脚本本地固定 SHA-256 为 `dc723f47a0852b6cf9d6ab329d2a10c953c2fc677d3fea45daf56f60156e6674`，大小 4963 bytes，`bash -n` 通过且 CRLF 计数为 0；该哈希仅用于核对脚本身份，不包含或推导 secret。
- PowerShell 将 Base64 文本通过原生进程管道送入远端 `base64 -d` 时出现 `invalid input`；同一管道在本地解码也失败，证明故障位于本地管道编码边界。后续不得复用该传输方式。
- 失败发生在正式路径 rename 之前，未进入交互式 key 输入或 env 原子安装；安全恢复必须先保持失败证据，再使用新的唯一目标路径和已验证的二进制安全传输方式，且继续遵守失败即停。

## 2026-07-22 D4.2 最终技术事实

- 隐藏输入在当前Workbench终端连续出现确认不一致；最终采用`root:root 0600`可见临时编辑文件，由用户本人校对，agent不读取。成功注入后临时输入文件被精确删除。
- 七个env文件权限、精确变量集合、格式、模型、超时、JWT强度及跨文件一致性全部PASS；Compose解析得到8服务，7项最小权限策略全部PASS，未展开或输出secret。
- 固定PostgreSQL镜像以无网络、无挂载、自动删除容器实测UID/GID为`999:999`；数据目录在确认完全为空后收敛为`999:999 0700`并保持为空。
- D4.2未启动Compose、API或数据库，未执行migration/seed/AI/embedding；容器0、3000/5432监听0、failed units 0。技术门禁完成，但已在聊天中出现过的key必须由用户确认已轮换，才能人工关闭本批。
- 用户随后明确确认最终注入的是供应商侧已轮换的新key；该确认只关闭D4.2 secret安全门禁，不授权真实AI调用或任何D4.3写入。

## 2026-07-22 D4.3 DB-0技术事实

- 候选自带`backup-pair.sh`要求至少一条已完成Prisma migration，不能用于正确的pre-migration B0；D4.3使用独立门禁脚本生成`migrationState=not-applied`、`migrations=[]`的空库恢复点，未修改候选脚本。
- 固定PostgreSQL 16.14镜像仅启动db一次；容器用户/PID1为`999:999`，bind mount、health和四项内存参数通过，宿主未发布5432。
- `_prisma_migrations`不存在且public业务表为0，证明没有越权执行migration。B0 custom dump、空uploads归档、manifest和内部SHA均独立验证通过。
- 终态只有db healthy；API/tools为0，OOM=false、restart count=0、异常日志0、failed units 0，资源无压力。DB-1 migration仍是独立门禁。

## 2026-07-22 D4.3人工验收与D4.4授权

- 用户人工验收通过D4.3 DB-0，B0成为本次全新生产库migration前的受控恢复点。
- D4.4 DB-1仅授权一次`prisma migrate deploy`、B1 post-migration配对恢复点及短暂loopback API liveness/真实Prisma空分页验证。
- 本授权不包含games、tags、demo、AI preflight、embedding、cleanup、Nginx、证书、DNS、Vercel或公网端口变更。

## 2026-07-22 D4.4 DB-1技术终态与阻塞

- 唯一一次`prisma migrate deploy`退出0；三条migration完成、failed/rolled-back为0，10个public表存在，九个业务表数据仍为空。
- B1 custom dump、空uploads、manifest、绝对路径/大小/SHA和三条migration全部通过；loopback API liveness、真实Prisma空分页与`verify-stack.sh base`通过。
- API在默认停止窗口和独立60秒停止复验中均最终exit 137，OOM=false、restart=0；证明是SIGTERM未完成退出后被SIGKILL，不是内存压力。D4.4必须阻塞，不得以放宽退出码或增加无限停止时间掩盖。
- 候选`backup-pair.sh`部署后路径推导会把批准backup目录误判为仓库内部，本批用一次性门禁生成B1；该工具问题与优雅停机应在新候选中一并按独立计划修复并重建证据。

## 2026-07-23 D4.4修复关闭终态

- 08生产发布修复批次以`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`关闭旧候选SIGTERM 137与backup安装路径误判，并获用户最终人工验收。
- 08批次关闭时生产FIX API与原db healthy；三条migration保持D4.4唯一执行结果，九张业务表为空，DB-2未执行。该项是D4.5-A2之前的历史快照。
- B0、B1与“F6 release / pre-DB2”恢复点有效；旧镜像/release、F4/F5现场及失败证据保留。
- 08收口后的下一门禁曾为D4.5 DB-2 `seed-games`施工方案/独立数据库写入授权；该历史门禁不允许重跑migration或自动进入后续tags/demo/embedding。

## 2026-07-23 D4.5-A seed-games调研

- FIX源码真实入口为`node dist/src/scripts/seed-games.js`；Compose tool只接database env与内部db网络，无uploads挂载和外网。
- `Game.name`是唯一键。脚本顺序upsert五个固定游戏，update只写description、不覆盖cover；脚本无外层事务，失败可留下前缀写入。
- 执行前九张业务表应全空；成功后仅games为5，其余八张业务表仍为0，migration与uploads不变。
- 仓库外pre-DB2副本四项大小/SHA重新匹配，dump与tar可读。ECS alias普通只读连接通过，但`sudo -n`失败，完整生产只读预检未开始。
- 用户建立sudo缓存后，完整只读门禁通过：FIX API与原db均healthy且是仅有两个容器；3条migration全部finished，九张业务表均为0；远端pre-DB2与本地副本一致；uploads为0文件；资源、failed units和无写工具满足门禁。
- 首轮SQL因`docker exec`未带`-i`而未收到heredoc，只补采一次带stdin的只读事务取得计数；没有执行SQL写入或重复其他生产门禁。
- 用户人工确认D4.5-A1通过并独立授权D4.5-A2执行DB-2；编号订正后D4.5-B继续专指DB-3 `rebuild-tags`。
- D4.5-A2只调用一次受审Compose `seed-games`命令。由于编排脚本通过SSH stdin运行，`docker compose run`消费了后续stdin，外层未打印计划中的seed退出变量和stdout；按禁止重跑约束没有第二次调用。
- Docker events提供唯一one-off的create/attach/start/die/destroy链，die `exitCode=0`且容器已销毁。只读库结果为5个批准游戏、名称唯一、cover全空；其余8张业务表为0，3条migration、uploads均未变化。
- D4.5-A2终态为API停止、原db running+healthy、无运行中one-off、受保护端口未暴露；D4.5-B / DB-3未执行。

## 2026-07-23 D4.5-B rebuild-tags调研

- FIX脚本按PostTag deleteMany→Tag deleteMany→Tag createMany顺序写入资讯、攻略、求助、评测、活动，无外层transaction；生产失败不得因`skipDuplicates`或“幂等”注释自动重跑。
- 完整只读预检最终退出0：原db身份与health不变、API停止、运行中仅db；3 migration、5个批准游戏、Post/PostTag/Tag=0、其他业务表和uploads为空；pre-DB2远端与本地副本可读。
- 当前没有post-DB2/pre-DB3恢复点。DB-3失败若获恢复授权，只能使用pre-DB2配对恢复点，连同5个Game一起回退，再重新执行和验收DB-2。
- B2是DB-3人工验收后的独立pre-demo配对恢复点，须由修复版backup工具创建database+uploads并下载仓库外副本；不与DB-3写命令合并。
- DB-3受审Compose命令只执行1次，退出码0，stdout返回资讯/攻略/求助/评测/活动。Docker events证明单一one-off按create/attach/start/die(exitCode=0)/destroy结束。
- 写后只读矩阵确认Tag=5且集合/唯一性准确，PostTag和其余非目标业务表仍为0；5 Game、3 migration、空uploads和pre-DB2恢复点均未漂移。API停止、原db healthy，无tool残留。
- Docker events首次只读查询使用不兼容的`.ID`模板字段失败；改用Docker 29真实字段`.Actor.ID`查询相同固定历史窗口后通过。该错误没有触发数据库或容器写入。
- B2与seed-demo仍未执行；DB-3当前停在用户人工验收门禁。
- 用户人工验收通过DB-3并授权B2后，唯一外层备份门禁脚本因readonly变量与同名临时环境赋值冲突退出1。FIX `backup-pair.sh`未取得绝对`BACKUP_ROOT`，在目录创建、API stop和dump之前退出；该失败不是数据库或FIX备份工具错误。
- B2没有生成complete、`.incomplete`、远端导出或本地副本。按失败即停约束未修正、未重跑、未下载；seed-demo及其他后续步骤未执行。
- 获授权恢复后，使用`/usr/bin/env`向子进程传递同名变量解决readonly冲突，FIX备份脚本不变。远端B2最终完整形成且无`.incomplete`，四项SHA、归档、manifest、权限和数据快照均通过。
- 恢复脚本SSH调用虽在本地300秒上限超时，但只读现场证明进程已结束且远端备份成功；没有因此重跑备份。
- 唯一默认SFTP下载在本地超时后原SFTP/SSH进程最终自行退出，本地只留下0字节dump。按禁止重试约束未建立第二次传输、未切legacy SCP、未删除现场；远端正式B2与导出保留。
- retry1要求先清除sudo timestamp，但唯一SSH会话在本地30秒上限处超时，无完成标记；原SSH子进程约73秒后自行退出。无法证明sudo缓存清除状态，且按再次超时即停未执行远端复核、retry1目录创建或SFTP。

## 2026-07-23 B2本地副本retry2暂停

- 再次获授权后，第一条远端命令因PowerShell引号转义错误被远端shell在执行前拒绝；没有形成sudo状态证据。改用无歧义单引号命令后，`sudo -K`退出0、后续`sudo -n true`退出1，遗留全局timestamp已明确清除。
- 紧接着对固定远端B2目录的四项文件执行只读存在性、大小和SHA复核；该唯一会话非零退出且没有输出任何元数据。D3证据确认backup根目录为`root:root 0700`，清除sudo后deploy无法遍历是与现象一致的原因，但不构成本次远端复核证据。按失败即停未创建retry目录、未发起SFTP、未重跑备份或进入seed-demo。

## 2026-07-23 B2本地副本retry3暂停

- 用户重新建立全局sudo缓存后，`sudo -n true`退出0。唯一受控导出命令在首个正式B2文件的SHA输出解析处因`cut`分隔符参数错误退出1。
- 按命令顺序，失败早于`install -d`，所以没有创建远端deploy导出目录或复制文件；未清除本次sudo缓存，未创建本地retry1目录、未发起SFTP，也未重跑备份或进入seed-demo。

## 2026-07-23 B2本地副本retry4暂停

- 再次确认`sudo -n true`退出0后，去除`cut`的修正版已完成首个正式B2文件的大小/SHA断言，但`printf`格式串中的竖线被远端shell解释为管道，命令退出1。
- 失败仍早于`install -d`；没有创建远端导出或本地retry1，没有SFTP、sudo清除、备份重跑或seed-demo。

## 2026-07-23 B2本地副本retry5暂停

- 按用户要求将远端动作拆为独立简单命令。前三项正式B2文件的存在性、大小、SHA全部匹配，`SHA256SUMS`存在性通过。
- `SHA256SUMS`的独立`stat -c %s`命令在本地64秒上限超时；未创建导出、复制或下载。安全收尾`sudo -K`退出0，负向`sudo -n true`退出1，timestamp已清除。

## 2026-07-23 B2本地副本retry6完成

- 受控自主执行使用固定源/目标和预期值的一次性Bash脚本；本地语法、LF、SHA和敏感扫描通过。正式B2四项与deploy导出逐项大小/SHA一致，导出目录/文件为`deploy:deploy 0700/0600`。
- 默认SFTP唯一会话首次成功，下载到仓库外全新retry1目录。四项外部SHA和内部`SHA256SUMS`通过，`pg_restore --list`为98行，tar仅含`./`，manifest确认FIX SHA、3 migrations、5 Game、5 Tag及空业务/uploads。
- sudo缓存已清除并负向验证；API 3000无监听。本批未操作容器/数据库，db保持批前healthy基线；seed-demo未执行。远端deploy导出保留待人工验收后独立清理。

## 2026-07-23 B2关闭与DB-4事实

- 用户已人工验收通过B2。正式B2与仓库外本地retry1副本是DB-4唯一批准的pre-demo配对恢复点；历史失败目录保留，deploy导出仅可按四个固定文件精确清理。
- FIX `seed-demo`真实入口为`node dist/src/scripts/seed-demo-posts.js`。它先生成/复用10原图+10缩略图并记录本次新建路径，再用单个Prisma transaction写入5作者、35帖子、35 PostTag、13评论、31点赞和10 File；数据库事务不覆盖文件，失败只补偿本次新建路径，补偿失败必须非零并列出残留。
- Manifest只按作者+标题及fixture originalname定向替换批准演示数据，不清理非manifest内容。生产pre-demo若出现非manifest业务数据，门禁直接停止，不借脚本定向语义隐式接纳漂移。
- DB-4生产只读预检已通过：migration 3/3、Game 5、Tag 5，其他业务表和embedding为0；API停止、仅原db healthy、uploads为空。FIX镜像内三个seed模块和10 fixtures的固定大小/SHA匹配，审计容器无网络且全部`--rm`。
- DB-4正式seed-demo仅调用1次并退出0；事件链证明唯一one-off完整销毁。写后精确矩阵为5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、20媒体/404899 bytes和0 embedding；B2、3 migration、5 Game、5 Tag不变。

## 2026-07-23 DB-4关闭与AI-1事实

- 用户已人工验收通过DB-4；API保持停止、原db healthy，B2有效。该验收没有授权B3、AI或embedding。
- `ai-preflight`只读取8项preflight env并仅加入egress网络；没有DATABASE_URL、JWT、demo密码、uploads或db网络。正式入口是`node /opt/black-box-tools/ai-preflight.mjs`。
- 脚本按顺序最多执行一次DeepSeek流式请求和一次302.AI embedding请求；无自动重试。deadline覆盖fetch与完整text/json消费；输出只包含耗时、完成状态、1536维和有限值检查。
- 本地mock 8/8与Compose最小权限7项通过。ECS普通SSH及通用DNS/TLS通过；资源高于门禁且failed units为0。sudo timestamp已清除，因此root-only env、Docker、数据库、uploads和B2生产证据仍待补采，真实AI调用为0。
- sudo缓存建立后的首次完整脚本在Compose原始SHA处停止。远端Compose与AI脚本分别比LF Git blob多148/167个CR字节；只读去CR后SHA精确匹配FIX blob，属于已安装非Shell文本的CRLF表示差异而非内容漂移。身份门禁改为同时锁定原始部署SHA与规范化Git身份，不修改远端文件。
- 最终无费用预检已通过全部生产门禁：env精确8项、DeepSeek/302角色与固定模型/超时、Compose最小权限、API停止/仅db healthy、DB-4矩阵、20媒体、远端和本地B2及资源均不变。通用DNS/TLS通过但未请求供应商业务接口，真实AI调用0。
- 唯一正式AI-1命令exit 0：DeepSeek流完整并耗时1578ms；302.AI embedding耗时591ms、1536维且全部有限。Docker事件只有一个preflight one-off的create/attach/start/die(0)/destroy；无第二次调用、OOM、137、restart或残留。
- 正式调用后DB-4数据库、20媒体、远端/本地B2、API停止与db healthy均不变；title embedding仍为0。AI-1成功不授权35帖backfill。

## 2026-07-23 AI-1关闭与D4.7-B事实

- 用户已人工验收通过AI-1。唯一正式preflight仍为DeepSeek与302.AI各1次，未计入35帖backfill。

## 2026-07-23 D4.7-B安全阻塞与09批次

- 无费用预检确认生产35条embedding均为null、非null为0，DB-4数据、20媒体、B2、API停止和db healthy均未漂移；没有创建backfill one-off或调用供应商。
- 当前候选backfill只依赖SDK fetch timeout，无法覆盖headers后的body读取；同时直接把未验证结果写入Prisma。运行时发帖路径虽有完整Promise timeout，也缺共享1536维有限数校验。
- 当前候选禁止backfill，D4、B3与后续动作暂停。独立09批次负责共享安全契约、TDD、新SHA、linux/amd64制品、隔离restore和ECS零写入门禁；不在ECS热修。
- `backfill-embeddings.ts`默认先查询全部帖子再在JS中过滤`titleEmbedding == null`；当前生产精确35条null、0条非null。普通`for...of`逐帖串行，成功后立即单条update；失败继续且最终非零。
- LangChain caller和OpenAI SDK均通过`maxRetries: 0`关闭自动重试，但OpenAI SDK 6.17.0在fetch返回响应头后清除timeout，当前脚本没有独立完整body deadline。
- 当前脚本未在Prisma update前验证数组、1536维和全部有限数。该缺口会允许错误向量进入JSON字段并让命令误报成功，是正式DB-5 + AI-2的阻塞项。
- 只读预检确认35标题共722字符、2070 UTF-8 bytes、单条17～26字符；按181～2070 tokens保守区间和公开`$0.02/1M input tokens`费率，模型输入费约`$0.00000362～$0.00004140`，最多35请求。
- Compose仅注入database 2项+embedding 4项，网络仅db_net+egress_net，无runtime/JWT/seed/ai-preflight/uploads/端口/mount。API停止、仅原db healthy，无one-off。
- DB-4分布、20媒体、B2及资源均无漂移；供应商请求0、embedding one-off创建0。首次分布SQL误用snake_case列名而解析失败，修正为Prisma真实驼峰列名后只读通过。

## 2026-07-27 D4最终技术终态

- 09安全修复新候选`b6b3d93866e390eb2e37bd52649fa2628403b1b4`已部署到独立release/compose路径；旧候选、B0/B1/B2和失败证据均保留。
- 唯一无参数backfill exit 0；生产由35 null/0 non-null变为0 null/35 non-null，每条精确1536维且全部有限。
- B3 post-embedding final恢复点已完成远端与仓库外本地副本验证。
- 新API与原db healthy，API仅绑定`127.0.0.1:3000`；Nginx仍inactive+disabled，公网Web链路尚未实施。

## 2026-07-27 D5 API边缘实测

- Ubuntu 22.04 Nginx 1.18不支持独立`http2 on`指令；兼容写法为`listen 443 ssl http2`。首次失败发生在`nginx -t`且服务未启用，未形成半配置公网代理。
- Certbot standalone续期在Nginx运行时需要受控pre/post hook释放并恢复80端口；安装hook后dry-run成功且Nginx恢复active。
- 公网HTTPS、Prisma分页、精确CORS、媒体、6MiB限制和伪造XFF限流均通过。Search/Chat真实浏览器链路留人工验收，未新增AI调用。
- Clash/TUN fake-IP会使本机TCP端口探测产生假阳性；生产暴露面判断必须使用安全组控制面、UFW与ECS监听三层证据。
## D6 Git/Vercel 接入事实（2026-07-27）

- 固定发布提交已经存在于远端独立分支 `codex/production-release-b6b3d938`，远端 `main` 保持不变。
- 当前 Vercel 账号已登录，但未安装/授权 GitHub App 访问目标仓库；在完成该账号级仓库授权前，Vercel 无法导入目标分支。
- GitHub App 授权属于用户账号操作；完成后仍须在首次 Production 部署前核对 Production Branch、Root Directory、构建输出和 Production/Preview 环境变量。
- Vercel 首次项目导入固定使用默认分支；本次默认分支初始化构建失败，但项目得以创建且没有自定义域名流量。随后通过 Environment/Branch Tracking 把 Production Branch 锁定独立发布分支，并用 Dashboard 的 Create Deployment 对完整 SHA 建立 Production。
- 正式 deployment 已 Ready/Current；默认 Vercel 域可加载前端，但后端精确 CORS 拒绝该临时来源，正式功能验收必须等待自定义前端域名 DNS 生效。
- 权威DNS写入后，Vercel自定义域名显示`Valid Configuration`并完成TLS；正式Origin的API响应精确返回对应CORS头，临时Vercel域fail-closed与正式域可用两项同时成立。
- 用户随后完成正式域名人工验证并确认成功；D6的人工作业结果与自动门禁一致，D6已关闭，D7尚未开始。
- Vercel SPA rewrite已由`/login`和`/mine/posts`直接HTTP 200验证；匿名守卫仍在客户端按既有语义转到Login。
- 正式Home四档视口均无页面级横向溢出且仅有1个页面级搜索框；浏览器console无warning/error。
- 2026-07-27 D7：用户确认生产库相较B3新增的1 User与1 Avatar均为此前人工验收产生，账号/头像增量归属闭环。
- 2026-07-27 D7：四视口只读截图在1440/900/390未发现页面级横向溢出；320桌面浏览器视口因全局`body min-width:320px`与15px经典垂直滚动条叠加，出现`html.clientWidth=305`、`body.scrollWidth=320`的横向滚动条。该事实不归因于轮播或PostCard；D7不临时改CSS，登记为严格320验收阻塞。
- 2026-07-27 D7：用户批准将上述320px表现登记为桌面经典滚动条模拟环境例外，不修改CSS或重建制品。
- 2026-07-27 D7：Home真实`原神 × 攻略`AND筛选返回2篇，清除后恢复10篇；真实触底加载至20篇，从`/post/35`返回恢复`scrollY=4164`且列表保持20篇。Mine在用户ID 6登录态刷新前后保持，不触发RequireAuth跳转。
- 2026-07-27 D7：永久测试帖为`/post/36`，点赞、评论与回复均已回退为0；Search成功但因500ms debounce与随后手动提交，供应商请求数按最多2次保守登记；Chat唯一一次真实请求约4.4秒结束并生成独立引用`/post/29`。
- 2026-07-27 D7：写后只读终态为User6/Post36/Comment13/Like31/File11/Avatar1，36/36 embedding合法，uploads 24文件/497958 bytes；API/db healthy、无tool残留、公网3000监听0、failed units0。
- 2026-07-28 D7：用户完成最终人工检查并明确确认验收通过；此前登记的320px模拟环境例外、Search最多2次请求和工具层噪声均不构成上线阻塞。
- 2026-07-28 D8：上线后配对备份已形成远端与仓库外本地双副本，四项SHA、dump/tar和manifest均通过；恢复同一API后生产计数与uploads无漂移。
- 2026-07-28 D8：ECS现有阿里云助手与安全代理，但未发现CloudMonitor主机监控agent。官方契约显示基础CPU/网络无需agent，精确内存/文件系统监控需要C++ 3.x agent；D8最终关闭必须以阿里云控制台agent、联系人和告警规则的真实状态为准。
- 2026-07-28 D8：费用清单和书面下线演练已完成；未创建或释放任何付费资源。阿里云控制台当前需要用户登录，属于唯一外部控制面门禁。

## 2026-07-28 D8 CloudMonitor控制面

- 用户授权后已创建CloudMonitor服务关联角色并安装LoongCollector 4.0.0；CPU、内存、磁盘指标上报正常，ECS侧对应服务active且failed units为0。
- 已为唯一目标实例创建CPU `>=80%`持续5分钟、内存`>=85%`持续3分钟、磁盘`>=70%` Warn/`>=85%` Critical持续3分钟三条规则，均显示正常并绑定既有联系人组。
- 联系人组成员关系已确认，但旧版联系人页不展示独立激活状态；历史等待激活状态不能证明当前通知可达，必须与实际接收确认分开验收。
- 站点监控/网络分析属于按量付费能力，控制台显示最低`0.001元/次`；未获新增付费资源授权，未开通API公网探测。API、Prisma、Nginx与证书继续按runbook执行主机侧/人工检查。
- 临时CPU规则以`>=0%`持续1分钟真实触发，控制台同时记录报警发生和通道沉默；临时规则随后删除，三条正式规则无变化。该证据证明云监控事件链触发成功，但外部短信/邮件/电话到达仍必须由用户确认。
- 用户随后确认实际收到通知，D8.2通知可达性门禁闭环；临时规则保持已删除，三条正式规则未变。D8与07生产部署批次均已人工验收关闭。
