# 第四期 P5 调研发现

## 已确认边界

- P5 按八个独立任务收口 URL、环境、CORS、限流、文件清理、演示 seed 和运维文档。
- 应用启动校验完整运行时变量；维护脚本只校验自身能力所需的最小集合。
- cleanup 默认 dry-run，apply 需要备份确认；seed 的 Prisma transaction 不覆盖文件系统，失败须补偿本次创建的图片。

## 真实代码与依赖

- 前端硬编码 API 仅在 `src/api/config.ts` 与 `src/hooks/useChatBot.ts`；前者属于 P3 剩余 lint 债，P5.1 修改后须一并归零，前端全量门禁由 4/0 收紧至不高于 3/0。
- 本地 `@ai-sdk/react@1.2.12` 的 `useChat` 明确支持 `onResponse` 与 custom fetch；`onResponse` 在 SDK 自己的 `response.ok` 检查前执行。Chat 429 可在既有 hook 内转换为统一 toast，不需改 SSE、JWT 或消息 store。
- 后端没有直接依赖 `dotenv` 和 `@nestjs/throttler`；现有脚本通过传递依赖使用 `dotenv/config`。P5 必须增加 `dotenv@^17` 与 `@nestjs/throttler@^6.5.0` 直接依赖。
- `main.ts` 现为 `cors:true` 且无启动校验；JWT、DeepSeek、OpenAI 配置分散读取 env。环境 parser 必须显式包含两组 AI 配置，并按 `runtime/database/embedding/demoSeed` profile 分层。
- 媒体 URL 硬编码分布在 posts/auth/comments/ai/upload 五个 service；头像和帖子图片的磁盘派生命名已核实，P5.3 只替换 URL 构造，不动磁盘路径与返回字段。
- uploads 内存在 `.gitignore`/`.gitkeep` 控制文件和现有图片组；cleanup 必须 no-follow symlink、忽略控制文件、unknown 只报告，并严格限制在 canonical uploads root。
- `Avatar`、`File` 均无 createdAt；`File.postId` 可为 null。因此 DB 有记录但文件缺失只能报告，`postId=null` 的年龄只能以现存文件 mtime 代理。
- 现有 `seed-demo-posts.ts` 会按演示用户删除全部帖子，必须收紧为 manifest 标题+作者；`backfill-embeddings.ts` 当前逐帖失败后仍以 0 退出，P5.7 要在继续处理后汇总失败并非零退出。

## 测试与门禁

- 前端现有基线为 7 个 spec/41 条 Playwright；P5 功能未人工验收前不新增对应 e2e。
- 后端 Jest 当前只有 1 个 unit suite/1 test；P5 的 env、public URL、throttler、cleanup、manifest/补偿纯逻辑按 TDD 新增 Jest。
- 后端 package 的 `pnpm lint` 自带 `--fix`，不能用于只读门禁。只读 eslint 基线为 1268 errors/7 warnings，主要是历史 Prettier；新增文件必须 0/0，修改历史文件做逐文件前后差分且不新增诊断，不扩大 P5 去清全仓格式债。

## 设计订正

- 限流默认按 IP；login/register/refresh 即使携带 token 也按 IP。只有显式标注的 chat/search/upload 使用 user-or-IP，避免根据 URL 猜测或绕过 JwtAuthGuard。
- Prisma transaction 只覆盖数据库。确定性图片先生成/复用，补偿集合只记录本次新建路径；失败回滚 DB 并补偿文件，补偿失败逐项报告并非零退出。
- `seed:demo` 不需要 AI key；`seed:demo:full` 在 seed 后调用 embedding profile。任何 embedding 失败都使组合命令最终非零退出。
- 前端 `VITE_API_BASE_URL` 采用显式注入：无 `.env/.env.local` 时裸 build 应失败；CI/build 显式设置，Playwright 仅通过 `webServer.env` 注入固定测试值。后端 localhost development fallback 只允许存在于集中 config，业务源码静态扫描清零。
- Throttler 默认 storage 是进程内存，P5 只能保证单进程/单实例配额；多实例共享计数需要未来接入 Redis 等共享 storage，明确登记为后续工程债。
