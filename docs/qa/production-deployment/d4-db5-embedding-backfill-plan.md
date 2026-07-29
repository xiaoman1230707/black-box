# D4.7-B / DB-5 + AI-2 标题向量回填施工方案

> 日期：2026-07-23
> 状态：方案与无费用只读预检已完成；正式 backfill 因候选脚本安全契约缺口而阻塞，尚未取得或执行 DB + AI 写入授权
> 固定生产身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`
> 当前生产终态：API stopped、原 db running + healthy、35 篇帖子均未写入 embedding

## 1. 范围与命令

D4.7-B 只负责给当前 35 篇演示帖补齐标题向量。它不包含 AI-1，且不得调用 Search、Chat、migration、任何 seed、cleanup、restore、API、B3、Nginx、证书、DNS 或 Vercel。

真实入口为 FIX 镜像内 `/app/dist/src/scripts/backfill-embeddings.js`，Compose service 为 `embedding-backfill`。正式命令固定为：

```bash
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T embedding-backfill
```

命令末尾不得追加参数，尤其禁止 `--all`。默认模式会查询帖子后仅处理 `titleEmbedding == null` 的记录；当前待处理数必须在执行前再次精确锁定为 35。AI-1 的两次最小调用不计入本次 backfill，本次上限为 35 次 embedding 请求。

## 2. 真实脚本契约与阻塞项

已核对 `backend/backend/posts/src/scripts/backfill-embeddings.ts`、`@langchain/openai` 1.2.4 和其使用的 OpenAI SDK 6.17.0：

- 脚本使用普通 `for...of`，逐帖串行调用，不批处理、不并发。
- `OpenAIEmbeddings` 顶层及底层 client configuration 均设置 `maxRetries: 0`；LangChain caller 与 OpenAI SDK 自动重试均关闭。
- 每帖配置 `AI_EMBEDDING_TIMEOUT_MS=20000`。
- 每次 API 返回后立即对当前帖子执行单条 Prisma update；成功项不会等待整批事务提交。
- 单帖异常被捕获并继续下一帖；失败项保持 null，循环结束后只要 `fail > 0` 就设置最终非零退出码。
- 顶层异常直接非零退出，`finally` 断开 Prisma。

当前 FIX 候选存在两个正式执行阻塞：

1. OpenAI SDK 的 timeout 在 `fetch` 返回响应头后清除，JSON body 在其后消费；当前脚本没有独立 deadline 包裹 `embedQuery()`，因此不能证明 20 秒覆盖完整响应体。
2. `embedQuery()` 返回值会直接写入 JSON 字段；脚本没有在 Prisma update 前断言数组、精确 1536 维和全部有限数。

因此当前候选不能进入正式 DB + AI 执行。必须先建立窄范围修复批次：用完整 Promise deadline 包裹每帖调用，并在写库前验证 `Array.isArray(vec)`、`vec.length === 1536` 与 `vec.every(Number.isFinite)`；以失败测试锁定 body 卡住、错误维度、非有限值和写库未发生，再按既有发布纪律生成新 SHA、重建镜像、完成隔离 Compose/恢复证据并重新部署。不得以执行后 SQL 审计替代写前校验，也不得在 ECS 临时改脚本。

## 3. 最小权限与运行顺序

Compose service 只注入：

- `database.env`：`NODE_ENV`、`DATABASE_URL`；
- `embedding.env`：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`EMBEDDING_MODEL`、`AI_EMBEDDING_TIMEOUT_MS`。

网络只加入 `db_net` 与 `egress_net`；不取得 runtime/JWT、DeepSeek、demo seed、AI preflight env 或 uploads，不发布端口、不挂载目录，文件系统只读，仅有 64MiB `/tmp` tmpfs，restart 为 `no`。服务当前没有独立 mem/cpu/pids 硬上限，因此正式运行依靠串行、API 停止、执行前资源阈值和执行中主机监测控制；不得并行运行其他 tool。

正式顺序固定为：

1. 重新验证新获批发布 SHA、镜像、Compose、脚本、env、B2和生产矩阵。
2. 确认 API 已停止，运行中只有原 healthy db，且无 one-off/tool。
3. 记录 Docker event 游标、数据库计数、35 条 null 列表摘要、媒体/B2和资源基线。
4. 执行唯一无参数命令；一旦出现 one-off create/start，即视为外部请求可能发生，禁止自动再次运行。
5. 独立采集退出码、脱敏日志和 create/start/die/destroy 事件链。
6. 只读核验向量及所有非目标数据；保持 API 停止、db healthy，等待人工验收。

## 4. 请求规模与费用口径

生产只读 SQL 得到 35 个标题合计 722 个 Unicode 字符、2070 个 UTF-8 字节，单标题 17～26 个字符。未调用 tokenizer，保守输入区间按 `ceil(字符数/4)` 至 UTF-8 字节数记为 181～2070 tokens；正式请求最多 35 次，每帖一次，AI-1 两次请求不计入。

核对日 302.AI 官方公开产品页对 `text-embedding-3-small` 标示输入 `$0.02 / 1M tokens`、输出免费。按上述保守区间，仅模型输入费约为 `$0.00000362～$0.00004140`；该值不包含供应商账户级最低扣费、舍入、税费或价格变动，正式授权前仍以当时公开费率为准。本批未读取生产账单，也未产生供应商请求。

修复完整 deadline 后，35 个请求的纯调用最坏上界为 700 秒，另加数据库更新与容器启动开销；当前候选因 body deadline 缺口不能采用该上界作为可靠终止保证。

## 5. 成功、部分失败与恢复边界

成功必须同时满足：

- 正式命令执行次数 1、one-off 唯一且 exit 0 后销毁；无 OOM、137、restart 或 signal 9。
- `Post=35`，`titleEmbedding IS NOT NULL=35`、null=0。
- 每条向量是数组、精确 1536 维、全部为有限数。
- 35 个标题、作者+标题唯一性、5 游戏各 7 篇、五类 Tag 分布、13 Comment、31 Like、10 File保持不变。
- uploads仍为20个文件、404899 bytes且逐文件 SHA 不变；B2四项不变。
- API继续停止，原 db running + healthy，无 tool 残留和受保护端口监听。

任一帖子失败时，允许此前成功向量保留，失败帖子保持 null，命令最终必须非零。不得自动重跑、补写、使用 `--all`、恢复 B2、清库或删除成功向量。若后续决定继续，只能在新的 DB + AI 授权下再次运行默认补 null 模式；执行前重新锁定剩余 null 数和最多调用数。B2是 pre-demo 恢复点，恢复会同时撤销已验收的 DB-4 演示数据，不能作为自动回滚手段。

B3只能在35/35结果完成只读核验并经用户人工验收后，取得独立备份授权再创建。本方案和预检不授权 B3。

## 6. 无费用只读预检结果

预检最终以退出码0完成：

- FIX镜像、OCI revision、Compose入口和生产 service 身份匹配；API stopped，运行中仅原 db healthy，无 one-off。
- `embedding.env`为`root:root 0600`；变量集合、非空、HTTPS兼容base URL、302.AI供应商约束、`text-embedding-3-small`和20000ms格式均通过，未输出值。
- service有效环境精确为database 2项+embedding 4项，网络精确为`db_net`、`egress_net`，无端口和mount。
- migration=3；5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、0 Avatar、5 Game、5 Tag保持不变。
- null embedding=35、非null=0、非数组=0、错误维度历史数据=0；标题总字符与字节数如第四节。
- 游戏、标签、作者分布、35个唯一标题、35个作者+标题组合及35篇非空正文均与DB-4基线一致。
- uploads为20文件、404899 bytes；B2四项固定大小/SHA、内部清单、dump和tar可读性通过。
- 资源实测：MemAvailable 1088940 kB、SwapFree 2092504 kB、磁盘可用30791188480 bytes、failed units=0；受保护端口无监听。
- 供应商请求0，embedding one-off创建0。

首次完整脚本因PowerShell stdin追加CR而在全部完成标记后出现封装层非零；第二次Base64封装因尾部换行产生解码警告且pipefail缺失。第三次使用LF原文经去除Base64传输换行并启用pipefail，完整退出0。两次封装问题均未创建容器、未调用供应商、未写数据库。分布查询首次误用snake_case物理列名而在SQL解析阶段失败；改用Prisma真实驼峰列名后只读通过。

sudo timestamp已清除，负向`sudo -n true`失败，SSH/SFTP/SCP进程为0。当前停在脚本安全修复决策门禁；在修复、新候选重建和重新只读预检完成前，不得授予正式DB-5 + AI-2执行权限。
