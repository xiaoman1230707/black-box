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
| 8. SSH连接门禁初版 | 已完成并被后续口径替代 | 历史阶段曾采用逐次S；现行口径为TUN开启+受控Host alias免逐次S，写入E等门禁独立 |
| 9. DIRECT规则勘误与D0 | 已完成并留作历史 | DIRECT规则已人工验证；后续再次勘误为受控alias直接连接，D0/O2提交边界不变 |
| 10. D1施工方案调研 | 已完成并获确认 | 已核对one-hop、镜像/Compose/Nginx/Vercel/脚本真实接缝并形成文件矩阵、顺序、验证和回滚方案 |
| 11. D1本地施工 | 已关闭 | one-hop、Docker/Compose/Nginx/Vercel/env与四脚本已落地并通过人工验收；三个审查提交已创建，候选RELEASE_SHA为`38247ff057310e0f98125a0bbcafbfab2969877c` |
| 12. D2施工与隔离恢复 | 已关闭 | D2.0～D2.5自动门禁与用户人工验收通过；候选镜像、source初始化、配对备份与独立restore一致性闭环，现场按要求保留 |
| 13. D3主机底座 | 已关闭 | D3.1～D3.6均已人工验收；单次重启、持久性矩阵、配对证据、精确临时现场清理和sudo/SSH归零均通过；证书与80/443仍禁止 |
| 14. D4镜像、PostgreSQL与生产初始化 | D4.1～D4.4已人工通过 | 08批次FIX候选已关闭生命周期与backup阻塞；生产FIX API+原db healthy，三条migration、九表为空，B0/B1/pre-DB2恢复点有效 |
| 15. D4.5-A1 DB-2 seed-games方案与只读预检 | 已完成并人工验收通过 | FIX API/db、3条migration、九表空库、两端pre-DB2恢复点、uploads和资源只读门禁通过 |
| 16. D4.5-A2 DB-2 seed-games写入 | 已完成并人工验收通过 | 唯一one-off执行并以exit 0销毁；5个批准游戏、其余8张业务表为0，API停止、db healthy |
| 17. D4.5-B DB-3 rebuild-tags | 已完成并人工验收通过 | 唯一一次rebuild-tags exit 0；5 Tag与写后矩阵、one-off销毁链通过 |
| 18. B2 post-DB3 / pre-demo配对恢复点 | 已完成并人工验收通过 | retry6已完成正式B2复核、deploy导出、唯一默认SFTP和本地四层验证；用户已确认通过，正式恢复点与本地副本保留，seed-demo未执行 |
| 19. D4.6 / DB-4 seed-demo | 已完成并人工验收通过 | 唯一seed one-off exit 0并销毁；5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、20媒体、0 embedding；B2有效，API停止、db healthy |
| 20. D4.7-A / AI-1 preflight | 已完成并人工验收通过 | 唯一正式命令exit 0；DeepSeek流完整、302.AI 1536维全有限；one-off销毁且生产无漂移 |
| 21. D4.7-B / DB-5 + AI-2方案与只读预检 | 已完成 | 原候选安全缺口已由09批次修复并形成新候选 |
| 22. 09新候选部署与D4.7-B backfill | 已完成并人工验收通过 | 新SHA制品部署；唯一无参数backfill exit 0，35/35为1536维有限数，其他数据与媒体无漂移 |
| 23. D4.8 B3与API恢复 | 已完成并人工验收通过 | B3远端/本地副本通过；新API与原db healthy，API仅绑定loopback；D4已关闭 |
| 24. D5 API边缘、HTTPS与安全验证 | 已完成并人工验收通过 | Nginx HTTPS、首签/续期、健康分层、CORS、限流、媒体和6MiB边界通过 |
| 25. D6 Vercel同SHA发布与前端DNS | 已完成并人工验收通过 | 固定SHA远端分支、Vercel Production、前端DNS/TLS、SPA深链、精确CORS、四视口和release pair均通过 |
| 26. D7生产全链路最终验收 | 已完成并人工验收通过 | 自动矩阵、资源安全审计、36/36截图、受控生产写链路、Search/Chat及写后终态审计均完成；320px桌面经典滚动条差异已获用户例外确认 |
| 27. D8运维交接与最终收口 | 已完成并人工验收通过 | D8.1双副本、runbook、费用清单、D8.3下线演练、Agent、CPU/内存/磁盘告警及通知实际到达验证全部完成；临时测试规则已删除，未授权的付费站点监控按既定范围边界处理，D0～D8正式关闭 |

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
- SSH/DIRECT现行口径：TUN保持开启，通过`black-box-ecs`受控Host alias和已验证DIRECT规则连接，无需逐次S授权；连接能力不替代E/DB/AI/DNS/V/C/R写入门禁。
- O2 已以 `7fef3bec831e047c4834f3d4765e930e9a7680eb` 独立提交；未push。07、生产部署计划/planning/QA与用户`CLAUDE.md`均未进入该提交。
- D1采用Node 24.18.0 Bookworm slim与PostgreSQL 16.14 Bookworm的精确tag，并同时记录多平台index与linux/amd64 manifest digest；PostgreSQL amd64使用`c95fd534...`，不得误用linux/386的`05dd391...`。one-hop映射以纯函数TDD落地，Compose tools绝不随up自动执行。
- D1三个本地提交已完成：`854ecf961356727df22e7654ac3073b4ffb66d1f`、`478655e206daf189a00e3894051b2115c83c1b3b`、`38247ff057310e0f98125a0bbcafbfab2969877c`；第三个是当前候选RELEASE_SHA，未push。
- D2只从候选SHA的仓库外detached worktree构建。source/restore分别使用仓库外独立postgres/uploads/backups/env目录与3108/3109 loopback候选端口，串行运行。
- D2只演练migrate、games、tags、demo四个非AI初始化步骤；embedding与AI preflight明确禁止，不能把D2描述为生产五步初始化完成。
- D2恢复目标不先运行migration/seed，而从配对备份恢复后核对3个现有migration、数据库计数、媒体和sentinel；通过后的临时目录删除仍需独立本地清理授权。

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
| 2026-07-19 | D3.3首次只读采集脚本使用`mktemp`创建临时列表，虽由trap删除且未修改配置，仍违反“不得创建远端文件”的严格口径 | 如实登记为非持久边界偏差；后续补采改为纯管道/批量查询且无远端文件，Swap与软件更新仍未执行 |
### D4.2 当前停点（2026-07-22）

- [x] D4.1 人工验收通过并同步关闭。
- [x] 核对七个 env 文件变量矩阵、302.AI embedding 契约与最小权限策略。
- [x] 生成仓库外一次性交互注入脚本并完成语法、LF、敏感标记和 SHA-256 本地校验。
- [x] 使用默认SFTP将最终交互脚本原子落盘；首次 SSH stdin Base64 因 PowerShell 原生管道编码损坏而失败且未复用。
- [x] 用户在自己的交互终端通过root-only可见编辑文件注入 DeepSeek 与 302.AI key；agent 未读取、记录或输出值，临时输入文件在成功后删除。
- [x] 完成七个 env 文件安全校验、Compose 七项最小权限静态检查、PostgreSQL UID/GID 探测与空目录权限收敛。
- [x] D4.2 人工验收通过；用户确认最终注入的是供应商侧已轮换的新key。D4.3仍需独立授权。

### D4.3 DB-0 当前停点（2026-07-22）

- [x] 前置身份、空目录、env权限、无容器、资源和端口门禁通过。
- [x] 唯一一次启动db；镜像/版本、`999:999`用户、bind mount、health、内存参数及无宿主5432发布通过。
- [x] 只读确认尚无`_prisma_migrations`和public业务表；未执行migration。
- [x] 创建并独立验证唯一B0 custom dump、空uploads归档、manifest和内部SHA。
- [x] 终态仅db healthy；API/tools为0，无OOM/重启/异常日志/failed unit，资源满足阈值。
- [x] D4.3人工验收通过；DB-1 migration已取得独立授权。

### D4.4 DB-1 历史停点与关闭（2026-07-23）

- [x] 用户独立授权仅一次`prisma migrate deploy`、B1配对恢复点及短暂loopback API验证。
- [x] 用户在自己的deploy终端重新建立sudo全局缓存；agent只使用`sudo -n`，不采集密码。
- [x] 前置门禁脚本磁盘路径缺陷已修正；首次失败证据保留，用户已授权从未迁移状态恢复。
- [x] stdin执行链在首个heredoc后截断；已改用唯一远端文件并完成SHA/大小/语法核验后执行，未重复migration。
- [x] 完成前置门禁并执行唯一一次migration。
- [x] 核对精确3条migration、空业务数据、B1及API真实Prisma空分页。
- [x] 08批次以FIX候选修复API生命周期与backup边界；生产SIGTERM exit 0并获最终人工验收。
- [x] D4.4正式关闭；D4.5-A1/A2、D4.5-B / DB-3及B2配对恢复点均已人工验收通过。
- [x] D4.6 / DB-4 `seed-demo`方案、唯一写入、自动核验及用户人工验收全部完成。
- [x] D4.7-A / AI-1方案、无费用预检、唯一正式调用及用户人工验收全部完成。
- [x] D4.7-B / DB-5 + AI-2原阻塞已由09批次修复；新候选完成部署、零写入预检和唯一无参数backfill。
- [x] 35/35向量为1536维有限数；B3远端/本地副本和API loopback恢复完成，D4已人工验收关闭。
