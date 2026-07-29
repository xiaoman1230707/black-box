# Black-box 生产部署实施计划

> **执行要求：** 实施时必须使用 `executing-plans` 按 D0～D8 检查点推进；每批完成自动验证后停止，等待用户人工确认。设计确认不构成任何云端、DNS、secret、数据库、AI 费用或发布授权。

**目标：** 将同一已审核 `RELEASE_SHA` 的 Black-box 前端发布到 Vercel、后端发布到阿里云香港 ECS，并以可恢复、可回滚、可核费的方式运行 NestJS、PostgreSQL 与 uploads。

**架构：** Vercel 承载 React/Vite 静态前端；ECS 宿主机承载 Nginx、SSH 和持久目录；Docker Compose 承载单 NestJS API 与 PostgreSQL 16。后端镜像从干净 release worktree 本地构建为 `linux/amd64`，以归档、SHA-256 和 release manifest 传入 ECS；前后端必须绑定同一个 commit。

**技术栈：** Git、pnpm、Node LTS、Docker Buildx/Compose、PostgreSQL 16、Prisma 6、Ubuntu 22.04、Nginx、Vercel、PowerShell、POSIX shell。

**计划状态：** D0～D8均已实施并通过用户人工验收；07生产部署批次正式关闭，未自动进入第五期。

---

## 一、全局约束

1. 权威设计为 `docs/design/07-production-deployment.md`；若实现需要改变其架构、安全或授权语义，先修设计并暂停。
2. O2 已经用户审查并独立提交为 `7fef3bec831e047c4834f3d4765e930e9a7680eb`；用户的 `CLAUDE.md` 改动仍在工作树，禁止误纳入任何部署提交或 `RELEASE_SHA`。
3. 禁止从当前脏工作树构建生产制品。所有镜像和 Vercel Production 都从同一个干净 `RELEASE_SHA` 生成。
4. 不修改业务语义、Prisma schema/migrations、现有 9 个 Playwright 文件/51 条断言或 `docs/prototype/`。
5. secret 仅由用户在本机、ECS root 文件或 Vercel控制台注入；脚本、日志、QA、manifest 和命令输出不得回显值。
6. `FRONTEND_HOST`、`API_HOST`、`RELEASE_SHA`、`IMAGE_DIGEST`、`POSTGRES_IMAGE` 是受控部署参数，不以临时字符串代替真实验收。
7. migration、seed-games、rebuild-tags、seed-demo、embedding、cleanup apply、API_HOST DNS、Vercel Production 切流、付费资源创建和最终释放分别需要明确授权。前一步失败立即停止。
8. cleanup 在本部署计划中只执行 dry-run。apply 不属于常规发布步骤，即使已有备份也必须另获唯一命令授权。
9. P6/最终验收只验证和记录，不临时开发。发现代码、数据安全或部署阻塞时回到责任批次修复并重新验收。
10. 每次 Git 暂存使用显式 pathspec，禁止 `git add .`、reset、checkout 覆盖、clean 或 stash 用户改动。
11. 所有云端命令先记录目标账号/地域/实例的非敏感标识并由用户确认；不在文档中记录公网 IP、真实出口 IP、密码、key、连接串或私钥。
12. 用户已在 TUN 开启状态下人工验证 ECS 专属 DIRECT 规则并配置`black-box-ecs` Host alias。后续远程命令必须显式使用deploy身份，SSH固定为`ssh -l deploy black-box-ecs`，SCP/SFTP/rsync采用等价用户参数；连接无需逐次申请S授权，但不授权任何写入，各类E/DB/AI/DNS/V/C/R门禁继续独立生效。

## 二、授权类型

| 编号 | 授权类型 | 默认状态 | 典型动作 |
|---|---|---|---|
| L | 本地只读/测试 | 计划获批后可按批执行 | git 审计、unit/build/e2e、配置静态校验 |
| LC | 本地写入/提交 | 每次提交前确认 | 代码、部署文件、Git commit、镜像归档 |
| E | ECS 写入 | 每批明确确认 | 用户、包、Swap、目录、容器、Nginx、证书 |
| DB | 数据库写入 | 每条维护命令独立确认 | migration、各 seed、embedding、恢复 |
| AI | 外部调用与费用 | 每种调用明确确认 | DeepSeek 预检、embedding 预检与回填 |
| DNS | 公网解析 | API/前端域名分别确认 | A/CNAME/TXT、TTL、切换与回滚 |
| V | Vercel 写入/切流 | 项目创建、deployment、alias 分别确认 | env、Production deployment、回滚 deployment |
| C | 可能持续计费资源 | 创建前确认 | EIP、快照、OSS/COS、付费域名或超额套餐 |
| R | 破坏性释放 | 备份闭环后逐项确认 | cleanup apply、下线、释放 ECS/磁盘/EIP/快照 |

“允许开始某批”只覆盖该批明确列出的授权，不自动覆盖下一批或其他类型。

### 2.1 SSH/DIRECT 连接口径

1. TUN保持开启，所有连接只使用已配置的`black-box-ecs` Host alias及用户已人工验证的ECS专属DIRECT规则，并显式指定deploy身份；SSH命令固定为`ssh -l deploy black-box-ecs`。不记录alias背后的真实公网IP、出口IP或私钥路径。
2. SSH、SCP、SFTP、rsync-over-SSH和连接测试不再设置逐次S授权门禁，连接中断后可按同一受控alias重新建立连接。
3. 连接授权与写入授权严格分离：只读连接可按已确认计划执行；任何系统、文件、数据库、AI、DNS、Vercel、计费或释放写入仍必须先取得对应E/DB/AI/DNS/V/C/R授权。
4. 连接失败时暂停并让用户核对本地DIRECT规则；不得自动关闭TUN，也不得擅自修改安全组、密钥、`sshd`、用户名、端口或认证方式。
5. 一组远程操作结束后关闭连接并记录结果。QA、runbook和日志不得保存真实ECS公网IP、用户出口IP、私钥路径或密钥内容。

## 三、文件职责矩阵

### 3.1 计划新增

| 文件 | 首次批次 | 职责 |
|---|---|---|
| `docs/plans/07-production-deployment-implementation-plan.md` | 本轮 | 本实施计划 |
| `backend/backend/posts/Dockerfile` | D1 | 多阶段 linux/amd64 生产镜像、非 root、fixtures、真实启动入口 |
| `backend/backend/posts/.dockerignore` | D1 | 排除 env、uploads、coverage、dist、本地缓存和无关文件 |
| `frontend/black_box/vercel.json` | D1 | React Router SPA rewrite |
| `deploy/production/compose.yaml` | D1 | api/db/migrate/目录 seed/embedding/AI预检工具服务 |
| `deploy/production/nginx/black-box.conf.template` | D1 | API_HOST HTTPS、真实 IP、上传上限、SSE 禁缓冲 |
| `deploy/production/runtime.env.example`、`database.env.example`、`demo-seed.env.example`、`embedding.env.example`、`ai-preflight.env.example` | D1 | 按常驻 API 与一次性工具职责拆分最小变量，不含真实值 |
| `deploy/production/postgres.env.example` | D1 | PostgreSQL 变量名，不含真实值 |
| `deploy/production/release.env.example` | D1 | 镜像、bind mount、端口和 release 参数 |
| `deploy/production/release-manifest.example.json` | D1 | commit、镜像、Vercel deployment、migration、备份与回滚字段 schema |
| `deploy/production/scripts/build-image.ps1` | D1 | 从干净 SHA 构建/导出 linux/amd64 镜像并生成哈希 |
| `deploy/production/scripts/build-image.test.ps1` | D1 | 锁定制品目录不得等于或位于仓库内 |
| `deploy/production/scripts/verify-stack.sh` | D1 | 分别验证 liveness、DB readiness、Prisma readiness、SSE头和持久目录 |
| `deploy/production/scripts/ai-preflight.mjs` | D1 | 使用容器注入 env 做最小 DeepSeek/embedding 实测，只输出状态、耗时和维度 |
| `deploy/production/scripts/ai-preflight.test.mjs` | D1 | 使用 Node 内建 test 与 mock fetch 锁定超时、1536 维、有限值和脱敏输出 |
| `deploy/production/scripts/backup-pair.sh` | D1 | 同一停写窗口生成 pg_dump、uploads 归档、SHA-256 与 manifest |
| `deploy/production/scripts/backup-pair.test.sh` | D1 | 锁定备份嵌套、重名、并发写入口与manifest身份 |
| `deploy/production/scripts/compose-policy.test.ps1` | D1 | 锁定每个常驻/一次性服务的最小env与网络矩阵 |
| `docs/operations/production-deployment-runbook.md` | D1～D8 | 实际命令、授权点、恢复和下线操作手册 |
| `docs/qa/production-deployment/d0-release-source.md` | D0 | O2 审计、基线和提交边界证据 |
| `docs/qa/production-deployment/d1-deployment-files.md` | D1 | 配置/TDD/静态审计结果 |
| `docs/qa/production-deployment/d2-local-image.md` | D2 | 镜像、隔离 Compose、备份恢复证据 |
| `docs/qa/production-deployment/d3-ecs-host.md` | D3 | 主机加固、版本、端口、资源和权限证据 |
| `docs/qa/production-deployment/d4-production-data.md` | D4 | 五步初始化、AI预检、计数、向量和配对备份证据 |
| `docs/qa/production-deployment/d5-api-edge.md` | D5 | HTTPS、CORS、真实IP、限流、uploads、SSE证据 |
| `docs/qa/production-deployment/d6-vercel-release.md` | D6 | 同SHA deployment、DNS、切流和回滚目标 |
| `docs/qa/production-deployment/d7-final-acceptance.md` | D7 | 自动矩阵、36张截图与真实链路 |
| `docs/qa/production-deployment/d8-operations-closeout.md` | D8 | 监控、费用、备份、下线清单和最终状态 |

### 3.2 计划修改

| 文件 | 批次 | 变更边界 |
|---|---|---|
| `backend/backend/posts/src/config/env.ts` | D1 | `trustProxy` 增加受控 `'one-hop'`，不接受任意布尔/网段 |
| `backend/backend/posts/src/config/env.spec.ts` | D1 | TDD 锁定 one-hop 接受与非法值拒绝，测试数量不靠新增文件膨胀 |
| `backend/backend/posts/src/main.ts` | D1 | `'one-hop'` 映射为 Express `trust proxy = 1` |
| `backend/backend/posts/.env.example` | D1 | one-hop、受支持 DeepSeek model、兼容 embedding base URL 口径 |
| `docs/operations/phase4-deployment.md` | D1 | one-hop、容器代理、同SHA及健康分层事实回填 |
| `docs/operations/phase4-maintenance.md` | D1 | 全新作品展示库五步初始化的窄范围例外；已有生产库仍禁止 seed |
| `docs/design/07-production-deployment.md` | 各批 | 只回填实施/验收状态和经确认的实测差异 |
| `.planning/production-deployment/{task_plan,findings,progress}.md` | 各批 | 检查点、错误和授权状态 |

### 3.3 明确不修改

- `CLAUDE.md`。
- `backend/backend/posts/prisma/schema.prisma` 与 `prisma/migrations/**`。
- `frontend/black_box/e2e/**`、既有前后端产品测试断言。
- Home/Search/Chat/Mine/O2 页面、API、store 与路由业务实现。
- `docs/prototype/**`、前后端 lockfile 和现有依赖版本。

## 四、批次总览与依赖

```mermaid
flowchart LR
  D0["D0 发布源与 O2"] --> D1["D1 部署文件与 one-hop"]
  D1 --> D2["D2 本地镜像与隔离恢复"]
  D2 --> D3["D3 ECS 主机"]
  D3 --> D4["D4 生产库与 AI"]
  D4 --> D5["D5 API/HTTPS/SSE"]
  D5 --> D6["D6 Vercel/DNS 切流"]
  D6 --> D7["D7 全链路验收"]
  D7 --> D8["D8 运维交接与下线口径"]
```

每批都必须有用户确认。D0～D2 主要发生在本地；D3 起涉及 ECS；D4 每个数据库/AI步骤继续拆独立授权；D6 才允许 Vercel Production 与前端 DNS 切流。

---

## 五、D0：O2 审计、提交边界与发布基线

**授权：** L；任何 commit 属 LC，必须在审计报告获用户确认后单独授权。

**目标：** 把已验收 O2 从用户 `CLAUDE.md` 和生产部署文件中独立出来，形成可审查提交；冻结发布基线，但尚不生成最终 `RELEASE_SHA`。

### D0.1 工作树与保护证据

- [x] 运行 session catchup，记录 branch、HEAD、remote、`git status --short`、`git diff --stat`、Node/pnpm、Docker Client/Buildx/daemon状态。
- [x] 生成受保护文件 SHA-256，至少包含 `CLAUDE.md`、Prisma schema/migrations、lockfile、9个既有 e2e、原型和非 O2 业务文件。
- [x] Docker Client 已记录为 29.4.3；读取用户级 Docker 配置时出现 Access denied，D0 未绕过权限、未调用 daemon/buildx，留待 D2 镜像前置门禁处理。

### D0.2 O2 显式归属

O2 暂存白名单固定为当前已验收文件：

```text
.planning/post-phase4-personal-content/
backend/backend/posts/src/posts/dto/post-page-query.dto.ts
backend/backend/posts/src/posts/dto/post-query.dto.ts
backend/backend/posts/src/posts/posts.controller.ts
backend/backend/posts/src/posts/posts.controller.spec.ts
backend/backend/posts/src/posts/posts.service.ts
backend/backend/posts/src/posts/posts.service.spec.ts
docs/design/00-foundation.md
docs/design/06-post-phase4-personal-content.md
docs/plans/06-post-phase4-personal-content-implementation-plan.md
docs/qa/phase4/screenshots/o2-before/
docs/qa/post-phase4-personal-content/
frontend/black_box/e2e/personal-content.spec.ts
frontend/black_box/scripts/capture-personal-content-screenshots.mjs
frontend/black_box/src/api/personal-posts.test.ts
frontend/black_box/src/api/personal-posts.ts
frontend/black_box/src/pages/Mine.test.tsx
frontend/black_box/src/pages/Mine.tsx
frontend/black_box/src/pages/MyLikes.tsx
frontend/black_box/src/pages/MyPosts.tsx
frontend/black_box/src/pages/personal/
frontend/black_box/src/router/index.tsx
frontend/black_box/src/types/index.ts
```

- [x] 对白名单逐文件 review，确认和 O2 QA 一致。
- [x] 运行 `git diff -- CLAUDE.md` 只用于确认其存在，不把内容复制进报告。
- [x] 以显式 pathspec 暂存白名单；运行 `git diff --cached --name-only`，断言没有 `CLAUDE.md`、07、production planning 或部署文件。
- [x] 运行 `git diff --cached --check`。

### D0.3 真实基线

```powershell
cd frontend/black_box
pnpm test:unit
pnpm build
pnpm exec playwright test --list
pnpm e2e

cd ../../backend/backend/posts
pnpm test -- --runInBand
pnpm build
```

期望：前端 16 files/53 unit；后端 17 suites/74 Jest；Playwright 9 files/51 tests 且 51 passed；两端 build 成功。lint 继续采用批准差分口径：O2 触及文件 0/0，前端全量不高于历史 3 errors/0 warnings，后端不增加历史债，不表述为全仓 lint 通过。

### D0.4 Commit 门禁

- [x] 用户确认 staged diff 后已执行独立 O2 commit：`feat(personal): add personal post lists`。
- [x] 已记录 `O2_SHA=7fef3bec831e047c4834f3d4765e930e9a7680eb`；`CLAUDE.md` 仍未暂存且哈希未变。
- [x] 07/计划/planning 和未来部署施工仍留在工作树，未误入O2提交。最终 `RELEASE_SHA` 必须包含已确认 O2 与 D1 部署变更，但排除用户未授权的 `CLAUDE.md`。

**人工验收：** 用户审阅 O2 staged 文件列表、测试矩阵和 `CLAUDE.md` 保护证据后确认是否允许 commit。

**失败停止/回滚：** 暂存集合错误时只使用 `git restore --staged -- <明确路径>` 取消本次错误暂存，不恢复工作树；测试失败停止，不修改已验收断言。未经授权不提交、不推送。

---

## 六、D1：部署文件与 `TRUST_PROXY=one-hop` 最小施工

**前置：** D0 O2 commit 已确认；工作树用户改动哈希有保护记录。

**授权：** LC。只允许第三章列出的 D1 文件；不接触 ECS、数据库、DNS 或 Vercel。

**实施状态：** 本节施工已完成、经人工验收并按审查边界提交；D2 使用最终候选 SHA 从干净 worktree 重新构建，不复用 D1 验证制品。

### D1.0 真实文件矩阵与施工顺序

#### 新增文件

| 文件 | 单一职责 |
|---|---|
| `backend/backend/posts/Dockerfile` | Node 24 LTS 多阶段 `linux/amd64` 镜像、Prisma/Nest 构建、非 root runtime、Node 原生 liveness |
| `backend/backend/posts/.dockerignore` | 排除 env、uploads、dist、coverage、node_modules、Git 与本地缓存 |
| `frontend/black_box/vercel.json` | 只提供 React Router SPA rewrite，不代理 API |
| `deploy/production/compose.yaml` | `db`、`api` 常驻服务及 `tools` profile 一次性服务 |
| `deploy/production/nginx/black-box.conf.template` | `API_HOST` TLS 终端、真实 IP、上传限制和 Chat SSE 禁缓冲 |
| `deploy/production/runtime.env.example` | 常驻 API 的数据库/JWT/AI/URL/限流变量；不含 demo seed 密码 |
| `deploy/production/database.env.example` | migrate/games/tags/demo/embedding 的最小 `DATABASE_URL` |
| `deploy/production/demo-seed.env.example` | 仅 seed-demo 使用的演示用户密码 |
| `deploy/production/embedding.env.example` | 仅 embedding 使用的 provider key/base/model |
| `deploy/production/ai-preflight.env.example` | 仅预检使用的两家 provider 变量，不含数据库/JWT/seed 密码 |
| `deploy/production/postgres.env.example` | `POSTGRES_DB/USER/PASSWORD` 注入契约，不含真实值 |
| `deploy/production/release.env.example` | 非 secret 的 image、SHA、bind mount、loopback 端口参数 |
| `deploy/production/release-manifest.example.json` | release pair、镜像/基础镜像 digest、备份、migration 与回滚字段 schema |
| `deploy/production/scripts/build-image.ps1` | 从干净 SHA 构建/检查/导出 `linux/amd64` 镜像并生成 SHA-256 |
| `deploy/production/scripts/verify-stack.sh` | 分层核对 liveness、PostgreSQL readiness、Prisma readiness、可选 SSE 与持久目录 |
| `deploy/production/scripts/ai-preflight.mjs` | DeepSeek 最小流式与 embedding 1536 维预检，不输出正文或 secret |
| `deploy/production/scripts/ai-preflight.test.mjs` | 使用 Node 内建 test/mock fetch 锁定超时、维度、有限值和脱敏输出 |
| `deploy/production/scripts/backup-pair.sh` | 停写窗口内生成数据库 dump、uploads 归档、SHA-256 和配对 manifest |
| `docs/operations/production-deployment-runbook.md` | D1～D8 命令、授权点、失败停止和恢复入口；不保存 secret |
| `docs/qa/production-deployment/d1-deployment-files.md` | D1 自动验证、静态扫描、镜像/Compose 契约与人工门禁证据 |

#### 修改文件

| 文件 | 预期差异 |
|---|---|
| `backend/backend/posts/src/config/env.ts` | `TrustProxy` 增加 `'one-hop'`，并提供纯函数映射到 Express `1` |
| `backend/backend/posts/src/config/env.spec.ts` | TDD 锁定三个合法值、非法布尔/数字/网段拒绝和 Express 映射 |
| `backend/backend/posts/src/main.ts` | 使用纯映射设置 trust proxy；同时把该 D1 触及文件的历史格式/浮动 Promise lint 收敛为 `0/0` |
| `backend/backend/posts/.env.example` | 增加 one-hop 拓扑说明；AI 示例不把香港不支持的官方端点写成生产默认 |
| `docs/operations/phase4-deployment.md` | 回填 one-hop、健康分层、同 SHA 和容器运行事实 |
| `docs/operations/phase4-maintenance.md` | 仅为全新作品展示生产库记录五步初始化窄例外 |
| `docs/design/07-production-deployment.md` | D1 实施后只回填真实状态与已核验 digest，不改变架构 |
| `docs/plans/07-production-deployment-implementation-plan.md` | 记录 D1 检查点和实测偏差 |
| `.planning/production-deployment/{task_plan,findings,progress}.md` | 记录施工、错误、授权和门禁状态 |

#### 明确不改

- `package.json`、两端 lockfile、Prisma schema/migrations、现有9个Playwright文件/51条断言、前端业务源码、后端业务 controller/service、原型和 `CLAUDE.md`。
- 若镜像构建暴露必须新增系统包、依赖或 lockfile 变化，立即停止并回到方案评审，不在 D1 顺手扩展。

#### 顺序与页面级回滚点

1. 复核 D0 保护哈希和空暂存区，记录 D1 前文件清单。
2. 先做 one-hop 红灯测试，再实现 env 类型/解析/Express 映射，完成后单独跑后端验证。
3. 创建 Dockerfile/.dockerignore，先验证构建上下文、产物路径和非 root 契约。
4. 创建 Compose 与按职责拆分的 env example，再用非敏感临时值执行 `docker compose config --quiet` 和服务级最小权限策略测试。
5. 创建 Nginx 模板与 Vercel SPA rewrite，完成静态安全扫描。
6. 按 `ai-preflight` 单测 → 四个脚本最小实现 → 语法/失败语义验证的顺序施工。
7. 更新 operations/runbook、07 实测状态和 D1 QA。
8. 跑完整自动矩阵、镜像/Compose检查和人工文件审查；只标“D1已实施，待人工验收”。

每一步只回滚该步新增/修改文件，不动 O2 commit、用户文件或前一步已验收内容。

### D1.1 TDD：受控代理值

- [x] 在现有 `env.spec.ts` 先加入失败断言：`TRUST_PROXY='one-hop'` 应返回 `trustProxy === 'one-hop'`；纯映射应把 `false→false`、`loopback→'loopback'`、`one-hop→1`；`true`、`1`、`2`、CIDR和任意文本仍拒绝。
- [x] 运行定向 Jest，确认新断言因当前类型/解析器只支持 loopback 而失败。
- [x] 将 `RuntimeEnv.trustProxy` 使用的 `TrustProxy` 类型改为 `false | 'loopback' | 'one-hop'`；解析器只接受三个字面值，错误消息明确列出三者且不回显输入。
- [x] 在 `env.ts` 导出纯函数 `resolveExpressTrustProxy(value)`，返回 `false | 'loopback' | 1`；`main.ts` 只在结果非 `false` 时调用 `app.set('trust proxy', value)`。
- [x] `one-hop` 只写入 production backend env；成立前提固定为宿主只发布 `127.0.0.1:3000`、Nginx为唯一公网入口、Nginx覆盖而不是继承客户端 `X-Forwarded-For`。代码不试图推断部署拓扑。
- [x] 格式化 `main.ts` 的既有范围并用脱敏的 bootstrap catch 结束浮动 Promise；施工前基线为11 errors/1 warning，D1完成结果为该文件0/0。
- [x] 运行 env 定向 Jest、后端全量17 suites/81 tests、build和D1后端定向lint。

### D1.2 镜像与 Compose 文件

#### 基础镜像唯一选择

- Node 选择当前LTS `24.18.0` 的 Debian Bookworm slim，不使用滚动 `lts`/`24`。多平台 index digest 为 `sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d`，选中的 linux/amd64 manifest digest 为 `sha256:d45d78e7929b46875bbd4e29bea672d5bc48186c6c3588306521c815e78352d6`。
- PostgreSQL选择当前16分支安全minor `16.14-bookworm`。多平台 index digest 为 `sha256:92620daddcd947f8d5ab5ba66e848702fe443d87fed30c4cea8e389fd78dfc55`，选中的 linux/amd64 manifest digest 为 `sha256:c95fd5346040eba2de3c435e14874af18f5d681fb5848d4f081dbead0878af28`。先前记录的 `sha256:05dd39157160f7ac440c0b6636cc1d6c019b7d072e94bfa7114f55c80fbd8235` 属 linux/386，不作为 amd64 证据。
- D1施工先用 `docker buildx imagetools inspect` 复核精确tag仍解析到已记录的 index，并核对选中的 linux/amd64 manifest；任何不一致先暂停并更新计划证据，不静默跟随新digest。release manifest与D1 QA必须同时记录二者。
- 依据：[Node 24.18.0 LTS](https://nodejs.org/en/blog/release/v24.18.0)、[Node linux/amd64镜像](https://hub.docker.com/layers/library/node/24.18.0-bookworm-slim/images/sha256-d45d78e7929b46875bbd4e29bea672d5bc48186c6c3588306521c815e78352d6)、[PostgreSQL 16.14](https://www.postgresql.org/docs/16/release-16-14.html)、[PostgreSQL linux/amd64镜像](https://hub.docker.com/layers/library/postgres/16.14-bookworm/images/sha256-c95fd5346040eba2de3c435e14874af18f5d681fb5848d4f081dbead0878af28)。

#### Dockerfile 契约

- 所有阶段使用同一固定Node引用并由Buildx选择`linux/amd64`。builder通过Corepack固定激活`pnpm@11.9.0`，执行`pnpm install --frozen-lockfile`、`pnpm exec prisma generate --schema prisma/schema.prisma`和`pnpm build`。pnpm 11 的构建脚本仅通过镜像中间层临时 `pnpm-workspace.yaml` 的 `allowBuilds` 白名单放行 Nest/Prisma/bcrypt/sharp/unrs-resolver，不使用全量放行，且该临时文件不进入 runtime。
- 独立prod-deps阶段只安装`--prod --frozen-lockfile`并再次针对镜像内schema生成Prisma Client；不把Nest CLI、Jest、TypeScript或源测试带入runtime。
- build stage 同步复制根目录 `prisma.config.ts`，使容器与本地 Nest build 使用同一共同根目录并稳定生成 `dist/src/*`；`prisma generate` 只注入非敏感 build-only 占位数据库 URL，不连接数据库、不进入 runtime。runtime只复制生产`node_modules`、`package.json`、`dist`、`prisma/schema.prisma`、完整`prisma/migrations`。当前Nest build已实测生成`dist/src/main.js`及四个编译脚本，但不复制fixtures，因此另行复制`src/scripts/fixtures/phase4-demo-images`到`dist/src/scripts/fixtures/phase4-demo-images`。
- `/app`为唯一`WORKDIR`；创建固定UID/GID 10001，`/app/uploads`由该用户持有并作为bind mount目标；最终`USER 10001:10001`，入口固定`node dist/src/main.js`。
- runtime 在最小 Debian 基础上仅安装 Prisma 明确要求的 `openssl`，不加入编译工具。liveness使用Node 24原生`fetch`请求`http://127.0.0.1:3000/api`并设置短超时；不为healthcheck安装curl/wget。镜像标签和OCI label记录`RELEASE_SHA`以及 Node index/linux-amd64 manifest digest，不用`latest`回滚。
- 若Sharp/bcrypt/Prisma在glibc amd64安装失败，停止并报告；不得临时向runtime添加编译工具或转用Alpine。

#### Compose 契约

- `db`使用固定PostgreSQL引用，仅接入`db_net`（`internal: true`），不声明ports；`${POSTGRES_DATA_DIR}`精确bind到`/var/lib/postgresql/data`，healthcheck使用容器内`pg_isready`。
- `db`限制`mem_limit: 640m`、`cpus: 0.75`，启动参数固定`shared_buffers=128MB`、`max_connections=30`、`work_mem=4MB`、`maintenance_work_mem=64MB`。
- `api`接入`db_net`和`egress_net`，只发布`${API_BIND_ADDRESS:-127.0.0.1}:${API_PORT:-3000}:3000`；生产`API_BIND_ADDRESS`必须为`127.0.0.1`。挂载`${UPLOADS_DIR}:/app/uploads`，限制`mem_limit: 768m`、`cpus: 1.0`、`pids_limit`，`NODE_OPTIONS=--max-old-space-size=512`。
- api/db均使用`json-file`日志`10m×3`；api为只读根文件系统并提供`/tmp` tmpfs，uploads是唯一业务可写mount。若Sharp实测需要额外临时路径，只允许写tmpfs。
- `migrate`命令固定使用镜像内`node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma`；`seed-games`、`rebuild-tags`、`seed-demo`、`embedding-backfill`分别调用四个真实`dist/src/scripts/*.js`入口，embedding不带`--all`。
- `migrate`、四个初始化服务和`ai-preflight`全部声明`profiles: [tools]`、`restart: 'no'`且无ports；只通过`docker compose run --rm <service>`显式运行。默认`up`不得执行migration、seed、embedding或AI调用。
- 新库顺序仍由runbook逐项授权：先`up -d db`，再migrate和只读核对，最后才`up -d api`；不得用一次裸`up -d`绕过migration门禁。
- env 按最小职责拆分：`release.env`仅含非secret image/SHA/digest/绝对路径/loopback端口；`postgres.env`仅供PostgreSQL；`runtime.env`仅供常驻API；`database.env`仅供数据库工具；`demo-seed.env`、`embedding.env`、`ai-preflight.env`只注入对应一次性服务。除release外均为`root:root 0600`。migrate/games/tags仅接内部数据库网络；demo seed仅接内部数据库网络；embedding接数据库与外网；AI preflight只接外网。Compose校验只用`config --quiet`，禁止打印展开配置。
- 宿主目录在D3按固定UID 10001授予uploads最小权限；PostgreSQL目录UID/GID必须从已锁定镜像实测后设置，不在D1凭空写死。

### D1.3 Nginx、Vercel与脚本

#### Nginx与Vercel

- [x] Nginx template只接受非secret参数`API_HOST`。证书首次签发采用Certbot standalone停Nginx流程；证书存在后才渲染最终模板并执行`nginx -t`，避免引用不存在证书导致首启失败。
- [x] 80端口保留ACME challenge并把其余请求301到HTTPS；443仅代理`/api/`和`/uploads/`到`127.0.0.1:3000`，`client_max_body_size 6m`，禁目录索引，TLS只允许1.2/1.3。
- [x] Nginx覆盖`X-Real-IP`和`X-Forwarded-For`为`$remote_addr`，设置`X-Forwarded-Proto $scheme`和`Host $host`，不继承客户端伪造链；这与Express one-hop共同形成真实IP边界。
- [x] `/api/ai/chat`独立location使用HTTP/1.1、`proxy_buffering off`、`proxy_cache off`、`gzip off`、75秒读写超时；不改写data-stream头或part。
- [x] `vercel.json`只有SPA catch-all rewrite到`/index.html`，不出现`API_HOST`、proxy、function或serverless配置。Production构建注入`https://API_HOST/api`；Preview固定`https://api.invalid/api`并继续被生产CORS拒绝。

#### 四个脚本

| 脚本 | 输入 | 成功输出 | 失败语义与secret边界 |
|---|---|---|---|
| `build-image.ps1` | `ReleaseSha`、干净worktree、仓库外`OutputDir`、本地image名称 | image archive、archive SHA-256、image ID/digest、基础镜像digest、架构和manifest字段 | 工作树不净、HEAD不符、非amd64、非UID10001或healthcheck缺失均非零；不读取env/secret，不覆盖已有同名制品 |
| `verify-stack.sh` | compose/release env路径、`base`或`authenticated-sse`模式；SSE模式额外从环境读取短期JWT | 各层PASS/FAIL、HTTP状态、SSE头/finish标记、路径可写/持久性状态 | 默认base模式不调用AI；SSE模式单独授权。不得`set -x`，不得输出token、响应正文、env或连接串；任一必检项失败非零 |
| `ai-preflight.mjs` | provider env、固定无敏感最小prompt、显式超时 | provider状态、耗时、chat流完成、embedding维度=1536且全部有限 | deadline覆盖响应头与完整body消费；任一HTTP/超时/协议/维度失败非零；不输出key、endpoint查询参数、prompt、响应正文或向量。Node内建测试用mock fetch，不产生真实调用 |
| `backup-pair.sh` | compose/env路径、绝对uploads/backup目录、`RELEASE_SHA`、`API_IMAGE_DIGEST` | 唯一UTC目录、custom pg_dump、uploads tar.gz、两份SHA-256；manifest记录镜像digest、migration清单、绝对路径和大小 | 先确认无migrate/seed/embedding写工具运行，再停止api；拒绝同名complete/incomplete及backup落入uploads/仓库；失败保留`.incomplete`和旧备份、api保持停止，非零退出且不声称回滚；不打印数据库URL/密码 |

- [x] Shell脚本统一`set -Eeuo pipefail`、拒绝相对持久目录和仓库内备份目录；PowerShell统一`Set-StrictMode -Version Latest`和`$ErrorActionPreference='Stop'`。
- [x] `ai-preflight`只通过tools profile只读挂载到`/opt/black-box-tools`；常驻api/db不挂载deploy脚本。其Node内建单测覆盖流式完成、429、超时、1536维、非有限值/错误维度和输出脱敏。
- [x] 提交前安全复核以失败测试锁定并修复：常驻API不再持有seed密码；各tools按env与网络最小授权；AI超时覆盖body；备份manifest/重名/嵌套/写入口防护闭环；镜像输出目录等于仓库根目录也被拒绝。
- [x] 不新增自动发布、自动DNS、自动证书购买、定时备份、远程镜像仓库或多实例编排；脚本只减少当前单机部署的重复手工错误。

### D1.4 文档一致性

- [x] 更新 backend `.env.example`、phase4 deployment/maintenance 和生产 runbook，写清 one-hop、健康分层、五步初始化例外和独立授权。
- [x] 用静态扫描确认 deployment 文件没有 localhost 生产默认之外的公网暴露、没有真实 secret，Compose 不发布5432，3000默认只绑定127.0.0.1。
- [x] `release-manifest.example.json`固定包含`releaseSha`、Node/Postgres基础镜像index digest、应用image digest/archive SHA、migration状态、数据库/uploads备份SHA、Vercel deployment/source SHA与双方回滚目标；字段值使用明显不可发布的示例，不写真实域名或凭据。
- [x] D1实际diff仅为D1.0矩阵；`package/lock`、schema/migrations、e2e未变化，`CLAUDE.md`保持用户未暂存改动且SHA-256与D0一致。

### D1.5 验证

```powershell
# 当前工具事实（用户已确认）
# Docker Desktop 4.74.0 / Engine 29.4.3 / Compose 5.1.3
# Buildx 0.33.0 / BuildKit 0.29.0 / desktop-linux / linux/amd64

cd backend/backend/posts
pnpm exec jest src/config/env.spec.ts --runInBand
pnpm test -- --runInBand
pnpm build
pnpm exec eslint src/config/env.ts src/config/env.spec.ts src/main.ts

cd ../../../frontend/black_box
$env:VITE_API_BASE_URL='http://localhost:3000/api'; pnpm build
pnpm test:unit
pnpm exec playwright test --list
pnpm e2e

cd ../..
node --test deploy/production/scripts/ai-preflight.test.mjs
powershell -NoProfile -File deploy/production/scripts/compose-policy.test.ps1
powershell -NoProfile -File deploy/production/scripts/build-image.test.ps1
bash -n deploy/production/scripts/verify-stack.sh
bash -n deploy/production/scripts/backup-pair.sh
bash deploy/production/scripts/backup-pair.test.sh
node -e "JSON.parse(require('fs').readFileSync('frontend/black_box/vercel.json','utf8'))"
node -e "JSON.parse(require('fs').readFileSync('deploy/production/release-manifest.example.json','utf8'))"
docker buildx imagetools inspect node:24.18.0-bookworm-slim
docker buildx imagetools inspect postgres:16.14-bookworm
docker compose --env-file "$env:TEMP\black-box-d1\release.env" -f deploy/production/compose.yaml config --quiet
```

执行 Compose 校验前，D1 只依据三个 example 在 `$env:TEMP\black-box-d1\release.env` 及同目录生成非敏感测试 env；测试文件不进入仓库，验证结束后删除。真实 production env 不在 D1 创建或读取。

镜像验证在D1实施时执行一次本地`linux/amd64`构建，不上传、不调用AI：检查image architecture=`amd64`、`Config.User=10001:10001`、`WorkingDir=/app`、入口、OCI revision、Node原生healthcheck、生产依赖、四个编译脚本、完整migration和10个fixture。对保存的image archive计算SHA-256。`docker compose config --quiet`只使用仓库外非敏感测试env，不把展开后的secret形态写入日志。

静态扫描必须覆盖：env/密钥模式、真实IP/域名、`latest`、公网`0.0.0.0:3000`、宿主5432、常驻服务挂载tools脚本、`curl` healthcheck、`dangerouslySetInnerHTML`式无关变更，以及受保护文件哈希。现有9 files/51 Playwright不得修改。

**完成门禁：** 后端定向和新增文件lint 0/0；后端17 suites/81与build通过；前端16 files/53、build、9 files/51 Playwright通过；Docker/Compose/JSON/Shell/Node test全过；受保护文件哈希不变。全量历史lint债只记录、不借D1清理。

**D1 实测状态（2026-07-19，已关闭）：** one-hop TDD RED/GREEN 已闭环，env 定向16/16、后端17 suites/81、前端16 files/53、Playwright 9 files/51及两端build全部通过；D1后端定向lint为0/0，前端全量保持3/0，后端全量历史债为833/6，低于P6的881/7。Buildx已复核Node/PostgreSQL的index与linux/amd64 manifest，其中PostgreSQL `05dd...`明确为linux/386；本地验证镜像为amd64、UID/GID10001、`/app`、`dist/src/main.js`、Node healthcheck，携带3个migration目录、4个初始化脚本和10张fixture，bcrypt/sharp/Prisma/OpenSSL可用。最终临时归档为205,704,704 bytes，SHA-256 `7152DAC86E7230E339349C46CD6C42AA145305180363411BE03978AB6E7A8113`，记录后已删除，不是可发布制品。Compose默认仅`api,db`，tools profile额外暴露六个一次性服务并通过7项最小env/网络策略测试；AI preflight为8/8，备份安全fixture为4/4，build输出路径边界为2/2。JSON/Shell/PowerShell、脚本fail-fast、静态secret/公网暴露扫描均通过。三个提交已按用户审查边界创建，候选 `RELEASE_SHA` 为 `38247ff057310e0f98125a0bbcafbfab2969877c`；未 push、未连接 ECS、未操作真实数据库、AI、Vercel 或 DNS。

**人工验收：** review文件矩阵、one-hop前提、exact image/digest、端口、资源、mount、tools profile、脚本无secret输出、镜像内容和差分测试。确认前不新增或修改Playwright。

**失败停止/回滚：** 只回滚 D1 文件，不碰 O2 commit或用户文件。未通过 review不得commit。通过后可申请三个显式commit：设计/计划文档一份、one-hop 配置施工一份、部署文件施工一份；第三份提交形成候选 `RELEASE_SHA`。

**建议提交拆分：** 每个commit都需独立授权且使用显式pathspec：

1. `docs(deploy): define production release process`：07、实施计划、production planning、D0/D1 QA和operations事实；不含`CLAUDE.md`。
2. `fix(config): support one-hop proxy trust`：env类型/测试/main映射和`.env.example`，可独立回滚到原代理语义。
3. `build(deploy): add production runtime topology`：Docker/Compose/Nginx/Vercel/脚本/runbook。该提交完成并验收后形成候选`RELEASE_SHA`。

### D1.6 风险与停止边界

| 风险 | 预防/验证 | 停止与回滚 |
|---|---|---|
| `one-hop` 在非唯一代理拓扑下信任错误来源 | 3000 只绑定宿主 loopback；Nginx 唯一入口并覆盖转发头；TDD 只接受三个字面值 | 任一拓扑条件不成立即保持 `TRUST_PROXY=false` 并停止 D1，不扩大成任意 CIDR/多跳配置 |
| 官方 tag 的 index digest 漂移或平台清单不含 amd64 | 构建前 `imagetools inspect`，记录 index/amd64 digest与时间 | 与计划不一致即停，不静默更新；只修文档并重新评审镜像选择 |
| 编译脚本、migration或10个demo fixture漏入runtime | 对镜像文件清单逐项断言，并在隔离容器验证四个脚本可解析 | 镜像不作为候选制品；仅回滚Dockerfile/.dockerignore施工 |
| Sharp、bcrypt或Prisma native产物与linux/amd64/glibc不兼容 | 本地amd64构建、非root启动和最小真实容器验证 | 不换Alpine、不加未评审系统依赖；停回镜像方案评审 |
| tools profile被默认`up`带起并产生DB/AI写入 | Compose profile、`restart: no`、无ports；审查默认服务集合 | `docker compose up`若解析出一次性服务即阻塞，不运行任何stack |
| Compose/脚本输出展开secret | 只用非敏感临时env执行`config --quiet`；脚本禁`set -x`并做静态扫描 | 一旦日志或制品出现敏感值立即删除未发布制品、轮换受影响secret并停止施工 |
| `main.ts`历史lint清理越出启动接缝 | 只处理该文件现有格式和bootstrap Promise；定向diff review | 若需要改变路由、CORS、JWT、SSE或业务启动语义则撤回该步并重新评审 |

---

## 七、D2：干净 release、本地 linux/amd64 镜像与隔离恢复

**前置：** D1 已关闭；候选 `RELEASE_SHA` 固定为 `38247ff057310e0f98125a0bbcafbfab2969877c`。本节当前仅形成施工方案，未授权执行。

**授权：** 未来执行需新的 L/LC 授权。仅允许本机 Docker 与仓库外一次性目录写入；禁止 ECS、Vercel、DNS、真实 AI、真实生产数据库和现有本地开发数据库。migration、目录初始化、seed 与恢复写入仅可发生在 D2 创建的隔离 Compose project。

### D2.0 文件与资源矩阵

仓库内不新增或修改产品代码、部署配置、依赖、lockfile、schema、migration 或既有测试。D2 执行只更新 `docs/qa/production-deployment/d2-local-image.md`、本计划、07 状态与 production planning；所有运行制品位于仓库外。

| 受控对象 | 固定职责与边界 |
|---|---|
| `D2_ROOT` | 仓库外唯一临时根目录，名称含完整 `RELEASE_SHA`；创建前必须不存在，禁止复用或覆盖 |
| `D2_ROOT/release` | `git worktree add --detach` 创建的干净 release worktree；只读作为测试、构建和 Compose 文件来源 |
| `D2_ROOT/artifacts` | 镜像 tar、构建 manifest 与 SHA-256；与 release worktree 平级，满足 `build-image.ps1` 仓库外输出约束 |
| `D2_ROOT/source/{postgres,uploads,backups,env}` | 源隔离栈的 bind mount、最小 env 与配对备份；不得指向现有目录 |
| `D2_ROOT/restore/{postgres,uploads,backups,env}` | 恢复栈的全新目录；不得和 source 共享数据库或 uploads |
| `blackbox-d2-source-38247ff` | 源 Compose project；API 仅绑定 `127.0.0.1:3108`，5432 不发布 |
| `blackbox-d2-restore-38247ff` | 恢复 Compose project；API 仅绑定 `127.0.0.1:3109`，5432 不发布 |

端口 `3108/3109` 在执行前必须确认未监听；若占用则停止并重新提交显式替代端口，不自动随机选择。Docker 构建、source 栈和 restore 栈串行运行，不同时保留两个运行中的 API/db 组合。主机前置预算为可用内存不少于 4 GiB、可用磁盘不少于 8 GiB；`D2_ROOT` 软上限 4 GiB，超限立即停止。单栈 Compose 上限沿用 db 640 MiB + API 768 MiB；一次只运行一个写入工具，写入工具运行时停止 API。

### D2.1 干净来源与受保护边界

- [x] 记录当前主工作树 HEAD、暂存区和 `CLAUDE.md` SHA-256；确认主工作树只有用户允许保留的改动，不执行 stash、reset、checkout、clean 或 add。
- [x] 在不存在的 `D2_ROOT/release` 创建 detached worktree，目标精确为候选 SHA；断言 `git status --porcelain` 为空且 `git rev-parse HEAD` 完全一致。
- [x] 对比主工作树 `CLAUDE.md` 哈希与候选提交中的版本，记录用户未提交改动未进入 release；不复制主工作树文件覆盖 worktree。
- [x] 在 release worktree 仅用锁定依赖恢复环境；后端先以非敏感、不可连接的 build-only `DATABASE_URL` 运行 `prisma generate`，再运行 Nest build生成 `dist/src/main.js`。随后仅在Jest进程内注入完整但无真实权限的测试占位env：不可连接数据库URL、足长随机测试JWT值、`.invalid` DeepSeek/OpenAI base和无效测试key；不创建`.env`、不调用外部服务。执行17 suites/81 Jest。该顺序是fresh checkout的生成物和运行时校验前置，不访问数据库、不修改候选SHA。
- [x] 再运行前端16 files/53 unit与build、Playwright9 files/51及两端已批准差分lint；任何回归阻断镜像构建。

### D2.2 候选镜像与制品身份

- [x] 只读确认 Docker daemon、Buildx 与 `linux/amd64` 可用；不改变 Docker Desktop 全局设置、不安装新依赖。
- [x] 从 release worktree 运行 `build-image.ps1`，输出到 `D2_ROOT/artifacts`；不得复用 D1 临时镜像或 archive。
- [x] 检查 architecture=`amd64`、user=`10001:10001`、workdir=`/app`、入口、Node healthcheck、revision label、Node index/amd64 digest、3个 migration 目录、4个编译脚本与10张 fixture。
- [x] 扫描镜像 history、导出清单与 tar，不得含 `.env`、uploads、coverage、Git metadata、secret 或本机绝对路径。
- [x] 记录镜像 ID（本地隔离备份 manifest 使用该不可变 `sha256:` 值）、archive 绝对路径、大小、SHA-256、Node/Prisma/OpenSSL版本及基础镜像 digest；不 push、不上传。

### D2.3 源隔离栈与本地初始化写入

- [x] 为 source 生成职责分离的 release/runtime/database/postgres/demo env。数据库密码、JWT 和 demo 密码使用一次性强随机本地值，文件只置于 `D2_ROOT/source/env`，限制为当前用户可读，不在命令、日志、QA 或 manifest 中输出。
- [x] AI key 使用不具备真实权限的测试占位值，provider base 固定到 `.invalid` 不可路由地址；禁止调用 `embedding-backfill`、`ai-preflight`、`/api/ai/search` 或 `/api/ai/chat`。
- [x] 先执行 `docker compose config --quiet` 与默认服务清单检查，再只启动 db；通过 `pg_isready` 后独立授权式运行 `migrate`。核对 `_prisma_migrations` 精确为仓库现有3个目录。
- [x] 启动 API，分别验证 `GET /api` liveness 与 `GET /api/posts?page=1&limit=1` Prisma readiness；初始化前帖子总数必须为0。
- [x] 停止 API，严格按 `seed-games` → `rebuild-tags` → `seed-demo` 顺序各运行一次，每步检查退出码并在下一步前做只读计数。该四步只验证全新隔离作品展示库；不运行 embedding，因此不声称完成生产五步初始化。
- [x] seed 后核对既有 manifest 语义：35篇帖子、5个游戏且每游戏7篇、13条评论、31条点赞、10条 File 记录、正文非空、标题不重复；`titleEmbedding` 允许为 null，因为 D2 明确禁止真实 AI。
- [x] 在 source uploads 创建唯一非产品 sentinel，记录其 SHA-256；重启并重建 API 后，数据库计数、seed 图片与 sentinel 必须保持。

任一 migration/seed 失败立即停止，不自动重跑、不切换成 `seed:demo:full`，不执行补偿性 embedding。由于全部目录均为一次性隔离路径，失败不影响开发库或生产库；失败现场保留至人工决定清理。

### D2.4 配对备份与第二栈恢复

- [x] source 写入停止后确认 migrate/seed/rebuild/embedding 工具均未运行，使用本地镜像 ID 作为 `API_IMAGE_DIGEST` 执行一次 `backup-pair.sh`；脚本停止 API 后不得自动重启。
- [x] 核对 `pg_restore --list`、`tar -tzf`、`SHA256SUMS` 与 manifest；manifest 必须记录候选 SHA、镜像 ID、3个 migration、绝对路径、大小和双 SHA-256。
- [x] restore 目录必须为空；先启动独立 restore db，不先运行 migration 或任何 seed，再通过 stdin 将 custom dump 以 `--no-owner --no-acl` 恢复到全新数据库，并把 uploads 归档解压到全新 restore uploads。
- [x] 启动 restore API，验证 liveness、`pg_isready`、Prisma readiness、3个 migration、全部数据库计数、帖子/媒体 URL、seed 图片和 sentinel SHA-256与source一致。
- [x] source 与 restore 不得并行写入；不得把 source DB、uploads 或 env 挂载给 restore。恢复结果只证明配对备份可读和本地隔离恢复可行，不授权 ECS 或生产恢复。

### D2.5 验证、证据与清理

自动门禁包括：干净 SHA、完整应用基线、镜像架构/非root/内容/secret扫描、Compose最小服务、三层健康语义、四步非AI初始化、重启持久化、配对备份、第二栈恢复及 source/restore一致性。所有命令、退出码、非敏感计数、路径、大小和哈希写入 `docs/qa/production-deployment/d2-local-image.md`；不记录env值。

运行结束必须先对两个 project 执行 `docker compose down --remove-orphans`（不带 `-v`），确认3108/3109无监听、无D2容器运行；镜像archive、source/restore目录和worktree保留供人工验收。用户确认D2后，删除属于单独本地清理授权：先验证目标绝对路径严格位于`D2_ROOT`，再移除 detached worktree、临时env/数据/备份与D2本地image tag；不得执行全局`docker system prune`或删除其他项目资源。

**自动验收：** release worktree干净；前端16/53、后端17/81、Playwright9/51及两端build通过；候选镜像amd64/非root且身份闭环；source/restore Compose、liveness、PostgreSQL readiness、Prisma readiness、初始化、持久化和恢复演练全部通过。

**人工验收：** 用户核对 archive/manifest/SHA、写入清单、数据计数、恢复证据、资源释放状态和镜像无secret扫描，再决定是否关闭D2并允许进入D3。D2确认不等于上传或ECS授权。

**失败停止/回滚：** 任一验证失败即停止后续步骤并关闭运行中的D2容器，保留隔离目录供诊断，不自动重试、删除或改代码。若证据指向D1代码/配置缺口，返回D1形成新commit并使旧候选SHA失效；若仅为本机Docker/端口/资源问题，客观记录后等待新的本地执行授权。

---

## 八、D3：ECS 主机加固与运行底座

**前置：** D2 已人工确认并保留镜像/archive/恢复证据；候选 SHA 不变。D3 只建立空主机运行底座，不上传候选制品、不启动业务 Compose、不创建数据库、不注入生产 secret。

**授权：** D3 方案确认不等于执行授权。连接`black-box-ecs`无需逐次S，但实施仍需要分步E；API_HOST、DNS、证书签发、数据库、AI、Vercel、80/443公网开放和新增付费资源不由D3整批授权自动覆盖。

### D3.0 文件、写入与证据矩阵

| 对象 | D3 计划动作 | 权限/回滚边界 |
|---|---|---|
| `docs/qa/production-deployment/d3-host-baseline.md` | 实施时创建，只记录脱敏基线、版本、owner/mode、服务与端口结果 | 不记录公网IP、出口IP、私钥路径、用户名以外凭据或secret |
| `/home/deploy/.ssh/authorized_keys` | 创建普通运维用户并复用已验证公钥 | 私钥不上传；原云账号不删除，失败时锁定新用户而非删除未知数据 |
| `/etc/ssh/sshd_config.d/00-black-box-hardening.conf` | key-only、禁止root远程和密码/交互认证 | 修改前备份；`sshd -t`与双/三会话验证失败即移除片段并reload |
| `/swapfile`、`/etc/fstab`、`/etc/sysctl.d/99-black-box-memory.conf` | 2GiB swap与`vm.swappiness=10` | 不修改云厂商`99-apsara-sysctl.conf`；项目文件按字典序后加载并覆盖，先备份来源清单与校验信息；`findmnt --verify`失败不重启 |
| `/etc/apt/keyrings/*`、`/etc/apt/sources.list.d/*` | Docker官方APT与PostgreSQL官方PGDG APT | 校验发行版、架构、签名和候选版本；不使用便利脚本 |
| `/etc/docker/daemon.json` | 默认`json-file`轮换`10m × 3` | 现有文件非空或含未知键时停止；备份、结构化合并、`dockerd --validate`后才重启 |
| `/srv/black-box/*`、`/etc/black-box` | 建立持久目录与最小权限 | 只删除D3新建且为空的目录；不写env值、不创建业务数据 |
| UFW与阿里云安全组 | IPv4 22仅可信`/32`；IPv6若启用则SSH仅可信`/128`；3389/3000/5432关闭；80/443另行授权 | 保留当前会话和IPv4/IPv6规则快照；错误时先恢复规则，不修改SSH端口或放宽来源，未授权不得使用`::/0` |

实施期间允许修改的仓库文件只有本计划、07状态、D3 QA与production planning。不得修改候选 SHA、D1部署文件、package/lock、schema/migration、业务源码、既有测试、`CLAUDE.md`或D2保留现场；不得暂存或提交Git。

### D3.1 S门禁与写入前只读基线

- [x] 连接前复核本地 D2 已关闭、候选 SHA/archive保留证据仍在且`CLAUDE.md`保护哈希不变；已收到本次固定S确认后才建立连接。
- [x] 已只读记录OS、架构、CPU/内存/磁盘、Swap、cloud-init、时间同步、failed units、脱敏监听、UFW、软件安装与APT更新计数；未保留公网地址或认证路径。最后的服务enabled/active小节因脚本语法错误未执行，按逐连接门禁未自动重连并记入QA未知项。
- [x] 已完成主机IPv6只读基线：无全局/公网IPv6、无IPv6默认路由，sshd存在`[::]:22` wildcard监听，UFW `IPV6=yes`但整体inactive且无规则。阿里云控制台IPv6安全组仍由用户核对。
- [x] 已分别运行root/deploy上下文的`sshd -T -C user=...,host=...,addr=...`；两者有效配置一致，现有`Match`指令与snippet均为0，未尝试deploy登录。
- [x] D3.1只读阶段仅记录`sshd_config`/snippet数量和有效配置，不在服务器创建备份文件；真正配置备份移至D3.2写入授权后、任何修改前执行。若后续出现不同Match覆盖，停止而不以普通`sshd -T`替代。
- [x] 用户已在阿里云控制台确认：SSH 22仅可信IPv4 `/32`；3389、3000、5432、80、443及IPv6 SSH均无入方向规则。公网IPv4 ICMP作为已批准的临时诊断例外保留；报告不保存截图、地址或安全组敏感信息。未单独批准时SSH不得对`::/0`开放；确需IPv6管理时只允许可信来源`/128`。
- [x] 经新的S授权完成补充只读采集：deploy账号不存在；APT hold为`cloud-init`与`intel-microcode`；Docker service/socket、Nginx和PostgreSQL service均not-found/inactive；无重复UID 0或额外交互普通账号；监听和IPv6基线无漂移。脚本正常输出完成标记并关闭连接。
- [ ] 若主机不是Ubuntu 22.04 amd64、cloud-init未完成、磁盘可用空间低于8GiB或使用率已达85%、存在未知监听/用户/容器/数据，或系统已有不可解释Docker/Nginx/PostgreSQL配置，立即停止；不以“新机”假设覆盖现场。

**D3.1门禁：** 已形成脱敏主基线、安全组人工结论与补充采集证据，且两次连接均已关闭；证据见`docs/qa/production-deployment/d3-host-baseline.md`。D3.1无远端写入。进入D3.2前仍必须分别取得独立E写入授权和届时新的S连接授权。

### D3.2 普通用户与SSH无锁死加固

- [x] 使用已验证root管理会话创建`deploy`及同名组，home、bash shell、0700 `.ssh`、0600 `authorized_keys`与owner均通过；源授权文件仅一个有效公钥条目，未生成或上传私钥。
- [x] deploy加入sudo组且未加入docker组；用户亲自在交互终端设置sudo密码，agent未接触或记录。root会话只核对密码状态已生效，SSH密码认证保持关闭。
- [x] 原root会话保持期间，用户经独立S授权建立第二deploy key会话并保持；身份、home、组、`sudo -v`与后续非交互sudo均通过，之后才修改sshd。
- [x] 修改前在root私有目录备份原`sshd_config`、snippet目录并生成SHA manifest；写入独立`00-black-box-hardening.conf`，固定公钥开启，密码/交互/root/X11/TCP/agent forwarding关闭。不设置`AllowUsers`，未修改IPv6安全组。
- [x] `sshd -t`通过；reload前后root/deploy各自`sshd -T -C`均断言目标值正确。仅执行`systemctl reload ssh`，未restart。
- [x] 保持root及第二deploy会话时，用户经新的S授权建立第三个全新deploy会话，key、身份、home和sudo均通过。负向登录测试未获独立S授权，因此没有实际连接，仅保留双上下文静态证据。
- [x] 第三会话成功前原root与第二deploy会话均保持；终态确认两个deploy sshd会话存在、SSH active、snippet为0600/root、备份manifest在位及APT hold不变后，agent关闭原root连接，用户随后确认两个deploy终端均已退出。全部连接已关闭，停在人工验收。

### D3.3 Swap、时间与系统更新

- [x] 只读预检确认无Swap和`/swapfile`、fstab有效、chrony为唯一active时间服务；唯一持久swappiness定义是`/etc/sysctl.d/99-apsara-sysctl.conf`中的0。APT模拟为58升级、0新增、0删除、cloud-init kept back；预计下载46.85MiB、磁盘变化约-0.01MiB，无运行时kernel image/modules计划且当前无reboot marker。证据见`docs/qa/production-deployment/d3-system-precheck.md`。
- [x] **门禁A（独立E）：Swap写入。** 写入前复核现场未漂移，在root私有唯一目录备份fstab、云厂商sysctl文件及完整swappiness来源清单并记录SHA。以`fallocate`创建2GiB`/swapfile`、`0600 root:root`，`mkswap`后先`swapon`，验证`free`与`swapon --show --bytes`。
- [x] 重复项检查通过后仅向fstab追加`/swapfile none swap sw 0 0`并运行`findmnt --verify --verbose`。保持`99-apsara-sysctl.conf`内容和哈希不变；创建项目独立`99-black-box-memory.conf`写入`vm.swappiness = 10`，验证加载顺序后执行`sysctl --system`，最终运行值为10。
- [x] 门禁A已人工验收并关闭；备份、权限、fstab唯一性、findmnt、项目/云厂商配置、运行swappiness、swapon/free均有证据。重启持久性明确留D3.6，不在本门禁宣称通过。
- [x] **门禁B（新的独立E）：软件包更新。** 刷新后模拟与已审查的58包、候选版本、0新增/0删除完全一致；经用户独立授权执行一次普通`apt-get upgrade`。首次比较器顺序误报在写入前停止，修正后经用户再次明确允许执行成功，失败证据保留。
- [x] `cloud-init`、`intel-microcode`hold保持不变；未执行unhold、dist/full/release upgrade。原deploy会话保持；`dpkg --audit`、hold、SSH active、`sshd -t/-T -C`、failed units、时间、Swap和reboot marker均通过。
- [x] OpenSSH升级后已通过受控alias建立全新deploy会话，三项OpenSSH包达到目标版本，SSH/chrony active+enabled。无reboot marker；未重启，Swap重启持久性仍留D3.6。当前停在D3.3整体验收，不进入D3.4。

**回滚：** Swap持久化失败时恢复fstab和唯一sysctl来源备份、重新应用sysctl，并在内存允许时`swapoff /swapfile`后删除仅本批创建的文件；若`swapoff`失败则保留并停止。系统包升级不自动降级，失败时保留APT日志和现状，不继续安装Docker。

### D3.4 官方软件源与宿主工具

- [x] 安装前施工清单已基于Docker、Ubuntu、Certbot和PGDG官方契约形成，明确key/source路径、顶层包、服务启动副作用、1GiB软件+1GiB Docker初始数据保守预算、安装前精确模拟停点及回滚边界；见`docs/qa/production-deployment/d3-software-install-plan.md`。本项不授权写入。
- [x] Docker严格按Docker官方Ubuntu APT仓库配置keyring和deb822 source，不使用`get.docker.com`便利脚本。已选择并记录同一stable发布组的Engine/CLI/containerd/Buildx/Compose精确版本，安装前包清单无漂移。
- [x] 已安装`docker-ce`、`docker-ce-cli`、`containerd.io`、`docker-buildx-plugin`、`docker-compose-plugin`；未安装Docker Desktop、rootless套件或额外插件。`deploy`未加入docker组，Docker daemon操作继续使用经授权的`sudo docker ...`。
- [x] 已验证`systemctl is-active/is-enabled docker`、root上下文`docker version/info`、`docker buildx version`与`docker compose version`。按本次用户明确授权不运行`hello-world`、不拉镜像，也不执行prune。
- [x] Nginx使用Ubuntu 22.04受支持仓库的`nginx`包；安装后root上下文`nginx -t`通过并`systemctl disable --now nginx`，D5前inactive/disabled且80/443无监听。package默认站点不对外服务，D5配置正式站点时再替换接线。
- [x] ACME客户端使用Certbot官方推荐snap口径；复用既有snapd并安装`certbot --classic` 5.7.0。本批未申请证书、未运行renew、未访问`API_HOST`或改Nginx。
- [x] PostgreSQL工具使用PGDG并仅安装`postgresql-client-16`/client-common及授权的`libpq5`升级；未安装宿主server。`psql/pg_dump/pg_restore`均为16.14。

**D3.4预检实测（2026-07-20，安装前快照）：** Docker与PGDG的Jammy/amd64独立keyring、deb822 source和APT update已完成，fingerprint、权限、来源均通过。精确只读模拟结果为：Docker五包`0升级/5新增/0删除`（84.999 MiB下载、337.140 MiB安装占用，推荐的rootless extras未进入集合）；Ubuntu Nginx`0升级/9新增/0删除`（0.669 MiB下载、2.293 MiB安装占用）；PG client 16为`1升级/2新增/0删除`（2.192 MiB下载、净增9.914 MiB），其中现有`libpq5`从Ubuntu 14.23升级到PGDG 18.4，未引入宿主server。snapd已存在，Certbot stable为5.7.0/77.1MB。该段只描述实际安装前状态；完整证据见`docs/qa/production-deployment/d3-repository-preflight-report.md`。

**D3.4安装实测（2026-07-20，已人工验收关闭）：** 安装前模拟无漂移后，已使用精确版本和`--no-install-recommends`安装Docker五包、Ubuntu Nginx、PGDG client 16及Certbot 5.7.0 stable。Docker/containerd为active+enabled，deploy未加入docker组且非sudo访问被拒；Nginx root配置测试通过后已收口为inactive+disabled，80/443无监听；PG工具均为16.14、无宿主server/5432；Certbot未申请证书且未改Nginx。`dpkg --audit`、failed units、hold、Swap、磁盘及reboot marker正常。原始证据已在仓库外保全并逐项校验，远端临时脚本/证据已按授权删除；见`docs/qa/production-deployment/d3-software-install-report.md`与`d3-software-evidence-closeout.md`。
- [x] 基础工具仅限`ca-certificates`、`curl`、`gnupg`、`jq`、`openssl`、`tar`与`rsync`等部署/审计必需项，均已只读确认安装；未安装Node构建链、桌面、RDP、面板、Redis或监控平台。

**来源证据：** Docker使用[官方Ubuntu安装](https://docs.docker.com/engine/install/ubuntu/)；OpenSSH按[Ubuntu Server文档](https://documentation.ubuntu.com/server/how-to/security/openssh-server/)执行`sshd -t`和独立snippet；PostgreSQL 16客户端使用[PGDG Ubuntu仓库](https://www.postgresql.org/download/linux/ubuntu/)；安全组遵循[阿里云ECS安全组](https://help.aliyun.com/zh/ecs/user-guide/start-using-security-groups)。

### D3.5 持久目录、日志与网络暴露

**只读预检实测（2026-07-20）：** 目标目录均不存在、UID/GID 10001未占用、根盘使用16%且约33.70GB可用；Docker无容器/镜像且`/etc/docker/daemon.json`不存在，Nginx现有logrotate有效，UFW inactive/空规则。监听仅有SSH和系统基础服务，无80/443/3000/3389/5432。Compose policy 7项通过，API仅发布loopback、数据库无宿主端口。完整脱敏证据与两个独立门禁见`docs/qa/production-deployment/d3-persistence-network-preflight.md`。

- [x] 已创建`/srv/black-box/releases`为`deploy:deploy 0750`供后续SCP落地；`compose`为`root:root 0755`；`backups`和`/etc/black-box`为`root:root 0700`。本批未创建任何env文件。
- [x] `uploads`已预置为UID/GID`10001:10001`、目录`0750`，只给候选API最小读写。`postgres`保持`root:root 0700`空目录；D4加载精确PostgreSQL镜像后再inspect其实际UID/GID并授权，D3不凭空写死。
- [x] 原先不存在的`/etc/docker/daemon.json`已原子创建，只含`json-file`、`max-size=10m`、`max-file=3`；临时和最终配置均通过`dockerd --validate`，Docker restart后active+enabled且无新监听。Compose自身仍保留每服务`10m × 3`。
- [x] Ubuntu Nginx既有logrotate哈希前后不变，未复制第二套规则；根盘仍为16%且约33.70GB可用，不在D3引入监控平台。
- [x] 门禁A仓库外证据保留；四个远端临时路径经固定路径、SHA-256与manifest复核后精确删除。`/etc/sudoers.d/90-black-box-deploy-cache`仅启用deploy全局120分钟timestamp，不含`NOPASSWD`；正向跨会话与`sudo -K`后的负向验证均通过，密码只由用户在交互终端输入。
- [x] 启用UFW前保存脱敏`ufw`、iptables/ip6tables/nft和监听证据；用户在原会话静默输入可信`ADMIN_CIDR`并与当前SSH来源匹配，真实地址不进入仓库、脚本、argv、环境、history或QA。唯一IPv4 `/32`到22/tcp规则添加后才启用UFW，第二个新deploy会话的key与sudo防锁死验证通过。
- [x] UFW active且默认deny incoming/allow outgoing/deny routed，保留`IPV6=yes`但无IPv6 SSH allow；安全组未修改，3389、3000、5432及Docker API端口均未开放。Compose后续仍必须只发布`127.0.0.1:3000`，PostgreSQL不发布宿主端口；UFW不替代绑定契约。
- [ ] 80/443开放拆为独立E授权：未授权时UFW和安全组均保持关闭，D3主机底座仍可验收；若本批另获授权，则只增加TCP 80/443公网规则并立即复核，实际Nginx/证书和公网服务仍留D5。

### D3.6 重启持久性与关闭门禁

- [x] 重启前已运行`sshd -t`及root/deploy上下文、`nginx -t`、`dockerd --validate`、`findmnt --verify`，确认deploy新会话、sudo、swap、时间、Docker、目录和UFW均通过；failed units为空。监听门禁按协议与进程归属核对：TCP仅22/53；UDP仅允许systemd-resolved 53、systemd-networkd DHCP 68与回环chronyd 323，其他端口失败。资源满足门禁，`findmnt`仅报告swapfile为普通文件的预期warning。完整矩阵见`d3-reboot-precheck-report.md`。
- [x] 用户独立授权后仅执行一次操作系统重启；首次轮询即恢复deploy key登录，boot ID变化且首次恢复uptime为19.02秒。未执行第二次reboot、shutdown、实例停止或控制台电源操作。
- [x] 重连后已验证deploy key/sudo、root/password禁用有效值、2GiB swap与swappiness持久、Docker自动启动、Nginx仍停止、UFW规则、时间同步、目录矩阵及无Web/数据库/Docker API监听；failed units为空，资源满足门禁。
- [x] 配对证据已下载到仓库外并完成归档SHA、tar与内部manifest验证；用户人工验收通过后，登记临时脚本、marker和已归档远端证据均按精确路径清理，正式配置复核无漂移，deploy sudo缓存与SSH连接已清零。D3.6与D3整批正式关闭，未上传候选镜像或实施D4。

### D3 自动与人工验收

- **自动证据：** Ubuntu22.04/amd64、cloud-init完成；IPv4/IPv6分配、路由、监听、UFW与安全组基线；deploy三会话无锁死；`sshd -t`及root/deploy各自的`sshd -T -C`；2GiB swap与重启持久；Docker version/info、Buildx与Compose（按授权不运行`hello-world`）；Nginx config且服务停止；Certbot和PostgreSQL client 16版本；目录owner/mode；Docker日志轮换；系统无failed unit；磁盘满足阈值。
- **人工门禁：** 用户已核对软件来源和版本、sudo策略、SSH未锁死、原账号仍在、80/443保持关闭、安全组与UFW暴露面、无新增付费资源，并确认 D3 整批通过。D4仅可在专项施工方案再次通过后逐门禁执行。
- **停止与回滚：** 未知现场立即停止；SSH失败从保留会话恢复snippet；UFW失败恢复规则；Docker配置失败恢复`daemon.json`备份；swap失败恢复fstab。包安装成功后不自动降级，目录只删除D3新建且为空者；不删除原用户、系统数据或D2现场。

---

## 九、D4：镜像落地、PostgreSQL与全新生产库初始化

**前置：** D3确认；用户确认目标库确为未承载用户数据的全新作品展示生产库。

**授权：** E + DB + AI。受控alias连接无需逐次S；E、每个DB步骤和每个AI步骤继续独立授权，禁止整批自动连续执行。

**专项施工入口：** `docs/qa/production-deployment/d4-construction-plan.md` 已基于D1真实Compose、D2保留制品与D3终态形成 D4.0～D4.8 逐门禁方案并通过人工评审。D4.0 已人工验收关闭；当前仅授权 D4.1 的四项制品上传、原子落盘、bundle 展开、API archive 导入和指定 PostgreSQL digest 单次拉取。secret、Compose启动、数据库、uploads 与 AI 动作仍按后续 E/DB/AI 独立门禁执行。

### D4.1 制品与secret

**候选失效回填：** 旧候选的API镜像尚未导入，但四项制品已落到远端旧SHA release目录，唯一失败staging保留。不得覆盖、删除、现场转码或与后续新SHA混用；远端清理另需独立E授权。新候选提交必须包含`*.sh text eol=lf`发布源契约，并在构建前证明Git blob、干净worktree和bundle三层字节一致、CRLF为0、Linux `bash -n`与部署脚本测试通过。

**Bundle生成链回填：** D4实际命令是`git archive --format=tar.gz --output=<唯一.part> <RELEASE_SHA> deploy/production`，成功后原子rename；没有checkout/index export或中间源码目录。旧SHA在系统级`core.autocrlf=true`且attributes未指定时，直接archive与实际bundle整体SHA及3个Shell逐文件SHA完全一致，均为CRLF；`git -c core.autocrlf=false archive`则与Git blob完全一致为LF。正式流程继续使用直接Git object archive，但必须由`.gitattributes`和实际archive自动化测试锁定字节，不依赖执行机全局Git配置。

- [x] 管理SSH已迁移至TCP 2222；受控alias固定为deploy身份与该端口。TUN保持开启并通过已验证的ECS专属规则进入代理策略组；部署期间保持当前节点不变。代理出口若变化立即暂停，不增加来源或放宽规则。UFW与安全组仅允许批准代理出口IPv4 `/32`到2222，公网22及其他业务端口保持关闭。
- [x] SFTP和SSH命令统一使用`black-box-ecs`，无逐次S门禁；上传、加载、目录写入仍只由本批明确E授权覆盖。一次SFTP失败即停，不自动重试或切legacy SCP。
- [x] 上传image archive、compose、scripts和模板到按`RELEASE_SHA`隔离目录；服务器计算SHA并与本地manifest一致后才`docker load`。
- [x] 用户亲自在`/etc/black-box/runtime.env`、`database.env`、`demo-seed.env`、`embedding.env`、`ai-preflight.env`、`postgres.env`及非secret `release.env`注入对应最小变量；secret文件权限0600，执行者只运行“变量名存在/格式通过”校验，不打印值。
- [x] 明确`DEEPSEEK_MODEL=deepseek-v4-flash`、embedding模型`text-embedding-3-small`、`TRUST_PROXY=one-hop`、生产URL参数和PostgreSQL16 digest状态。
- [x] 生产embedding固定使用302.AI OpenAI-compatible API，base URL包含版本段且由调用方追加`/embeddings`；禁止OpenAI官方直连、供应商/模型自动切换或在证据中记录真实endpoint/key。

**D4.2 实测回填（2026-07-22）：** 七个env文件已按职责原子创建，六个secret文件为`root:root 0600`、`release.env`为`root:root 0644`；变量集合、非空、URL/模型/超时/JWT强度、跨文件一致性以及Compose 8服务/7项最小权限均仅以PASS/FAIL完成验证。固定PostgreSQL镜像在无网络、无挂载容器中实测为UID/GID `999:999`，`/srv/black-box/postgres`仅在确认空目录后由`root:root 0700`收敛为`999:999 0700`并保持为空。未启动Compose、API或数据库，未执行migration/seed/AI/embedding，3000/5432无监听；用户已确认最终注入的是供应商侧已轮换、未在聊天中暴露的新key，D4.2人工验收关闭。

### D4.2 PostgreSQL容器

- [x] 按专项施工编号D4.3取得E+DB-0授权后只启动db，验证`pg_isready`、内存参数、bind mount和5432未发布。
- [x] 创建初始化前B0空库dump与空uploads归档，记录SHA并独立验证；B0明确不是上线后业务备份，不能省略后续配对备份。

**D4.3 DB-0实测回填（2026-07-22）：** 固定PostgreSQL 16镜像首次启动成功，容器postgres用户与D4.2实测`999:999`一致，批准bind mount生效，health为healthy，生产内存参数匹配Compose，宿主未发布5432。数据库中`_prisma_migrations`与public业务表均不存在，未自动执行migration。唯一B0 custom dump、空uploads归档、manifest及内部SHA通过`pg_restore --list`、`tar -tzf`与`sha256sum -c`；终态仅db运行，API/tools为0。用户已人工验收通过并独立授权D4.4 DB-1；该授权不包含任何seed、AI或embedding动作。

**D4.4 DB-1实测停点（2026-07-22）：** 唯一一次`prisma migrate deploy`退出0，精确三条migration均完成且无failed/rolled-back；10个public表（含migration表）存在，9个业务表数据为空。B1 custom dump、空uploads归档、manifest、绝对路径/大小/SHA及三条migration通过独立校验；API `/api`与`/api/posts?page=1&limit=1`真实空分页通过，3000仅在验证期间绑定loopback并已关闭。阻塞项是API不响应SIGTERM：默认停止及独立60秒停止复验均以137结束，`OOM=false`、restart=0；终态仍为db-only healthy、受保护监听0。不得以放宽断言绕过，修复需新的候选发布链；DB-2不得开始。

**D4.4关闭回填（2026-07-23）：** 上述历史阻塞已由08生产发布修复批次关闭。FIX候选完成本地与生产SIGTERM exit 0、backup边界、同SHA制品、隔离直接恢复、生产只读兼容、API切换和“F6 release / pre-DB2”远端/本地配对备份，并获用户最终人工验收。D4.4关闭时FIX API与原db healthy，三条migration保持原样、九张业务表为空，B0/B1/pre-DB2恢复点有效；这是D4.5-A2写入前历史快照。D4.4正式完成，不重跑migration。

### D4.5及后续初始化门禁

第1步migration已在D4.4完成并冻结；D4.5从第2步`seed-games`开始。以下顺序继续保留全链路语义，但不得重跑第1步。

1. **Migration（DB授权1）**
   - 运行tools profile migrate，执行`prisma migrate deploy`。
   - 非零停止；成功后运行`migrate status`，启动loopback API并分别验证liveness和Prisma readiness。
2. **Seed games（DB授权2）**
   - 详细施工与只读预检采用`docs/qa/production-deployment/d4-db2-seed-games-plan.md`。
   - 取得独立授权后先停止API，确认运行中仅原db，再通过tools profile唯一一次执行`node dist/src/scripts/seed-games.js`。
   - 核对固定5个游戏的名称、描述与空cover；其余8张业务表、三条migration和uploads必须不变。
   - 脚本为顺序upsert而非单事务；异常立即停止并保留可能的前缀写入，不自动重跑、restore或进入DB-3。成功后API也保持停止，等待人工验收。

   **D4.5-A1只读预检回填（2026-07-23）：** FIX API与原db身份、health、loopback空分页、三条migration、九表空库、远端/本地pre-DB2恢复点、空uploads、资源阈值及无写工具全部通过。首次综合脚本因`docker exec`未附加stdin而未产生SQL行；只补采一次`docker exec -i`只读事务后取得完整计数，未发生数据库写入。用户已人工验收A1并独立授权A2唯一一次写入。

   **D4.5-A2执行边界：** 先停止API并确认优雅退出，只允许原db与唯一seed-games tool；命令只执行一次。成功后API保持停止并等待人工验收。D4.5-B继续专指下一个DB-3 `rebuild-tags`门禁，A2成功不自动授权B。

   **D4.5-A2实施回填（2026-07-23）：** 受审命令仅调用一次；Docker events证明唯一seed-games one-off以`exitCode=0`退出并销毁。数据库精确生成5个批准游戏、名称唯一，其他8张业务表为0，3条migration与空uploads未变化；API保持停止、原db healthy。SSH stdin被Compose消费导致外层未打印计划退出变量，按禁止重跑约束仅用独立只读事件和数据终态补证。用户已人工验收通过A2；D4.5-B未授权或执行。
3. **Rebuild tags（DB授权3）**
   - 执行前只读断言Post=0、PostTag=0；不满足即取消授权并停止。
   - 执行`node dist/src/scripts/rebuild-tags.js`，核对5个内容类型。
   - 该脚本非单事务且对已有帖子有破坏性；失败恢复空库备份或重建空库，不自动重试已有库。

   **D4.5-B方案/预检回填（2026-07-23）：** FIX脚本真实顺序为PostTag全删→Tag全删→createMany五类，无外层事务；五类精确为资讯、攻略、求助、评测、活动。生产只读门禁确认原db healthy、API停止、3 migration、5 Game、Post/PostTag/Tag=0、其他业务表和uploads为空、pre-DB2两端恢复点完整。唯一写命令、失败回到seed-games之前的恢复边界及DB-3人工验收后独立创建B2的方案见`docs/qa/production-deployment/d4-db3-rebuild-tags-plan.md`。

   **D4.5-B实施回填（2026-07-23）：** 唯一受审命令实际调用1次，退出码0；Docker events锁定单一rebuild-tags one-off的create/attach/start/die(0)/destroy链。Tag精确生成5类且唯一，PostTag和其他非目标业务表仍为0，5 Game、3 migration、uploads及pre-DB2恢复点未变化；API保持停止、原db healthy。用户已人工验收通过DB-3，并独立授权仅创建、验证与下载B2；seed-demo仍未授权。

   **B2首次执行暂停（2026-07-23）：** 唯一获授权的B2外层门禁脚本在调用FIX `backup-pair.sh`时，因readonly变量与同名临时环境赋值冲突而退出1。失败早于备份目录创建、API stop、dump与导出；未生成complete/`.incomplete`或本地副本。按失败即停约束未自动修正或重跑，等待独立恢复授权；seed-demo未执行。

   **B2恢复与下载暂停（2026-07-23）：** 获授权后只修正外层变量传递并更换唯一目标，FIX备份工具未修改。远端B2四项、内部SHA、dump/tar、manifest/权限与数据快照完整通过，无`.incomplete`。唯一默认SFTP下载在本地超时后原进程最终退出，只留下0字节`database.dump`；未重试、未切legacy SCP、未删除远端导出。当前远端恢复点有效但本地异机副本未闭环，等待独立传输恢复决策；seed-demo未执行。

   **B2 retry1暂停（2026-07-23）：** 用户仅授权恢复本地副本并要求先单独清除sudo timestamp。唯一SSH会话在本地超时且未返回`sudo -K`或负向验证标记，原SSH子进程随后自行退出。按再次超时即停约束未继续远端复核、未创建retry1目录或发起SFTP；sudo缓存状态未知，seed-demo未执行。

   **B2 retry2暂停（2026-07-23）：** 再次获授权后，修正命令明确取得`sudo -K=0`及`sudo -n true=1`，遗留timestamp已清除。随后固定路径的远端B2四项只读复核会话非零且无输出，无法形成本次大小/SHA一致性证据；按失败即停未创建新本地目录、未发起SFTP、未修改远端B2或进入seed-demo。

   **B2 retry3暂停（2026-07-23）：** 用户重新建立sudo缓存后，`sudo -n true`退出0。唯一受控导出会话在首个正式B2文件的SHA输出解析处因`cut`参数错误退出1，早于远端导出目录创建和文件复制；未执行sudo清除、本地retry1目录创建或SFTP，seed-demo未执行。

   **B2 retry4暂停（2026-07-23）：** 再次验证sudo缓存有效后，修正版在首项正式B2大小/SHA断言后的`printf`输出处被远端shell误解释为管道并退出1；仍早于`install -d`。未形成远端导出、本地retry1或SFTP，seed-demo未执行。

   **B2 retry5暂停（2026-07-23）：** 全部远端动作改为独立命令后，前三项文件大小/SHA及`SHA256SUMS`存在性均匹配；`SHA256SUMS`独立`stat`命令超时。未创建导出或本地retry1、未发起SFTP；获批安全收尾确认sudo timestamp已清除，seed-demo未执行。

   **B2 retry6完成与关闭（2026-07-23）：** 受控自主模式下，已审查一次性脚本完成正式B2四项固定身份复核、deploy-owned 0700/0600导出和源/导出一致性验证。唯一默认SFTP首次成功下载至仓库外全新retry1目录；本地四项大小/SHA、内部清单、98行dump清单、空uploads归档及manifest语义全部通过。用户已人工验收通过B2；正式恢复点和本地副本保留，seed-demo未执行。
4. **Seed demo（DB授权4）**
   - 先创建数据库+uploads配对备份。
   - 执行`node dist/src/scripts/seed-demo-posts.js`；核对文件补偿报告、35帖、5作者、评论/点赞/文件和图片。
   - D4.6施工与只读预检采用`docs/qa/production-deployment/d4-db4-seed-demo-plan.md`。正式调用必须独立授权并只执行一次；仅允许db与唯一seed-demo one-off，API保持停止。
   - 成功矩阵固定为5作者、35 Post、35 PostTag、13 Comment、31 UserLikePost、10 File、20个uploads媒体和0条embedding；5 Game、5 Tag与3 migration不变。
   - Prisma transaction只覆盖数据库；脚本先生成/复用媒体并记录本次新建路径，失败仅补偿本次新增文件。补偿失败必须非零并报告精确残留，不得自动重跑、restore B2或进入B3/embedding。
   - **D4.6方案/只读预检回填（2026-07-23）：** B2已人工验收并关闭；正式恢复点与本地副本复核不变，deploy导出已按四个固定文件和空目录精确清理。生产只读事务确认3 migration、5 Game、5 Tag，其余业务与embedding为0；API停止、仅原db healthy、uploads空。demo env、Compose、FIX镜像三个seed模块、10 fixtures及资源门禁通过，临时无网络只读审计容器已全部销毁。当前等待独立DB+uploads写入授权，`seed-demo`未执行。
   - **D4.6唯一写入回填（2026-07-23）：** 用户人工验收方案/预检后独立授权一次DB+uploads写入。正式seed-demo命令实际调用1次、退出0；唯一one-off为create/attach/start/die(0)/destroy。自动核验得到5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、20媒体/404899 bytes、0 embedding，5 Game、5 Tag、3 migration及B2不变；API停止、原db healthy、无tool残留。用户已人工验收通过DB-4，B3和AI/embedding仍未授权。
5. **AI预检与embedding（AI授权1 + DB/AI授权5）**
   - 先运行`ai-preflight`：DeepSeek最小流式完成；兼容embedding返回1536个有限值。香港不支持的OpenAI官方直连或任何绕行均阻断。
   - 报告预计待处理35条与成本，经用户确认后运行无参数`backfill-embeddings.js`。
   - 任一失败最终非零；只重跑null补缺，不使用`--all`产生无收益调用。
   - **D4.7-A / AI-1方案：** 真实service为`ai-preflight`，只读取`ai-preflight.env`并加入`egress_net`；不取得数据库、JWT、seed密码或uploads。正式命令最多调用一次DeepSeek最小流式请求与一次302.AI embedding请求，脚本无自动重试，deadline覆盖完整body/stream；一旦one-off create/start即禁止重跑。方案、费用上限与只读门禁见`docs/qa/production-deployment/d4-ai1-preflight-plan.md`。
   - **D4.7-A只读预检回填（2026-07-23）：** FIX与安装脚本身份、8项env、供应商/模型/超时格式、Compose最小权限、API stopped/仅db healthy、DB-4数据、20媒体、远端及本地B2、资源和通用DNS/TLS全部通过；供应商业务请求0。当前等待独立AI费用授权，不自动进入D4.7-B或embedding backfill。
   - **D4.7-A唯一正式调用回填（2026-07-23）：** 用户人工验收方案/无费用预检后独立授权一次正式调用。Compose命令实际调用1次、退出0；DeepSeek流完整、1578ms，302.AI embedding为1536维全有限、591ms。唯一one-off按create/attach/start/die(0)/destroy结束；DB-4、20媒体和B2均不变，API停止、原db healthy。AI-1已人工验收通过；该结果不自动授权D4.7-B和35帖embedding。
   - **D4.7-B方案/只读预检回填（2026-07-23）：** 真实入口、无参数补null模式、最多35次调用、最小env/网络、部分失败和B3边界见`docs/qa/production-deployment/d4-db5-embedding-backfill-plan.md`。生产只读门禁确认35条null、0条non-null，标题合计722字符/2070 UTF-8 bytes，DB-4、20媒体、B2、容器与资源无漂移，供应商请求0。当前FIX脚本缺少覆盖完整body的独立deadline与写库前1536维/有限值校验；正式DB-5 + AI-2授权不可执行。主线在此暂停并转入09独立安全修复；新候选完成完整回归、制品链、隔离restore、ECS全新release及零写入预检后，才可重新申请联合AI+DB授权。

### D4.5及后续初始化终态

- [ ] 只读核对帖子35、正文非空、标题无重复、5游戏各7、embedding35/35且1536维，以及评论/点赞/文件/磁盘图片与manifest一致。
- [ ] 重启db/api，确认数据与uploads保持；cleanup仅dry-run并要求orphan=0或每项可解释。
- [ ] 创建初始化完成后的配对备份，完成`pg_restore --list`、`tar -tzf`和下载到用户本机仓库外。
- [ ] 本批连续SSH/SCP操作结束后断开并记录连接已关闭；重连仍使用同一受控alias，不改变写入授权范围。

**人工验收：** 每一步分别审退出码、只读计数和备份；D4整批确认前不配置公网Nginx切流。

**失败停止/回滚：** 按07 §7.3与§12恢复最近配对点。embedding供应商失败不回滚已seed数据，但发布不放行。不得执行cleanup apply。

---

## 十、D5：API_HOST、HTTPS、真实IP、限流、uploads与SSE

**前置：** D4数据和备份获确认；API只在loopback可用。

**授权：** DNS(API_HOST) + E。SSH/DIRECT连接无需逐次授权，但不替代DNS/E；不得创建Vercel Production或前端DNS。

### D5.1 API DNS与证书

- [x] TUN保持开启，首次SSH及任何重连统一使用受控alias；连接失败暂停核对DIRECT规则，不自动改变网络或认证配置。
- [x] 用户设置`API_HOST` A记录到ECS公网IPv4并确认TTL；报告只写参数名和解析是否一致，不记IP。
- [x] 渲染Nginx模板到宿主配置，`nginx -t`通过后启用服务。
- [x] 申请API_HOST证书、启用HTTP→HTTPS并运行续期dry-run；standalone续期使用受控pre/post hook停止并恢复Nginx。

### D5.2 四层健康

- [x] `/api`仅断言Nest liveness。
- [x] Compose内部`pg_isready`断言PostgreSQL readiness。
- [x] loopback和公网`/api/posts?page=1&limit=1`分别断言真实Prisma readiness。
- [x] db healthy但Prisma readiness失败时必须判部署失败。

### D5.3 安全与功能

- [x] 从授权origin与相似未授权origin验证精确CORS。
- [x] 同一来源伪造不同X-Forwarded-For不能绕过登录限流；ECS本地与外部来源不应被错误合并。结合安全组人工证据、UFW和宿主监听确认3000/5432未公开。
- [x] 验证帖子媒体URL、既有5MB应用契约与6MiB Nginx限制；重建API容器后文件仍在。
- [ ] 对Chat检查`text/plain`、`x-vercel-ai-data-stream:v1`、`0:/8:/d:`，错误时`3:`；浏览器确认逐步流式而非末尾一次返回。
- [ ] 验证Search/Chat有限完成或有限失败，没有永久loading；限额内协议不变，429使用现有反馈。
- [x] 本批远程操作结束后断开SSH并通知用户“本轮 SSH 操作完成，连接已关闭”；连接失败或中断先请用户核对DIRECT规则，不关闭TUN，也不触发安全组、密钥、sshd或认证方式变更。

**自动验收：** Nginx/证书、CORS、端口、健康分层、真实IP防伪、限流、上传、SSE头与持久化结果写入D5报告。

**人工验收：** 用户从真实浏览器验证登录、图片、Search与Chat；确认无console error、mixed content或流式缓冲。

**失败停止/回滚：** DNS可回退原记录；Nginx保留上一已验配置；证书失败不启用443。API镜像问题切回上一镜像和对应配置，不动已验收数据。

---

## 十一、D6：Vercel、FRONTEND_HOST、同SHA切流与回滚

**前置：** D5获确认；`RELEASE_SHA`已推送到用户批准的Git remote；API_HOST稳定。

**授权：** Git push、V、DNS(FRONTEND_HOST)分别确认；修改ECS上的`FRONTEND_ORIGIN`和重启API还需要E。受控alias连接无需逐次S，Vercel凭据由用户持有。

### D6.1 项目与构建

- [x] Vercel项目Root Directory=`frontend/black_box`、Framework=Vite、Build=`pnpm build`、Output=`dist`。
- [x] Production注入`VITE_API_BASE_URL=https://API_HOST/api`；Preview注入失败关闭地址，不访问生产API。
- [x] 从精确`RELEASE_SHA`创建deployment，不能只选择production branch最新状态。
- [x] 从deployment metadata核对source commit SHA完全一致，记录deployment ID、immutable URL、Production alias和构建变量“名称/scope/已校验”状态。

### D6.2 前端域名与CORS

- [x] 用户按Vercel要求配置`FRONTEND_HOST` DNS并完成TLS。
- [x] TUN保持开启并统一使用受控alias；修改ECS配置仍以本批E授权为前置，会话中断后的重连不得扩大既有写入范围。
- [x] 将后端`FRONTEND_ORIGIN`设为最终`https://FRONTEND_HOST`，重启API后重新验证readiness和精确CORS。
- [x] 在正式alias切流前验证immutable deployment的SPA深链、静态资源和API请求。
- [x] ECS远程修改完成后断开并通知用户“本轮 SSH 操作完成，连接已关闭”。

### D6.3 Release pair

- [x] release manifest 将同一SHA的后端image digest与Vercel deployment ID/URL成对记录。
- [x] 记录上一后端镜像、上一Vercel deployment和兼容数据库恢复点。
- [x] 用户明确授权后才把Production alias切到新deployment；切流后已完成Login、Home、匿名守卫、SPA深链与API只读烟测。生产数据中不存在历史固定帖子ID，因此不把不存在帖子视为链路失败。

**人工验收：** 用户核对同SHA证据、Production/Preview隔离、域名TLS、CORS和回滚目标。

**失败停止/回滚：** Vercel切回上一deployment，后端按release pair兼容性决定是否同步切回。DNS只回退到记录过的原值；不临时放宽CORS到`*`或Preview域名。

---

## 十二、D7：生产全链路与多视口最终验收

**前置：** D6切流完成。D7不得修改产品代码、schema、e2e或部署架构。

**授权：** 本地/浏览器只读验证默认可执行；任何ECS远程审计需要S。注册、上传、点赞/评论等明确测试写入由用户确认测试账号和范围，AI真实调用单独计费确认。

### D7.1 自动矩阵

- [x] TUN保持开启；读取ECS版本、日志、容器或端口时统一使用受控alias，无逐次S门禁，审计保持只读。
- [x] 从`RELEASE_SHA`干净worktree再次运行前端16/53、后端Linux/amd64 21/102、Playwright9/51、两端build和差分lint。
- [x] 复核受保护文件、`CLAUDE.md`、schema/migrations、lock和9个e2e未漂移。
- [x] 复核image digest、Vercel source SHA、migration status、备份SHA和生产配置静态扫描。

### D7.2 四视口

当前9页在1440×1000、900×1000、390×844、320×740生成36张Production默认态截图：Home、Search、PostDetail、Compose、Chat、Mine、Login、MyPosts、MyLikes。只做人工/截图回归，不新增CSS、DOM或像素Playwright断言。

### D7.3 真实链路

- [x] 登录、refresh与RequireAuth完成生产实测；注册、退出沿用既有人工验收和9/51行为回归，未为重复证明再创建账号或退出当前验收会话。
- [x] Home `tag×game` AND、第二页加载、详情返回和滚动恢复完成生产实测。
- [x] Compose Markdown、图片上传、详情媒体、点赞、评论、回复、删除反馈完成受控生产实测；仅永久保留一篇测试帖及其媒体，社交写入净增为0。
- [x] Mine我的发布/收藏、详情和取消点赞一致性完成生产实测；头像时序与个人列表分页由既有人工验收和9/51行为回归锁定。
- [x] Search真实embedding有限时间成功；有限失败和可重试错误态沿用既有生产人工验收及自动测试证据。
- [x] Chat JWT、SSE、assistant Markdown与引用chip完成生产实测；检索失败降级和客户端有限失败沿用既有生产人工验收及自动测试证据。
- [x] API重启后数据库/uploads保持、Preview fail-closed和SPA深链刷新均由D5/D6证据及D7只读终态复核闭环。

### D7.4 资源与安全

- [x] CPU/内存/Swap/磁盘/容器日志稳定；无OOM、持续Swap或磁盘越线。
- [x] 安全组/监听仍只有设计允许项；日志无Authorization、secret、连接串或请求正文。
- [x] cleanup仅dry-run；生产数据计数与测试写入记录可解释。
- [x] D7远程审计完成后断开并记录连接已关闭；中断后仍可通过受控alias重连，未改变只读审计边界。

**人工验收：** 用户逐项确认真实浏览器、36张截图和写入清单。D7只能标“已执行，待人工验收”，不得自行宣告生产验收通过。

**失败停止/回滚：** 真实缺口回到最早责任批次；不在D7临时开发。严重安全/数据问题立即停写并按release pair/配对备份回滚。

---

## 十三、D8：备份、监控、费用、运维交接与下线口径

**前置：** 用户明确确认D7通过。

**授权：** 远程连接统一使用受控`black-box-ecs` alias，无逐次S门禁；备份、监控配置和交接写入属E，任何快照/EIP/OSS/COS属C，最终下线属R。本批不自动创建付费资源或释放现有资源。

### D8.1 运行交接

- [x] TUN保持开启；SSH、SCP、SFTP或rsync-over-SSH统一使用受控alias，无逐次S门禁。备份创建、下载、恢复或释放仍分别受本批E/R授权约束。
- [x] 生成上线后数据库+uploads配对备份，校验列表、SHA并下载到用户本机仓库外。
- [x] 更新runbook：启动/停止、release pair、备份/恢复、日志、证书、SSH `/32` 更新、AI故障、cleanup dry-run和紧急停写。
- [x] 记录所有容器/系统版本、域名参数、非敏感资源标识和secret轮换责任；不记录值。

### D8.2 监控与费用

- [x] 安装并验证LoongCollector；配置CPU≥80%持续5分钟、内存≥85%持续3分钟、磁盘70% Warn/85% Critical持续3分钟三条实例告警，并绑定既有联系人组。
- [x] 临时CPU测试规则真实触发后，用户确认联系人通知实际可达；测试规则已删除，三条正式规则未变。站点监控属于新增按量付费能力，未获授权所以不配置API liveness/readiness、Nginx 5xx、db readiness或证书云端探测，继续采用runbook主机侧/人工检查。
- [x] 配置额度50%/75%/90%人工提醒口径；记录0.167元/小时与约1796.4小时仅为估算，账单控制台为准。
- [x] 清点ECS、磁盘、快照、EIP、公网出流量、域名、Vercel、AI和可选备份存储的持续费用与责任人。

### D8.3 下线演练清单

- [x] 书面演练：停写→最终配对备份→本地下载与归档校验→DNS/Vercel处理→释放ECS→独立释放磁盘/快照/EIP→撤销key→24/72小时账单复核。
- [x] 不在本批实际释放。未来下线时每类R动作逐项授权；“停止ECS”不能替代释放和账单复核。

### D8.4 文档关闭

- [x] 用户已确认D7与D8，把07、实施计划、QA和planning标为“已实施、已人工验收通过”。
- [x] 未授权的按量站点监控准确登记为范围边界；主机侧/人工检查契约已明确，不将其误报为云端探测已配置，也不作为当前部署阻塞。
- [x] 不自动进入第五期，不自动提交额外Git变更。
- [x] 本批全部远程操作已经结束；重连仍使用受控alias且不得扩大已批准动作。

**失败停止/回滚：** 备份不可读或监控未生效即不关闭批次。新付费资源未经确认不创建；发现持续费用无法归属时先停扩容并由用户处理账户侧资源。

---

## 十四、总体验收门禁

- [x] O2独立提交，`CLAUDE.md`未进入任何部署提交或`RELEASE_SHA`。
- [x] 前后端来自同一`RELEASE_SHA`，后端image digest与Vercel deployment metadata可追溯。
- [x] 前端16/53、后端Linux/amd64 21/102、Playwright9/51及两端build保持通过；差分lint无新增债。
- [x] schema/migrations、既有e2e、原型、业务语义和lockfile未改。
- [x] linux/amd64镜像非root运行，镜像和归档无secret，SHA闭环。
- [x] PostgreSQL16、uploads和备份bind mount经重启、重建与隔离恢复演练。
- [x] Nest liveness、PostgreSQL readiness、Prisma readiness和公网链路分层通过。
- [x] 五步初始化严格逐项授权；migration、seed-games、rebuild-tags、seed-demo、AI-1、35帖embedding及B3均已分别完成并人工验收，36条生产帖子embedding在D7终态均为1536维合法向量。
- [x] embedding保持text-embedding-3-small/1536维，AI地区与供应商预检通过且无绕行。
- [x] 22/80/443、3000/5432、真实IP、限流、CORS、上传和SSE符合07。
- [x] Vercel Production/Preview隔离、SPA深链、FRONTEND_HOST与API_HOST TLS通过。
- [x] 9页×4视口、注册/上传/社交/O1/O2/Search/Chat有限失败完成真实验收。
- [x] 上线后配对备份、监控、费用责任和下线清单闭环。
- [x] 没有真实IP、域名值、secret、私钥或连接串进入Git、QA或日志。

## 十五、建议提交拆分

提交只在相应批次用户明确授权后执行，且始终使用显式pathspec：

1. `feat(personal): add personal post lists`：D0，仅O2已验收文件。
2. `docs(deploy): define production release process`：07、实施计划、production planning、D0/D1 QA和operations事实。
3. `fix(config): support one-hop proxy trust`：D1 env类型/测试/main映射和backend `.env.example`。
4. `build(deploy): add production runtime topology`：D1 Docker/Compose/Nginx/Vercel模板、脚本和runbook。
5. `fix(deploy): enforce Linux shell line endings`：旧候选失效后的发布源修正，仅`.gitattributes`与LF契约测试；该提交经授权后形成新的候选`RELEASE_SHA`，并要求从新SHA重建镜像、bundle、manifest和D1/D2同SHA证据。
6. `docs(deploy): record production acceptance`：D8，仅最终QA与状态回填。

旧第4个提交形成的候选已因Shell CRLF正式失效；第5个修正提交经授权后才是新候选`RELEASE_SHA`来源，第6个是部署后证据，不反向改变已发布制品。任何提交前复核`git diff --cached --name-only`不含`CLAUDE.md`。

## 十六、计划人工评审门禁

本计划的D0～D8均已实施并通过用户人工验收；旧候选及失败证据继续保留但不再用于当前发布。09安全修复的新生产发布身份为`RELEASE_SHA=b6b3d93866e390eb2e37bd52649fa2628403b1b4`。D5 API域名HTTPS与安全边界已通过；D6 Vercel同SHA发布、前端DNS、TLS、精确CORS、SPA深链和release pair已完成自动与人工验收。D7自动矩阵、36张截图、真实写链路、Search/Chat调用及只读终态审计已完成。D8已完成上线后配对备份、runbook、费用责任、下线演练、CloudMonitor Agent、三条主机告警及通知实际到达验证；临时测试规则已删除。未获新增付费授权的站点监控未开通并按既定runbook边界处理，不阻塞本次验收。07生产部署批次正式关闭，不自动进入第五期；SSH连接使用受控alias免逐次S，但各类写入授权仍保持独立。
