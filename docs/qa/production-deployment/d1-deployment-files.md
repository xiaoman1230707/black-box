# D1 部署文件与 one-hop 自动验证记录

> 日期：2026-07-19
> 状态：已实施、自动验证及用户人工验收通过，已按审查边界完成三个独立本地提交并关闭
> 边界：仅本地施工与验证；未连接 ECS，未操作 Vercel/DNS，未启动真实生产数据库，未执行 migration/seed/embedding/AI，未暂存或提交 Git。

## 1. 发布源与保护证据

- HEAD/O2 SHA：`7fef3bec831e047c4834f3d4765e930e9a7680eb`。
- 暂存区：空。
- `CLAUDE.md`：仍为用户未暂存改动；SHA-256 `A245212777880744CF2F052B909A6F157CF0E481A11D1B70147C85C8557C4445`，与 D0 一致。
- `package.json`、两端 lockfile、Prisma schema/migrations、既有 Playwright：无 D1 diff。
- D1 最终提交形成候选 `RELEASE_SHA=38247ff057310e0f98125a0bbcafbfab2969877c`；D2 仍须从该 SHA 的独立干净 worktree 重建。

## 2. 实际文件矩阵

| 文件 | D1 职责 |
|---|---|
| `backend/backend/posts/src/config/env.ts` | 新增受控 `one-hop` 和 Express 映射纯函数 |
| `backend/backend/posts/src/config/env.spec.ts` | one-hop 接受、映射和非法值拒绝 TDD |
| `backend/backend/posts/src/main.ts` | 应用映射值并收敛触及文件 lint |
| `backend/backend/posts/.env.example` | one-hop 与生产变量口径 |
| `backend/backend/posts/Dockerfile` | amd64 多阶段、OpenSSL、显式构建白名单、非 root、healthcheck、fixture |
| `backend/backend/posts/.dockerignore` | 排除 env、uploads、dist、coverage、Git 和本地缓存 |
| `deploy/production/compose.yaml` | db/api 常驻服务与六个 tools profile 一次性服务 |
| `deploy/production/nginx/black-box.conf.template` | API/上传代理、TLS、真实 IP、Chat 禁缓冲 |
| `frontend/black_box/vercel.json` | 唯一 SPA rewrite |
| `deploy/production/*.env.example` | release/postgres及runtime/database/demo-seed/embedding/AI-preflight最小职责变量示例，不含真实值 |
| `deploy/production/release-manifest.example.json` | release、双基础镜像 digest、备份、Vercel 与回滚字段 |
| `deploy/production/scripts/build-image.ps1` | 干净 SHA 构建、镜像内容门禁、归档与 manifest |
| `deploy/production/scripts/build-image.test.ps1` | 仓库根目录与子目录输出拒绝fixture |
| `deploy/production/scripts/verify-stack.sh` | liveness、PostgreSQL/Prisma readiness、uploads、授权 SSE |
| `deploy/production/scripts/ai-preflight.mjs`及测试 | 最小 chat/embedding 协议与1536维预检 |
| `deploy/production/scripts/backup-pair.sh` | 同一停写窗口生成配对备份与 SHA-256 |
| `deploy/production/scripts/backup-pair.test.sh` | 备份嵌套、重名、并发写入口与manifest fixture |
| `deploy/production/scripts/compose-policy.test.ps1` | 服务级最小env和网络矩阵 |
| `docs/operations/phase4-deployment.md` | one-hop 和健康分层事实回填 |
| `docs/operations/phase4-maintenance.md` | 全新展示库五步初始化窄范围例外 |
| `docs/operations/production-deployment-runbook.md` | D1～D8 操作、授权与失败停止口径 |

## 3. TDD 证据

### 3.1 TRUST_PROXY

- RED：新增 `one-hop` 接受/映射断言后，旧实现稳定出现7项失败，原因分别为解析器拒绝和映射函数不存在。
- GREEN：`TrustProxy` 固定为 `false | 'loopback' | 'one-hop'`；映射固定为 `false | 'loopback' | 1`。
- 非法值 `true`、`1`、`2`、CIDR和任意文本继续拒绝，错误不回显输入。
- 最终定向：1 suite / 16 tests passed。

### 3.2 AI preflight

- RED：先写 Node 内建测试，因实现模块不存在而失败。
- GREEN：8/8 passed，覆盖流式完成、上游非2xx脱敏、响应头及body全程硬超时、错误维度、非有限值和输出脱敏。
- 未调用真实 AI；测试只使用 mock fetch。

## 4. 基础镜像与本地镜像

### 4.1 官方 digest

| 镜像 | 多平台 index | linux/amd64 manifest |
|---|---|---|
| Node `24.18.0-bookworm-slim` | `sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d` | `sha256:d45d78e7929b46875bbd4e29bea672d5bc48186c6c3588306521c815e78352d6` |
| PostgreSQL `16.14-bookworm` | `sha256:92620daddcd947f8d5ab5ba66e848702fe443d87fed30c4cea8e389fd78dfc55` | `sha256:c95fd5346040eba2de3c435e14874af18f5d681fb5848d4f081dbead0878af28` |

`sha256:05dd391...` 已由 Buildx manifest 证明为 PostgreSQL linux/386，未作为 amd64 证据。

### 4.2 构建中发现与闭环

1. pnpm 11 首次阻止未批准构建脚本。按官方 `allowBuilds` 契约，仅在镜像中间层白名单放行 Nest/Prisma/bcrypt/sharp/unrs-resolver；不使用全量放行，不改 package/lock。
2. Prisma 明确要求 OpenSSL。经用户独立授权，Debian 基础层仅安装 `openssl`，不加入编译工具。
3. Docker build 初版漏拷根目录 `prisma.config.ts`，使产物漂移成 `dist/*`。补入后恢复与本地一致的 `dist/src/*`；Prisma generate 只使用非敏感 build-only URL，不连接数据库、不进入 runtime。

### 4.3 最终镜像检查

- platform/architecture：`linux/amd64` / `amd64`。
- user：`10001:10001`；workdir：`/app`。
- command：`node dist/src/main.js`。
- healthcheck：Node 原生 fetch 请求 `/api`，未安装 curl/wget。
- OCI revision：O2 SHA；Node index/amd64 digest 标签与上表一致。
- 镜像内检查：OpenSSL 3、bcrypt、sharp、Prisma Client 均可加载；3个 migration 目录、4个编译初始化脚本、10张 demo fixture 均存在。
- 最终临时 archive：205,704,704 bytes；SHA-256 `7152DAC86E7230E339349C46CD6C42AA145305180363411BE03978AB6E7A8113`。该归档记录后已从临时目录删除，不是发布制品。

## 5. Compose、Nginx、Vercel 与脚本

- `docker compose config --quiet`：通过，使用仓库外非敏感临时 env，结束后已删除。
- 默认服务：`api,db`。
- tools profile：额外包含 `migrate,seed-games,rebuild-tags,seed-demo,embedding-backfill,ai-preflight`；不会随默认 up 自动执行。
- 服务级最小权限策略测试：7项通过。常驻API只读取runtime env；migrate/games/tags只读取database env且仅接db网络；demo seed额外读取demo密码但无外网；embedding只额外读取对应provider并接db+外网；AI预检只读取provider且仅接外网。
- db 无宿主端口；api 默认仅 `127.0.0.1:3000`；uploads/PostgreSQL 均为 bind mount；日志与资源上限存在。
- Nginx 模板包含 `API_HOST`、6MB 上传上限、覆盖真实 IP 转发头、Chat buffer/cache/gzip off。
- Vercel JSON 可解析且只有 catch-all 到 `/index.html`，不代理 API。
- PowerShell AST、Git Bash `bash -n`、两个 JSON解析：通过。
- build-image 脏工作树拒绝：通过，且未创建输出目录。
- verify/backup/AI preflight 缺输入 fail-fast：均按契约非零。
- build-image 使用 .NET UTF-8 无 BOM 写 manifest，兼容当前 Windows PowerShell，不修改系统 execution policy。

## 6. 应用回归与 lint

| 门禁 | 结果 |
|---|---|
| 后端 env 定向 | 1 suite / 16 passed |
| 后端全量 Jest | 17 suites / 81 passed |
| 后端 build | 通过 |
| D1 后端定向 lint | 0 errors / 0 warnings |
| 后端全量只读 lint | 833 errors / 6 warnings，均为未触及历史文件；低于P6的881/7，不表述为全仓通过 |
| 前端 unit | 16 files / 53 passed |
| 前端 build | 2460 modules，成功 |
| 前端全量 lint | 3 errors / 0 warnings，仅既有 `badge.tsx`、`utils/index.ts` |
| Playwright list | 9 files / 51 tests |
| Playwright full | 51 passed |
| AI preflight Node test | 8 passed |
| Compose最小env/网络策略 | 7 service policies passed |
| build-image输出路径边界 | 2 passed（仓库根目录与子目录均拒绝） |
| backup-pair安全fixture | 4 passed（uploads嵌套、重名、写工具、manifest） |

## 7. 静态与范围审计

- 禁止模式扫描：公网 `0.0.0.0:3000`、宿主5432、`latest`、`dangerouslyAllowAllBuilds`、curl healthcheck、无关 `dangerouslySetInnerHTML`均零命中。
- 示例仅使用 `.invalid` 域名和明显不可发布占位值；未读取、记录或回显真实 secret、数据库连接串、真实域名/IP或私钥路径。
- 未启动真实 stack，未调用外部 AI，未写数据库或 uploads。
- 未连接 ECS，未操作 Vercel/DNS，未 push、stage 或 commit。

## 8. 人工门禁

### 8.1 提交前五项审查修复

- **最小secret与网络：** RED证明旧Compose会让数据库工具缺少职责标记且共享完整env；GREEN后拆为runtime/database/demo-seed/embedding/AI-preflight五类。`DEMO_USER_PASSWORD`不再进入常驻API，tools只获得任务所需env和网络。
- **AI完整deadline：** RED用两个永不结束的`text()`/`json()`模拟响应body卡住，旧实现触发测试安全超时；GREEN后deadline覆盖fetch、状态检查和完整body消费。
- **备份manifest：** 现记录`API_IMAGE_DIGEST`、已应用migration清单、最终备份根目录及数据库/uploads绝对路径、字节数和SHA-256。
- **备份安全边界：** 拒绝backup位于uploads或仓库内；拒绝同秒complete/incomplete复用；备份目录创建前确认migrate/seed/rebuild/embedding写服务未运行；失败不自动重试或重启API。
- **镜像输出目录：** RED fixture证明旧逻辑会放行`OutputDir == repoRoot`；GREEN后仓库根目录及任意子目录均拒绝。

上述测试均使用临时fixture、mock fetch或Compose静态模型；未调用真实数据库、AI或云端。

### 8.2 修复后完整门禁

- 后端：17 suites / 81 tests；build通过；D1触及TS lint 0/0；全量历史债保持833 errors / 6 warnings。
- 前端：16 files / 53 tests；build 2460 modules；Playwright 9 files / 51 passed；全量历史债保持3 errors / 0 warnings。
- 本地验证镜像复核：amd64、`10001:10001`、`/app`、`node dist/src/main.js`、Node原生healthcheck及migration/四个编译脚本均存在；未重建或导出新制品。
- D0保护清单仅`env.ts`、`env.spec.ts`、`main.ts`三项发生预期D1变化；package/lock、schema/migrations、e2e与原型哈希不变。`CLAUDE.md`仍是用户未暂存改动，SHA-256保持`A245212777880744CF2F052B909A6F157CF0E481A11D1B70147C85C8557C4445`。
- 暂存区为空，`git diff --check`通过；无3000/5173监听，仅存在Playwright结束后的TIME_WAIT连接。

D1 已由用户人工验收并正式关闭。三个独立提交均已按审查范围创建，候选 `RELEASE_SHA` 为 `38247ff057310e0f98125a0bbcafbfab2969877c`；D2 仅获施工方案调研授权，尚未执行。
