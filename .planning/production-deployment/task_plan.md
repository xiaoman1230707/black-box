# 生产部署设计批次计划

## 目标

基于当前真实代码、00 foundation、05/06 设计和最终 QA，形成已确认的 `docs/design/07-production-deployment.md` 与独立实施计划。当前只写文档，不实施云端操作，不修改业务代码、依赖、配置、数据库或测试。

## 范围门禁

- 允许：本目录三份 planning 记录、`docs/design/07-production-deployment.md`、`docs/plans/07-production-deployment-implementation-plan.md`。
- 禁止：登录或修改 ECS/Vercel/DNS，开放端口，安装软件，运行 migration/seed/cleanup，接触 secret 值，修改 package/lock、AGENTS.md、CLAUDE.md 或业务源码，提交 Git。
- 保护：保留当前脏工作树，特别是用户已有的 `CLAUDE.md` 改动。

## 阶段

| 阶段 | 状态 | 完成条件 |
| --- | --- | --- |
| 1. 基线与本地事实核对 | 已完成 | 已记录工作树、文档链、代码、env、Prisma、uploads、SSE、限流、启动与测试基线 |
| 2. 官方平台契约调研 | 已完成 | 仅使用阿里云、Vercel及相关技术官方文档，已记录可追溯来源 |
| 3. 部署方案推演 | 已完成 | 已拍板拓扑、镜像、数据、备份、安全、成本、验收与职责门禁 |
| 4. 编写 07 权威设计 | 已完成 | 文档覆盖用户要求的 14 个大项，未写实施计划 |
| 5. 自审与交付 | 已完成 | 无模糊占位、冲突、越界或 secret；停在人工评审门禁 |
| 6. 首轮评审补正 | 已完成 | 已补全新库五步初始化、健康语义分层与前后端同 SHA 溯源 |
| 7. 设计确认与实施计划 | 已完成 | 07 已获人工确认；独立实施计划已编写并停在计划人工评审门禁 |
| 8. SSH连接门禁初版 | 已完成并被阶段9勘误替代 | 已建立逐次连接授权；连接方式以阶段9的TUN开启+专属DIRECT规则为唯一现行口径 |
| 9. DIRECT规则勘误与D0 | 已完成 | DIRECT握手勘误、D0基线与保护证据已闭环；O2经用户授权独立提交，停在D1施工方案门禁 |
| 10. D1施工方案调研 | 已完成并获确认 | 已核对one-hop、镜像/Compose/Nginx/Vercel/脚本真实接缝并形成文件矩阵、顺序、验证和回滚方案 |
| 11. D1本地施工 | 已完成人工验收，待独立提交授权 | one-hop、Docker/Compose/Nginx/Vercel/env与四脚本已落地，五项安全缺口及全量回归均闭环；当前只做三个建议commit的staged diff审查，未进入D2 |

## 已拍板决议

- Vercel 承载 React/Vite 静态前端。
- 阿里云香港 ECS 宿主机承载 Nginx/SSH/基础运维；Docker Compose 承载 NestJS 与 PostgreSQL。
- PostgreSQL、uploads、备份使用宿主机持久目录或 bind mount。
- 使用全新生产库执行 migration，并按既有演示 seed/embedding 契约准备数据；不搬运整个本地开发库。
- 域名参数化为 `FRONTEND_HOST` 与 `API_HOST`，契约为前端域名加 `api` 子域名，不擅自购买。
- 不引入托管数据库、Redis、Kubernetes、云函数或对象存储业务改造。
- 目标是少量用户、作品展示、短期运行和低运维复杂度。
- 全新作品展示生产库固定按 migrate → games → tags → demo → embedding 五步初始化；每步独立停点，已有生产库禁止自动执行。
- `/api` 只作为 Nest liveness；数据库发布放行复用现有 `GET /api/posts?page=1&limit=1` 完成真实只读 Prisma 查询。
- Vercel Production 与后端镜像必须来自同一已审核 `RELEASE_SHA`，release pair 记录各自不可变制品与回滚目标。
- SSH/DIRECT 是独立逐次授权；TUN保持开启，任何ECS连接前必须收到用户当次“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”，连接结束通知连接已关闭，重连重新确认。
- O2 已以 `7fef3bec831e047c4834f3d4765e930e9a7680eb` 独立提交；未push。07、生产部署计划/planning/QA与用户`CLAUDE.md`均未进入该提交。
- D1采用Node 24.18.0 Bookworm slim与PostgreSQL 16.14 Bookworm的精确tag，并同时记录多平台index与linux/amd64 manifest digest；PostgreSQL amd64使用`c95fd534...`，不得误用linux/386的`05dd391...`。one-hop映射以纯函数TDD落地，Compose tools绝不随up自动执行。

## 错误记录

| 日期 | 错误 | 处理 |
| --- | --- | --- |
| 2026-07-19 | 读取了不存在的 `src/config/public-media-url.ts` | 通过引用检索确认真实文件是 `src/config/public-url.ts`，后续按真实路径核对 |
| 2026-07-19 | 首次评审修正补丁附带了无实际修改的末尾上下文，因匹配失败被整体拒绝 | 确认目标文件未部分写入；拆分为健康、初始化、发布溯源三个独立补丁重新应用 |
| 2026-07-19 | 自审 PowerShell 将 `$f:$n` 解析为无效驱动器变量 | 只读检查未执行、文件未受影响；改用 `${f}:$n` 后重跑 |
| 2026-07-19 | 初始化顺序自审误用全文关键词首次位置，命中前文 seed/fixture 描述而假失败 | 改为仅截取 07 §7.3 至第八章的初始化段校验固定顺序 |
| 2026-07-19 | 本机 Docker 版本探测读取 `~/.docker/config.json` 时出现 Access denied 警告，PowerShell 因 ErrorAction Stop 中断后续只读命令 | 已取得 Client 29.4.3；不绕过权限，实施计划将 Docker daemon/buildx 可用性列为 D0 前置，env/migration 改用不含 Docker 的只读命令继续核对 |
| 2026-07-19 | D0保护清单脚本调用当前PowerShell/.NET不支持的`Path.GetRelativePath` | 清单写入前即失败，仅创建空QA目录；改用工作区绝对前缀截断生成相对路径后重跑 |
| 2026-07-19 | 沙箱内读取用户级pnpm store及部分node_modules文件出现EPERM，导致前端命令假失败 | 证据显示是沙箱访问边界；经授权在本机环境只读复跑，未安装依赖，unit/build/lint/Playwright均取得有效结果 |
| 2026-07-19 | 首次前端build未注入必填`VITE_API_BASE_URL`而按配置失败 | 未创建env文件；按部署契约使用进程级临时测试值复跑并成功 |
| 2026-07-19 | D1方案最终自审的一次性PowerShell命令因反引号/引号组合解析失败 | 命令未执行、未写文件；改为无嵌套反引号的正则检查后重新运行 |
| 2026-07-19 | D1 Shell语法检查中的`bash`命中无发行版WSL，非零被同一PowerShell命令后的成功命令掩盖 | 不采信该次Shell结果；改用Git for Windows的显式`bash.exe`并逐项检查退出码 |
| 2026-07-19 | Compose临时env生成使用了当前PowerShell不支持的`utf8NoBOM`枚举 | Compose尚未执行，`finally`已清理临时目录；测试值均为ASCII，改用`-Encoding ASCII`重跑 |
| 2026-07-19 | 首次Docker构建被pnpm 11 `ERR_PNPM_IGNORED_BUILDS`阻断 | 未改package/lock或安装系统包；按官方契约在Docker中生成仅含已审查原生依赖的临时`allowBuilds`白名单，不允许全部构建脚本 |
| 2026-07-19 | 第二次Docker构建中Prisma明确报告无法检测OpenSSL，并要求安装`openssl`或更换镜像；完整build另报告`unrs-resolver`未获构建许可 | 构建非零且未加载候选镜像；`unrs-resolver`可显式加入临时白名单，但`openssl`属于额外系统包，按用户约束立即暂停并等待授权，不修改package/lock或基础镜像选择 |
| 2026-07-19 | 补入`prisma.config.ts`前，容器build因共同根目录不同生成`dist/*`而非本地`dist/src/*`；补入后Prisma generate要求`DATABASE_URL` | 将`prisma.config.ts`纳入build stage，恢复单一`dist/src/*`契约；仅对generate注入非敏感build-only占位URL，不连接数据库、不进入runtime |
