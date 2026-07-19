# Black-box 生产部署实施计划

> **执行要求：** 实施时必须使用 `executing-plans` 按 D0～D8 检查点推进；每批完成自动验证后停止，等待用户人工确认。设计确认不构成任何云端、DNS、secret、数据库、AI 费用或发布授权。

**目标：** 将同一已审核 `RELEASE_SHA` 的 Black-box 前端发布到 Vercel、后端发布到阿里云香港 ECS，并以可恢复、可回滚、可核费的方式运行 NestJS、PostgreSQL 与 uploads。

**架构：** Vercel 承载 React/Vite 静态前端；ECS 宿主机承载 Nginx、SSH 和持久目录；Docker Compose 承载单 NestJS API 与 PostgreSQL 16。后端镜像从干净 release worktree 本地构建为 `linux/amd64`，以归档、SHA-256 和 release manifest 传入 ECS；前后端必须绑定同一个 commit。

**技术栈：** Git、pnpm、Node LTS、Docker Buildx/Compose、PostgreSQL 16、Prisma 6、Ubuntu 22.04、Nginx、Vercel、PowerShell、POSIX shell。

**计划状态：** D0 已关闭；D1 已按确认方案完成本地施工、自动验证与人工验收（2026-07-19），当前停在三个独立提交的 staged diff 审查与 commit 授权门禁；尚未获得任何 Git commit 授权，未进入 D2。

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
12. 用户已在 TUN 开启状态下人工验证 ECS 专属 DIRECT 规则。任何 SSH、SCP、SFTP、rsync-over-SSH 或 ECS SSH 连接测试仍受独立的逐次 SSH/DIRECT 握手约束；批次授权和 ECS 写入授权均不能替代该握手。

## 二、授权类型

| 编号 | 授权类型 | 默认状态 | 典型动作 |
|---|---|---|---|
| L | 本地只读/测试 | 计划获批后可按批执行 | git 审计、unit/build/e2e、配置静态校验 |
| LC | 本地写入/提交 | 每次提交前确认 | 代码、部署文件、Git commit、镜像归档 |
| S | SSH/DIRECT 逐次连接握手 | TUN保持开启；每次建立或重建连接前确认专属DIRECT规则仍生效 | SSH、SCP、SFTP、rsync-over-SSH、ECS SSH探测 |
| E | ECS 写入 | 每批明确确认 | 用户、包、Swap、目录、容器、Nginx、证书 |
| DB | 数据库写入 | 每条维护命令独立确认 | migration、各 seed、embedding、恢复 |
| AI | 外部调用与费用 | 每种调用明确确认 | DeepSeek 预检、embedding 预检与回填 |
| DNS | 公网解析 | API/前端域名分别确认 | A/CNAME/TXT、TTL、切换与回滚 |
| V | Vercel 写入/切流 | 项目创建、deployment、alias 分别确认 | env、Production deployment、回滚 deployment |
| C | 可能持续计费资源 | 创建前确认 | EIP、快照、OSS/COS、付费域名或超额套餐 |
| R | 破坏性释放 | 备份闭环后逐项确认 | cleanup apply、下线、释放 ECS/磁盘/EIP/快照 |

“允许开始某批”只覆盖该批明确列出的授权，不自动覆盖下一批或其他类型。

### 2.1 SSH/DIRECT 强制握手

1. 任何 SSH、SCP、SFTP、rsync-over-SSH 或针对 ECS 的 SSH 连接测试前，执行者必须先向用户请示。
2. TUN保持开启，连接只使用用户已人工验证的ECS专属DIRECT规则。只有用户在当次操作前明确回复 **“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”**，才能建立连接。
3. “允许执行某批”、ECS 写入授权或之前成功连接的事实，都不能替代本次 S 授权。
4. 未取得当次确认时，不得试连、上传、探测、预热连接或自动重试。
5. 连接失败时立即暂停并请用户核对本地ECS专属DIRECT规则；不得自动关闭TUN，也不得据此擅自修改安全组、密钥、`sshd` 配置、用户名、端口或认证方式。
6. 一组连续远程操作结束后关闭连接，并立即通知用户：**“本轮 SSH 操作完成，连接已关闭”**。不再提示切换或恢复TUN。
7. 连接中断、终端退出、会话超时或后续批次需要重新建立连接时，必须重新请求 S 授权并等待同一句确认。
8. QA、runbook、日志和命令记录只允许写“专属 DIRECT 规则已人工验证”、连接结果、时间和非敏感实例标识；不得保存真实ECS公网IP、用户出口IP、私钥路径或密钥内容。

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
| `docs/qa/production-deployment/d8-operations-handover.md` | D8 | 监控、费用、备份、下线清单和最终状态 |

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

**当前门禁：** 本节以下为已调研的施工方案，仍待用户人工确认；确认前不修改代码或部署配置，不构建镜像。

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

**D1 实测状态（2026-07-19，人工验收通过、待独立提交）：** one-hop TDD RED/GREEN 已闭环，env 定向16/16、后端17 suites/81、前端16 files/53、Playwright 9 files/51及两端build全部通过；D1后端定向lint为0/0，前端全量保持3/0，后端全量历史债为833/6，低于P6的881/7。Buildx已复核Node/PostgreSQL的index与linux/amd64 manifest，其中PostgreSQL `05dd...`明确为linux/386；本地验证镜像为amd64、UID/GID10001、`/app`、`dist/src/main.js`、Node healthcheck，携带4组migration、4个初始化脚本和10张fixture，bcrypt/sharp/Prisma/OpenSSL可用。最终临时归档为205,704,704 bytes，SHA-256 `7152DAC86E7230E339349C46CD6C42AA145305180363411BE03978AB6E7A8113`，记录后已删除，不是可发布制品。Compose默认仅`api,db`，tools profile额外暴露六个一次性服务并通过7项最小env/网络策略测试；AI preflight为8/8，备份安全fixture为4/4，build输出路径边界为2/2。JSON/Shell/PowerShell、脚本fail-fast、静态secret/公网暴露扫描均通过。当前未启动真实stack、未调用AI/数据库、未连接ECS、未操作Vercel/DNS、未暂存或提交Git。

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

**前置：** D1人工确认并提交；已得到候选 `RELEASE_SHA`。

**授权：** L/LC；只在本机和仓库外临时目录写入，不访问 ECS、不调用真实 AI。

### D2.1 干净来源

- [ ] 在仓库外新建 detached release worktree 指向 `RELEASE_SHA`。
- [ ] 断言该 worktree `git status --porcelain` 为空、`git rev-parse HEAD` 精确等于 SHA。
- [ ] 对比 `CLAUDE.md` 保护哈希和 `git show RELEASE_SHA:CLAUDE.md`，证明用户未提交改动未进入制品。
- [ ] 从 release worktree 重跑前端16/53、后端17/81、Playwright9/51和两端build。

### D2.2 镜像

- [ ] 确认 Docker daemon、Buildx、linux/amd64 builder 可用；本机权限异常先由用户处理。
- [ ] 使用 `build-image.ps1` 构建并 `--load`；检查 image architecture=`amd64`、entrypoint、工作目录、非root用户和healthcheck。
- [ ] 扫描镜像 history/export清单，不得含 `.env`、uploads、coverage、Git metadata或本机绝对路径。
- [ ] 导出 image archive，记录大小、SHA-256、`RELEASE_SHA`、Node/Prisma版本和基础镜像digest。

### D2.3 隔离 Compose 与 migration

- [ ] 使用仓库外临时 postgres/uploads/backup目录和隔离Compose project；API绑定非生产loopback端口。
- [ ] 以临时生成、仅存在于进程环境的非生产secret启动 db/api；AI base使用不可路由测试地址且不发AI请求。
- [ ] 先验证 `/api` liveness与`pg_isready`，再运行一次性migrate服务。
- [ ] 运行`GET /api/posts?page=1&limit=1`，断言`items=[]`与`total=0`，证明真实Prisma readiness。
- [ ] 重启和重建api，确认空库与uploads sentinel保持。

### D2.4 配对备份与隔离恢复演练

- [ ] 在隔离栈创建最小非生产记录和uploads sentinel，停止写入后运行配对备份。
- [ ] 核对`pg_restore --list`、`tar -tzf`、两份SHA-256和manifest。
- [ ] 使用第二个Compose project、不同目录/端口恢复，验证记录、sentinel、migration和readiness。
- [ ] 不把临时测试数据、env或备份写进仓库。

**自动验收：** release worktree干净；完整基线全过；镜像amd64/非root；Compose config、liveness、db readiness、Prisma readiness、持久化和恢复演练全部通过。

**人工验收：** 用户核对archive/manifest/SHA、恢复证据和镜像无secret扫描，再决定是否允许上传ECS。

**失败停止/回滚：** 不上传失败镜像。隔离目录保留供诊断；删除临时目录属于单独清理动作，不自动执行。D1代码问题返回D1修复并生成新的SHA，旧候选失效。

---

## 八、D3：ECS 主机加固与运行底座

**前置：** D2人工确认；镜像归档和SHA闭环；用户明确E授权。

**授权：** S + E。E 只授权主机写入；每次建立或重建 SSH 连接仍须单独取得 S。API_HOST DNS、数据库写入、AI、Vercel和付费扩展不在本批。

### D3.1 写入前只读基线

- [ ] TUN保持开启。发起连接前请示；仅在用户当次回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”后通过已验证的ECS专属DIRECT规则建立SSH。未确认时不试连、不探测、不自动重试。
- [ ] 用户确认目标为既有香港Ubuntu22.04 ECS；记录非敏感实例标识、系统版本、CPU/内存/磁盘、Swap、监听端口、安全组和cloud-init状态。
- [ ] 再确认本机SSH走ECS IP直连，22仍仅用户当前公网IP `/32`；不回显IP或私钥。
- [ ] 若发现未知服务、数据或端口，停止并请求确认所有权。

### D3.2 用户与SSH

- [ ] 新建普通`deploy`用户，绑定已验证公钥，授予按需sudo；不加入docker组。
- [ ] 在保持当前已验证会话的同时开第二会话验证deploy key登录，再禁用root远程和密码认证。
- [ ] 每次改sshd配置先`sshd -t`，失败不reload。

### D3.3 资源和软件

- [ ] 创建2GiB、0600、持久化Swap并设置swappiness=10；重启前后验证。
- [ ] 通过Docker官方Ubuntu仓库安装Engine、Buildx、Compose plugin；通过Ubuntu受支持仓库安装Nginx、ACME客户端、PostgreSQL client和基础审计工具。
- [ ] 锁定并记录版本；不安装桌面、RDP、宿主PostgreSQL server或Node构建链。

### D3.4 目录与权限

- [ ] 创建`/srv/black-box/{releases,compose,postgres,uploads,backups}`与`/etc/black-box`。
- [ ] `/etc/black-box/*.env`和backups为root受控；uploads给固定API UID最小读写；postgres目录按实际镜像UID核对后赋权。
- [ ] 配置Docker日志轮换、Nginx logrotate；此时不启动业务容器。

### D3.5 端口

- [ ] 保持22 `/32`和3389关闭；3000/5432不进安全组。
- [ ] 开放80/443属于本批内第二个显式E授权；未授权时只完成主机准备，不改变安全组。
- [ ] 本批连续远程操作结束后断开连接并立即通知用户“本轮 SSH 操作完成，连接已关闭”；中途连接中断则在重连前重新申请S授权。

**自动验收：** sshd config、deploy双会话、Swap、Docker hello-world/buildx/compose、Nginx config、目录owner/mode、netstat与安全组清单。

**人工验收：** 用户确认SSH未锁死、软件来源、端口、目录和持续计费资源未增加。

**失败停止/回滚：** SSH第二会话未通过不得关闭原会话；Swap/包安装失败停止。不开启业务流量，不删除原用户。安全组错误立即恢复到D3前记录。

---

## 九、D4：镜像落地、PostgreSQL与全新生产库初始化

**前置：** D3确认；用户确认目标库确为未承载用户数据的全新作品展示生产库。

**授权：** S + E + DB + AI。S 只允许当次连接；E、每个DB步骤和每个AI步骤继续独立授权，禁止整批自动连续执行。

### D4.1 制品与secret

- [ ] TUN保持开启。SCP/SFTP/rsync-over-SSH上传或任何SSH命令前先请求S授权；只有用户当次回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”才可通过专属DIRECT规则连接。失败先请用户核对DIRECT规则，不关闭TUN、不改安全组、密钥、sshd或认证方式。
- [ ] 上传image archive、compose、scripts和模板到按`RELEASE_SHA`隔离目录；服务器计算SHA并与本地manifest一致后才`docker load`。
- [ ] 用户亲自在`/etc/black-box/runtime.env`、`database.env`、`demo-seed.env`、`embedding.env`、`ai-preflight.env`、`postgres.env`及非secret `release.env`注入对应最小变量；secret文件权限0600，执行者只运行“变量名存在/格式通过”校验，不打印值。
- [ ] 明确`DEEPSEEK_MODEL=deepseek-v4-flash`、embedding模型`text-embedding-3-small`、`TRUST_PROXY=one-hop`、生产URL参数和PostgreSQL16 digest状态。

### D4.2 PostgreSQL容器

- [ ] 获E/DB授权后只启动db，验证`pg_isready`、内存参数、bind mount和5432未发布。
- [ ] 创建初始化前空库dump与空uploads归档，记录SHA；不得把其当作业务备份省略后续配对备份。

### D4.3 五步独立门禁

1. **Migration（DB授权1）**
   - 运行tools profile migrate，执行`prisma migrate deploy`。
   - 非零停止；成功后运行`migrate status`，启动loopback API并分别验证liveness和Prisma readiness。
2. **Seed games（DB授权2）**
   - 执行`node dist/src/scripts/seed-games.js`。
   - 核对恰有设计中的5个游戏；异常停止。
3. **Rebuild tags（DB授权3）**
   - 执行前只读断言Post=0、PostTag=0；不满足即取消授权并停止。
   - 执行`node dist/src/scripts/rebuild-tags.js`，核对5个内容类型。
   - 该脚本非单事务且对已有帖子有破坏性；失败恢复空库备份或重建空库，不自动重试已有库。
4. **Seed demo（DB授权4）**
   - 先创建数据库+uploads配对备份。
   - 执行`node dist/src/scripts/seed-demo-posts.js`；核对文件补偿报告、35帖、5作者、评论/点赞/文件和图片。
5. **AI预检与embedding（AI授权1 + DB/AI授权5）**
   - 先运行`ai-preflight`：DeepSeek最小流式完成；兼容embedding返回1536个有限值。香港不支持的OpenAI官方直连或任何绕行均阻断。
   - 报告预计待处理35条与成本，经用户确认后运行无参数`backfill-embeddings.js`。
   - 任一失败最终非零；只重跑null补缺，不使用`--all`产生无收益调用。

### D4.4 终态

- [ ] 只读核对帖子35、正文非空、标题无重复、5游戏各7、embedding35/35且1536维，以及评论/点赞/文件/磁盘图片与manifest一致。
- [ ] 重启db/api，确认数据与uploads保持；cleanup仅dry-run并要求orphan=0或每项可解释。
- [ ] 创建初始化完成后的配对备份，完成`pg_restore --list`、`tar -tzf`和下载到用户本机仓库外。
- [ ] 本批连续SSH/SCP操作结束后断开并通知用户“本轮 SSH 操作完成，连接已关闭”；任何重连重新申请S授权。

**人工验收：** 每一步分别审退出码、只读计数和备份；D4整批确认前不配置公网Nginx切流。

**失败停止/回滚：** 按07 §7.3与§12恢复最近配对点。embedding供应商失败不回滚已seed数据，但发布不放行。不得执行cleanup apply。

---

## 十、D5：API_HOST、HTTPS、真实IP、限流、uploads与SSE

**前置：** D4数据和备份获确认；API只在loopback可用。

**授权：** S + DNS(API_HOST) + E。DNS/E授权不替代当次SSH/DIRECT确认；不得创建Vercel Production或前端DNS。

### D5.1 API DNS与证书

- [ ] TUN保持开启。首次SSH及任何重连前请求S授权，并等待用户当次回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”；未确认时不探测API主机或自动重试连接。
- [ ] 用户设置`API_HOST` A记录到ECS公网IPv4并确认TTL；报告只写参数名和解析是否一致，不记IP。
- [ ] 渲染Nginx模板到宿主配置，`nginx -t`通过后reload。
- [ ] 申请API_HOST证书、启用HTTP→HTTPS并运行续期dry-run；失败保持loopback服务，不开放半配置HTTPS。

### D5.2 四层健康

- [ ] `/api`仅断言Nest liveness。
- [ ] Compose内部`pg_isready`断言PostgreSQL readiness。
- [ ] loopback和公网`/api/posts?page=1&limit=1`分别断言真实Prisma readiness。
- [ ] db healthy但Prisma readiness失败时必须判部署失败。

### D5.3 安全与功能

- [ ] 从授权origin与相似未授权origin验证精确CORS。
- [ ] 同一来源伪造不同X-Forwarded-For不能绕过登录限流；ECS本地与外部来源不应被错误合并。确认3000/5432公网不可达。
- [ ] 验证头像和帖子原图/缩略图URL、5MB应用限制与6MiB Nginx限制；重建API容器后文件仍在。
- [ ] 对Chat检查`text/plain`、`x-vercel-ai-data-stream:v1`、`0:/8:/d:`，错误时`3:`；浏览器确认逐步流式而非末尾一次返回。
- [ ] 验证Search/Chat有限完成或有限失败，没有永久loading；限额内协议不变，429使用现有反馈。
- [ ] 本批远程操作结束后断开SSH并通知用户“本轮 SSH 操作完成，连接已关闭”；连接失败或中断先请用户核对DIRECT规则，不关闭TUN，也不触发安全组、密钥、sshd或认证方式变更。

**自动验收：** Nginx/证书、CORS、端口、健康分层、真实IP防伪、限流、上传、SSE头与持久化结果写入D5报告。

**人工验收：** 用户从真实浏览器验证登录、图片、Search与Chat；确认无console error、mixed content或流式缓冲。

**失败停止/回滚：** DNS可回退原记录；Nginx保留上一已验配置；证书失败不启用443。API镜像问题切回上一镜像和对应配置，不动已验收数据。

---

## 十一、D6：Vercel、FRONTEND_HOST、同SHA切流与回滚

**前置：** D5获确认；`RELEASE_SHA`已推送到用户批准的Git remote；API_HOST稳定。

**授权：** Git push、V、DNS(FRONTEND_HOST)分别确认；修改ECS上的`FRONTEND_ORIGIN`和重启API还需要S + E。Vercel凭据由用户持有。

### D6.1 项目与构建

- [ ] Vercel项目Root Directory=`frontend/black_box`、Framework=Vite、Build=`pnpm build`、Output=`dist`。
- [ ] Production注入`VITE_API_BASE_URL=https://API_HOST/api`；Preview注入失败关闭地址，不访问生产API。
- [ ] 从精确`RELEASE_SHA`创建deployment，不能只选择production branch最新状态。
- [ ] 从deployment metadata核对source commit SHA完全一致，记录deployment ID、immutable URL、Production alias和构建变量“名称/scope/已校验”状态。

### D6.2 前端域名与CORS

- [ ] 用户按Vercel要求配置`FRONTEND_HOST` DNS并完成TLS。
- [ ] TUN保持开启。修改ECS配置前请求S授权，只在用户当次回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”后通过专属DIRECT规则SSH；未确认不得试连。若会话中断，重连重新确认。
- [ ] 将后端`FRONTEND_ORIGIN`设为最终`https://FRONTEND_HOST`，重启API后重新验证readiness和精确CORS。
- [ ] 在正式alias切流前验证immutable deployment的SPA深链、静态资源和API请求。
- [ ] ECS远程修改完成后断开并通知用户“本轮 SSH 操作完成，连接已关闭”。

### D6.3 Release pair

- [ ] release manifest 将同一SHA的后端image digest与Vercel deployment ID/URL成对记录。
- [ ] 记录上一后端镜像、上一Vercel deployment和兼容数据库恢复点。
- [ ] 用户明确授权后才把Production alias切到新deployment；切流后立即做Login/Home/PostDetail只读烟测。

**人工验收：** 用户核对同SHA证据、Production/Preview隔离、域名TLS、CORS和回滚目标。

**失败停止/回滚：** Vercel切回上一deployment，后端按release pair兼容性决定是否同步切回。DNS只回退到记录过的原值；不临时放宽CORS到`*`或Preview域名。

---

## 十二、D7：生产全链路与多视口最终验收

**前置：** D6切流完成。D7不得修改产品代码、schema、e2e或部署架构。

**授权：** 本地/浏览器只读验证默认可执行；任何ECS远程审计需要S。注册、上传、点赞/评论等明确测试写入由用户确认测试账号和范围，AI真实调用单独计费确认。

### D7.1 自动矩阵

- [ ] TUN保持开启。需要SSH读取ECS版本、日志、容器或端口时，先请求S授权并等待用户当次回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”；未确认时仅执行本地和公网浏览器验证。
- [ ] 从`RELEASE_SHA`干净worktree再次运行前端16/53、后端17/81、Playwright9/51、两端build和差分lint。
- [ ] 复核受保护文件、`CLAUDE.md`、schema/migrations、lock和9个e2e未漂移。
- [ ] 复核image digest、Vercel source SHA、migration status、备份SHA和生产配置静态扫描。

### D7.2 四视口

当前9页在1440×1000、900×1000、390×844、320×740生成36张Production默认态截图：Home、Search、PostDetail、Compose、Chat、Mine、Login、MyPosts、MyLikes。只做人工/截图回归，不新增CSS、DOM或像素Playwright断言。

### D7.3 真实链路

- [ ] 注册、登录、refresh、退出与RequireAuth。
- [ ] Home tag×game、分页、详情返回和滚动恢复。
- [ ] Compose Markdown、图片上传、详情媒体、点赞、评论、回复、删除反馈。
- [ ] Mine头像时序、我的发布/收藏、分页、详情和取消点赞返回一致性。
- [ ] Search真实embedding在有限时间成功或进入可重试错误态。
- [ ] Chat JWT、SSE、assistant Markdown、引用chip；检索失败降级和客户端有限失败均不永久loading。
- [ ] 重启API后数据库/uploads保持；Preview不能访问生产API；SPA深链刷新正常。

### D7.4 资源与安全

- [ ] CPU/内存/Swap/磁盘/容器日志稳定；无OOM、持续Swap或磁盘越线。
- [ ] 安全组/监听仍只有设计允许项；日志无Authorization、secret、连接串或请求正文。
- [ ] cleanup仅dry-run；生产数据计数与测试写入记录可解释。
- [ ] D7远程审计完成后断开并通知用户“本轮 SSH 操作完成，连接已关闭”；审计连接中断后的重连重新申请S授权。

**人工验收：** 用户逐项确认真实浏览器、36张截图和写入清单。D7只能标“已执行，待人工验收”，不得自行宣告生产验收通过。

**失败停止/回滚：** 真实缺口回到最早责任批次；不在D7临时开发。严重安全/数据问题立即停写并按release pair/配对备份回滚。

---

## 十三、D8：备份、监控、费用、运维交接与下线口径

**前置：** 用户明确确认D7通过。

**授权：** 远程备份、下载、监控和交接需要S；监控配置属E；任何快照/EIP/OSS/COS属C；最终下线属R。本批只形成并演练口径，不自动释放资源。

### D8.1 运行交接

- [ ] TUN保持开启。SSH、SCP、SFTP或rsync-over-SSH执行备份下载/审计前请求S授权，只在用户当次回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”后通过专属DIRECT规则连接；未确认不得上传、下载、探测或重试。
- [ ] 生成上线后数据库+uploads配对备份，校验列表、SHA并下载到用户本机仓库外。
- [ ] 更新runbook：启动/停止、release pair、备份/恢复、日志、证书、SSH `/32` 更新、AI故障、cleanup dry-run和紧急停写。
- [ ] 记录所有容器/系统版本、域名参数、非敏感资源标识和secret轮换责任；不记录值。

### D8.2 监控与费用

- [ ] 配置CPU≥80%持续5分钟、内存≥85%、磁盘70%/85%、API liveness/readiness、Nginx5xx、db readiness和证书到期告警。
- [ ] 配置额度50%/75%/90%人工提醒；记录0.167元/小时与约1796.4小时仅为估算，账单控制台为准。
- [ ] 清点ECS、磁盘、快照、EIP、公网出流量、域名、Vercel、AI和可选备份存储的持续费用与责任人。

### D8.3 下线演练清单

- [ ] 书面演练：停写→最终配对备份→本地下载与归档校验→DNS/Vercel处理→释放ECS→独立释放磁盘/快照/EIP→撤销key→24/72小时账单复核。
- [ ] 不在本批实际释放。未来下线时每类R动作逐项授权；“停止ECS”不能替代释放和账单复核。

### D8.4 文档关闭

- [ ] 仅用户确认D7与D8后，把07、实施计划、QA和planning标为“已实施、已人工验收通过”。
- [ ] 如仍有外部条件未完成，准确记录为部署阻塞，不把部分上线描述为完成。
- [ ] 不自动进入第五期，不自动提交额外Git变更。
- [ ] 本批全部远程操作结束后断开并通知用户“本轮 SSH 操作完成，连接已关闭”；若连接中断后需继续，重新申请S授权。

**失败停止/回滚：** 备份不可读或监控未生效即不关闭批次。新付费资源未经确认不创建；发现持续费用无法归属时先停扩容并由用户处理账户侧资源。

---

## 十四、总体验收门禁

- [ ] O2独立提交，`CLAUDE.md`未进入任何部署提交或`RELEASE_SHA`。
- [ ] 前后端来自同一`RELEASE_SHA`，后端image digest与Vercel deployment metadata可追溯。
- [ ] 前端16/53、后端17/81、Playwright9/51及两端build保持通过；差分lint无新增债。
- [ ] schema/migrations、既有e2e、原型、业务语义和lockfile未改。
- [ ] linux/amd64镜像非root运行，镜像和归档无secret，SHA闭环。
- [ ] PostgreSQL16、uploads和备份bind mount经重启、重建与隔离恢复演练。
- [ ] Nest liveness、PostgreSQL readiness、Prisma readiness和公网链路分层通过。
- [ ] 五步初始化严格逐项授权；已有生产库没有运行seed/rebuild-tags。
- [ ] embedding保持text-embedding-3-small/1536维，AI地区与供应商预检通过且无绕行。
- [ ] 22/80/443、3000/5432、真实IP、限流、CORS、上传和SSE符合07。
- [ ] Vercel Production/Preview隔离、SPA深链、FRONTEND_HOST与API_HOST TLS通过。
- [ ] 9页×4视口、注册/上传/社交/O1/O2/Search/Chat有限失败完成真实验收。
- [ ] 上线后配对备份、监控、费用责任和下线清单闭环。
- [ ] 没有真实IP、域名值、secret、私钥或连接串进入Git、QA或日志。

## 十五、建议提交拆分

提交只在相应批次用户明确授权后执行，且始终使用显式pathspec：

1. `feat(personal): add personal post lists`：D0，仅O2已验收文件。
2. `docs(deploy): define production release process`：07、实施计划、production planning、D0/D1 QA和operations事实。
3. `fix(config): support one-hop proxy trust`：D1 env类型/测试/main映射和backend `.env.example`。
4. `build(deploy): add production runtime topology`：D1 Docker/Compose/Nginx/Vercel模板、脚本和runbook。
5. `docs(deploy): record production acceptance`：D8，仅最终QA与状态回填。

第4个提交是候选`RELEASE_SHA`来源；第5个是部署后证据，不反向改变已发布制品。任何提交前复核`git diff --cached --name-only`不含`CLAUDE.md`。

## 十六、计划人工评审门禁

本计划与 D1 施工方案均已确认；D0 已关闭，D1 仅获本地施工授权，尚未获得任何 commit 或 D2～D8 授权。当前没有需要改变产品语义、数据库模型或供应商协议的未决技术问题；尚需用户提供的域名、secret、账号侧权限和真实写入授权均已作为实施门禁，而不是计划占位。
