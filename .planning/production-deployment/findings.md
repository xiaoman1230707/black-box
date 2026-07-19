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
