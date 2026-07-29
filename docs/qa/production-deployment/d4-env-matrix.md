# D4.2 环境变量与最小权限矩阵

> 日期：2026-07-22
> 状态：已实施并人工验收通过
> 边界：本文件只记录变量名、职责与校验规则，不记录真实域名、endpoint、连接串、key、密码或secret长度

## 1. 受控文件

| 文件 | 权限 | 消费者 | 必需变量 |
| --- | --- | --- | --- |
| `runtime.env` | `root:root 0600` | 常驻API | `NODE_ENV`、`PORT`、`DATABASE_URL`、`TOKEN_SECRET`、`PUBLIC_BASE_URL`、`FRONTEND_ORIGIN`、`TRUST_PROXY`、DeepSeek 3项、embedding 3项、AI超时2项、限流12项 |
| `database.env` | `root:root 0600` | migrate/games/tags/demo/embedding的数据库侧 | `NODE_ENV`、`DATABASE_URL` |
| `demo-seed.env` | `root:root 0600` | 仅seed-demo | `DEMO_USER_PASSWORD` |
| `embedding.env` | `root:root 0600` | 仅embedding-backfill | embedding key/base/model、embedding超时 |
| `ai-preflight.env` | `root:root 0600` | 仅AI preflight | DeepSeek 3项、embedding 3项、AI超时2项 |
| `postgres.env` | `root:root 0600` | 仅PostgreSQL容器 | `POSTGRES_DB`、`POSTGRES_USER`、`POSTGRES_PASSWORD` |
| `release.env` | `root:root 0644` | Compose变量替换 | 固定SHA/image/digest、loopback API绑定、PostgreSQL/uploads绝对路径及6个env绝对路径 |

## 2. 供应商与URL契约

- Chat继续使用既定DeepSeek供应商和固定模型；key只由用户静默输入。
- Embedding固定使用302.AI OpenAI-compatible API、`text-embedding-3-small`、1536维；用户已接受标题与搜索词由该供应商处理。
- Embedding base URL包含兼容API版本段，代码和预检再追加`/embeddings`；禁止OpenAI官方直连、回退或自动切换。
- 生产API与前端origin使用用户已确认的受控域名参数，但本文件不记录真实值。

## 3. 七项最小权限策略

1. 常驻API只读取`runtime.env`，连接内部数据库与外网，宿主端口仅loopback。
2. PostgreSQL只读取`postgres.env`，只加入内部`db_net`，不发布5432。
3. migrate、seed-games、rebuild-tags只读取`database.env`，仅加入内部`db_net`。
4. seed-demo额外读取`demo-seed.env`并挂载uploads，不取得AI key或外网网络。
5. embedding-backfill读取`database.env`与`embedding.env`，只因embedding调用额外加入`egress_net`。
6. ai-preflight只读取`ai-preflight.env`并加入`egress_net`，不取得数据库、demo密码或uploads。
7. 所有一次性工具均在`tools` profile、`restart: no`且无宿主端口；默认`up`不会自动执行。

## 4. 安全校验输出

后续自动校验只允许输出每个文件的存在、owner/mode，以及变量集合、非空、URL形态、固定模型、正整数超时、JWT强度和职责隔离的PASS/FAIL。不得`cat` env，不得输出展开后的Compose、连接串、key片段、哈希或可推断secret的信息。

## 5. 首次交互脚本传输记录

- 状态：暂停，尚未完成 secret 注入。
- 仓库外一次性交互脚本已通过语法、LF、敏感标记及 SHA-256 本地校验；脚本本身不包含 key 或生成后的内部 secret。
- 首次 SSH stdin Base64 传输在远端解码阶段失败；本地同管道复现确认是 PowerShell 原生管道编码问题。该失败不属于制品哈希、ECS、SSH 身份或供应商配置失败。
- 最终脚本路径未原子落盘；精确 `.part` 可能保留。未要求用户输入 secret，未创建七个 env 文件，未运行 Compose、PostgreSQL UID/GID 探测或权限收敛。
- 失败后未重试、未清理现场。D4.2 继续停在受控传输恢复门禁，D4.3 未开始。

## 6. 受控传输恢复

- 首次失败 `.part` 经只读核对为完整脚本字节，但仍作为失败现场保留，未执行、覆盖或删除。
- 默认 SFTP 使用新的唯一目标完成单次上传；新 `.part` 的大小与完整 SHA-256 均与本地核验值一致。
- 核验后原子落盘，终态为 `deploy:deploy 0700`、4963 bytes，`bash -n`通过；未输出脚本正文、域名、endpoint或secret。
- 当前等待用户在自己的交互式deploy终端静默输入两个外部服务key。用户完成前，七个env文件、Compose策略校验、PostgreSQL UID/GID探测和目录权限收敛均保持未执行。

## 7. 交互粘贴兼容修正

- 原脚本在用户仅粘贴原始key时仍返回合并错误，无法区分空值、两次输入不一致或控制字符污染。
- v2只规范化精确的终端bracketed-paste包装和末尾CR，并将错误类别拆分；双输入确认、字符白名单和最小长度均未放宽，且任何失败仍发生在文件写入前。
- v2使用新的唯一路径完成默认SFTP上传、完整SHA/大小核对、`deploy:deploy 0700`原子落盘和`bash -n`；未覆盖或执行任何旧路径，未创建env。
