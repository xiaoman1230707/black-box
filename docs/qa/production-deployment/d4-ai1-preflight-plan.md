# D4.7-A / AI-1 `ai-preflight` 施工方案与只读预检

> 状态：方案、无费用只读预检与唯一正式调用均已完成并人工验收通过
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`
> 边界：本文件不记录key、真实endpoint、域名、公网IP、连接串、prompt、响应正文、向量或敏感请求头

## 1. 目标与非目标

AI-1只验证生产DeepSeek chat与302.AI OpenAI-compatible embedding两条最小外部链路。它不启动API，不连接生产数据库，不挂载uploads，不修改B2，不执行embedding backfill、B3、migration、seed、cleanup、Nginx、证书、DNS或Vercel。

本轮只完成方案、mock测试、静态契约和生产只读预检；真实供应商请求必须等待独立AI费用授权。

## 2. 真实入口与最小权限

| 项目 | 固定契约 |
| --- | --- |
| Compose service | `ai-preflight`，位于`tools` profile，`restart: "no"` |
| 正式入口 | `node /opt/black-box-tools/ai-preflight.mjs` |
| 脚本来源 | FIX release `compose/scripts/ai-preflight.mjs`以只读bind mount挂载到`/opt/black-box-tools` |
| env | 只读取`AI_PREFLIGHT_ENV_FILE=/etc/black-box/ai-preflight.env` |
| 网络 | 只加入`egress_net`；不加入内部`db_net` |
| 文件系统 | 容器根只读，仅`/tmp`为64MiB tmpfs；无uploads、postgres或backup mount |
| 主机端口 | 不发布任何端口 |
| 一次性生命周期 | `create → attach → start → die → destroy`；成功必须`exitCode=0`且无残留 |

环境文件必须且只能包含以下8个变量：

```text
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL
DEEPSEEK_MODEL
OPENAI_API_KEY
OPENAI_BASE_URL
EMBEDDING_MODEL
AI_EMBEDDING_TIMEOUT_MS
AI_CHAT_TIMEOUT_MS
```

它不得取得`DATABASE_URL`、`TOKEN_SECRET`、`DEMO_USER_PASSWORD`、PostgreSQL变量、runtime env、embedding backfill env或生产数据库网络。

## 3. 供应商、模型和URL契约

- Chat供应商固定为已批准DeepSeek；模型精确为`deepseek-v4-flash`。
- Embedding供应商固定为用户已接受的302.AI OpenAI-compatible服务；模型精确为`text-embedding-3-small`，结果必须精确1536维且每项均为有限数。
- 禁止把embedding地址改为OpenAI官方服务，禁止回退、换模型、换供应商、改地区路径或降低维度断言。
- 两个base URL都必须为HTTPS；base URL已包含兼容API版本段，脚本分别追加`/chat/completions`与`/embeddings`，不得重复或遗漏版本段。
- 静态检查仅输出URL格式、供应商角色、模型与超时的PASS/FAIL，不输出真实URL。

## 4. 请求、deadline与输出

正式预检的调用上限固定为：

1. 一次最小DeepSeek流式chat请求，`max_tokens=8`、`stream=true`；必须读取完整响应并发现SSE结束标记。
2. 一次最小embedding请求；必须完整读取JSON，得到精确1536个有限数值。

脚本使用原生`fetch`，没有SDK级或业务级自动重试。Abort deadline覆盖连接、响应头以及完整`text()`/`json()`消费：chat默认30000ms，embedding默认20000ms。任一HTTP、超时、流不完整、JSON、维度或有限值失败均以非零退出阻断后续步骤。

允许记录的输出仅为：供应商类别、成功/失败、耗时、流是否完整、embedding维度和有限值检查。禁止记录key、endpoint、prompt、响应正文、向量、Authorization或其他敏感请求头。

## 5. 正式命令与一次性门禁

正式命令只能在独立AI费用授权后调用一次：

```text
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T ai-preflight
```

执行前记录Docker event UTC游标与容器集合。命令退出码、脱敏stdout/stderr摘要和`create/start/die/destroy`事件链必须通过独立会话取得，不能把后续编排放入可能被Compose消费的stdin。

一旦事件中出现本次`ai-preflight` one-off的`create`或`start`，即视为两个外部调用可能已发生；无论结果是否可确认，均禁止自动重跑。失败时保留事件、日志和生产只读快照，D4.7-B保持阻断。

## 6. 数据、媒体与资源门禁

正式调用前后均须只读确认：

- DB-4已验收矩阵保持5 User、35 Post、35 PostTag、13 Comment、31 UserLikePost、10 File、0 Avatar、0 embedding；5 Game、5 Tag、3 migration不变。
- uploads保持20个媒体、404899 bytes，逐文件相对路径、大小与SHA符合DB-4固定基线。
- B2远端与本地副本保持可读且SHA不变。
- API停止；运行中只允许原healthy db；无tools/one-off残留。
- 主机`MemAvailable ≥ 512MiB`、`SwapFree ≥ 1GiB`、磁盘可用`≥ 10GiB`、failed units为0。

`ai-preflight`没有单独cgroup内存上限，因此依靠串行执行、只保留db运行、64MiB tmpfs和上述主机资源门禁控制2GiB ECS风险。执行中记录峰值资源与OOM/restart；异常立即停止，不启动其他工具。

## 7. 费用口径

- 正常成功最多产生1次DeepSeek chat计费请求和1次302.AI embedding计费请求。
- Chat请求最多请求8个输出token，另含固定短输入；embedding只包含一条固定短输入。
- 供应商已接收后发生超时、断流或客户端证据丢失时仍按可能计费处理；禁止为了取得完整证据自动重跑。
- 具体金额由用户账号当时的供应商计价、路由和币种决定，不从生产key或账单接口读取。独立AI授权等价于接受上述最多两次调用的最坏计费边界，不代表授权35帖embedding backfill。

## 8. 只读预检矩阵

| 检查 | 方法 | 当前结果 |
| --- | --- | --- |
| FIX脚本与Compose身份 | Git对象、当前FIX文件、service/command/env/network/mount静态核对 | PASS |
| Mock安全与deadline | `node --test deploy/production/scripts/ai-preflight.test.mjs` | PASS，8/8 |
| Compose最小权限 | `compose-policy.test.ps1` | PASS，7项策略 |
| Env存在/权限/变量集合 | ECS root-only静态检查，仅输出PASS/FAIL | PASS：`root:root 0600`且精确8项 |
| URL/模型/超时格式 | ECS静态解析，仅输出PASS/FAIL且不发请求 | PASS：供应商角色、HTTPS版本段、模型与30000/20000ms |
| DB-4数据、媒体与B2 | ECS数据库/uploads/B2只读复核 | PASS：固定数据矩阵、20媒体、远端及本地B2均不变 |
| 容器与镜像终态 | ECS Docker只读复核 | PASS：API stopped、仅原db running+healthy、one-off=0 |
| 通用外网DNS/TLS | 不带凭证访问非供应商通用测试目标 | PASS；未访问供应商业务接口 |
| 主机资源 | `/proc/meminfo`、文件系统和failed units | PASS：资源高于门禁，failed units=0 |

首次资源采集在DNS/TLS均通过后因PowerShell破坏远端`awk`转义而退出；改用离散`grep/df/systemctl`只读命令补采成功，没有重复DNS/TLS或产生远端写入。

首次完整脚本在FIX身份首项停止：已安装Compose与AI脚本的原始SHA不同于LF Git blob。独立只读核对证明两者分别只有148行和167行的行尾CR差异，去除行尾CR后的SHA精确等于FIX Git对象，未发现内容漂移；三个Linux Shell的LF发布契约不受该非Shell表示差异影响。后续身份检查同时锁定已安装原始SHA与只读规范化后的Git blob SHA，不修改服务器文件，也不把首次停止改写为首次通过。

修正身份口径后的第二次预检已通过FIX、env、Compose和容器四层，随后只读SQL因嵌套引号被转义成反斜杠而在PostgreSQL解析阶段失败；没有执行成功的SQL或任何写语句。补采改用固定heredoc向`psql`传递同一只读SELECT，不改变数据断言或重复任何AI调用。

heredoc修正后的第三次预检成功连接数据库，但查询沿用了Prisma逻辑模型名，PostgreSQL在首个不存在的`"User"`关系处终止；仍无写语句。最终补采按`schema.prisma`的`@@map`改用真实物理表名，不改变计数矩阵。

物理表名修正后的第四次预检通过DB-4数据库和20媒体矩阵，随后B2检查因只扫描backup根目录第一层而未命中实际嵌套恢复点。只读定位确认固定B2 dump SHA仍唯一存在；最终检查改为在受控深度内先按dump SHA定位父目录，再核对其余三项固定SHA，不输出或写入恢复点内容。

最终完整预检全部通过：FIX/Compose/脚本、8项env、供应商/模型/超时格式、最小权限、容器、DB-4矩阵、20媒体、远端B2与主机资源均为PASS。仓库外本地B2再次通过四项固定SHA、内部清单、98行`pg_restore --list`、空uploads tar和manifest身份检查。实测资源为`MemAvailable=1119308 kB`、`SwapFree=2093028 kB`、磁盘可用`30791262208 bytes`、failed units=0。

## 9. 成功、失败与恢复边界

成功必须同时满足：两个请求各恰好一次、DeepSeek流完整结束、embedding精确1536维且全有限、命令exit 0、唯一one-off销毁、生产数据/uploads/B2不变、API停止且db healthy。

任一调用或证据失败立即阻断D4.7-B。不得换供应商/模型/endpoint、降低断言、重跑preflight、执行embedding backfill、恢复数据库或启动API。因为AI-1不写数据库和uploads，失败恢复是保留生产DB-4终态并等待供应商或网络问题的独立处置，不使用B2 restore。

## 10. 当前门禁

DB-4已唯一执行并人工验收通过。用户随后人工验收AI-1方案/无费用预检并独立授权唯一正式调用；执行结果见`docs/qa/production-deployment/d4-ai1-preflight-report.md`。正式调用次数为1，DeepSeek与302.AI各1次并成功，AI-1已人工验收通过；该验收不授权B3、embedding backfill、API启动、Nginx、证书、DNS、Vercel或其他生产动作。
