# 第四期部署说明

## 1. 适用范围

本文固定 Black-box 第四期前端构建、后端运行、反向代理、CORS、密钥与限流的部署口径。变量清单以 `frontend/black_box/.env.example`、`backend/backend/posts/.env.example` 和后端 `src/config/env.ts` 为准；示例文件只含占位值，不能作为真实部署配置。

## 2. 前端构建变量

`VITE_API_BASE_URL` 是构建时变量，必须是浏览器可访问且以 `/api` 结尾的 HTTP(S) 地址。源码没有 localhost fallback，`.env.example` 也不会被 Vite 自动加载。

本地开发可创建不提交的 `frontend/black_box/.env.local`。CI 或人工构建必须显式注入，例如 PowerShell：

```powershell
$env:VITE_API_BASE_URL = 'https://api.example.com/api'
pnpm build
```

CI 应在受保护变量中设置同名值，再从 `frontend/black_box/` 执行 `pnpm build`。缺失、非法协议或路径不合法会在 Vite 配置加载阶段失败，不允许用源码默认值绕过。

Playwright 不是生产配置来源。`frontend/black_box/playwright.config.ts` 仅向测试 webServer 注入固定的 `http://localhost:3000/api`；外部已显式设置 `VITE_API_BASE_URL` 时优先使用外部值。

## 3. 后端运行变量与 profile

应用启动使用完整 `runtime` profile，要求数据库、JWT、DeepSeek、OpenAI、公开 URL、前端 origin 和合法限流参数。生产环境必须显式提供 `PUBLIC_BASE_URL` 与 `FRONTEND_ORIGIN`；开发环境的 localhost 默认只允许集中存在于 `src/config/env.ts`，service/controller 不得自行拼 host。

维护命令按能力使用最小 profile：

| 命令/能力 | 必需变量 |
|---|---|
| 应用启动 | 完整 runtime：数据库、JWT、DeepSeek、OpenAI、URL 等 |
| `seed-games`、`rebuild-tags`、上传文件清理 | `DATABASE_URL` |
| `seed:demo` | `DATABASE_URL`、`DEMO_USER_PASSWORD` |
| `embedding:backfill` | `DATABASE_URL`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`；模型可选 |
| Chat | 由应用 runtime 校验 DeepSeek key/base URL |

应用 runtime 还校验 AI 有限失败上限：`AI_EMBEDDING_TIMEOUT_MS` 默认
`20000`，`AI_CHAT_TIMEOUT_MS` 默认 `30000`，均为正整数毫秒。外部 SDK
自动重试关闭，避免供应商无响应时把页面 loading 放大到分钟级；部署可按已知网络
延迟显式调大，但不得删除有限上限。前端 Search 使用 25 秒请求上限，Chat 使用
55 秒总兜底，无需额外构建变量。

不使用 AI 的维护命令不得因缺少 DeepSeek/OpenAI key 拒绝运行。组合命令 `seed:demo:full` 先执行 seed，再以 embedding profile 全量回填；外部服务失败会使命令非零退出。

## 4. TOKEN_SECRET

`TOKEN_SECRET` 至少 32 字符，并拒绝常见示例/弱值片段。生成时使用密码学安全随机源，不把结果写入终端日志、Git 或文档。例如 PowerShell：

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

将输出直接写入部署 secret 管理系统。更换 `TOKEN_SECRET` 会使已有 access/refresh token 失效，发布说明必须要求用户重新登录。当前不实现 secret 轮换兼容或 token 吊销。

## 5. CORS 与反向代理

- `FRONTEND_ORIGIN` 必须是精确 origin，只含 scheme、host 和可选 port，不带路径、查询或凭据。
- CORS 只允许该 origin，以及 `GET/POST/DELETE/OPTIONS` 和 `Authorization/Content-Type`；不启用 cookie credentials。
- 直连或代理不受信时使用 `TRUST_PROXY=false`。
- 只有应用前方是同机/loopback 的受控反向代理时使用 `TRUST_PROXY=loopback`，确保限流读取可信客户端 IP。不要在公网直连时信任任意转发头。
- 反向代理须原样转发 Chat 流式响应，不缓冲 `text/plain` data stream，并保留 `x-vercel-ai-data-stream: v1`。

## 6. 限流部署边界

默认配额与可覆盖变量见后端 `.env.example`。登录/注册按 IP；Chat、语义搜索与上传在有效 JWT 下按用户，无法识别时回退 IP。限流先于路由 JWT guard，429 不改变成功接口和 SSE 协议。

Nest Throttler 当前使用默认进程内存 storage：

- 限额按单进程、单实例计算。
- 多实例部署不共享计数，因此不能宣称集群级全局配额。
- 若未来需要统一配额，必须接入 Redis 等共享 storage；这是明确的后续工程债，不属于第四期。

## 7. 发布验证

1. 在隔离环境注入全部变量，运行后端 `pnpm build`、`pnpm test`，再以标准命令 `pnpm start:prod` 启动生产构建；该脚本必须指向 Nest 当前真实产物 `dist/src/main.js`，发布流程不得另写漂移的入口路径。
2. 显式注入 `VITE_API_BASE_URL`，运行前端 `pnpm build`。
3. 从允许 origin 验证登录、帖子、上传和 Chat；从相似但未授权 origin 验证无 CORS 允许头。
4. 验证弱/缺失 `TOKEN_SECRET` 启动失败，日志只包含变量名与规则，不包含值。
5. 验证限额内 Chat 保留 data-stream header/text/annotation/finish parts，超限返回统一 429。
6. 确认业务源码没有分散 localhost；开发 fallback 仅在后端集中 config 和 Playwright 测试配置中出现。
