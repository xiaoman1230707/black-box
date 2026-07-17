# P5.9 AI 外部链路有限失败验证

日期：2026-07-17  
状态：实现、自动门禁与用户人工复验通过；P5.9 已关闭。其后的 `start:prod` 部署脚本已由 P5.10 收口，用户已确认 P5.1～P5.10 整批人工验收通过。

## 1. 问题与根因

- P5 首轮真实串验中，Search 超过 50 秒仍为“搜索中”，Chat 超过 30 秒仍为“正在生成回答”。
- 两条链路共享 `EmbeddingService.embed()`；最小外部诊断中 embedding 恢复后仍约 11.8 秒，DeepSeek 首字节约 0.4 秒，说明共同风险点是 embedding 中转波动。
- LangChain/OpenAI 客户端此前未设置有限 timeout 且保留自动重试；Search 后端失败结果会被前端当 EmptyState；Chat 已提交响应后的 catch 仍尝试修改 HTTP status；Axios 无 response 时直接读取 `response.status` 会产生二次 TypeError。
- 精确 CORS 拒绝 `127.0.0.1` 是既定配置契约，不是本次故障，未扩大允许范围。

## 2. 最终契约

- `AI_EMBEDDING_TIMEOUT_MS=20000`、`AI_CHAT_TIMEOUT_MS=30000`，正整数 runtime/embedding profile 校验；SDK `maxRetries:0`。
- Search axios 上限 25 秒；后端 `code !== 0` 映射既有 ErrorState，不显示 EmptyState。
- Chat 引用检索超时降级为无引用普通聊天；模型流总上限 30 秒。
- Chat 未提交响应的 timeout 返回 504；已提交 data stream 后写 AI SDK v1 `3:` error part并结束。
- Chat custom fetch 55 秒总兜底，保留调用方 AbortSignal；JWT、`0:/8:/d:`、annotation 和单会话 store 不变。
- Axios 无 response/config 不进入 refresh；`ECONNABORTED`/`ETIMEDOUT` 使用独立超时文案。

## 3. 自动验证

- 后端定向 lint：P5.9 全部新增/修改 TS 文件 `0 errors / 0 warnings`。
- 后端 Jest：`13 suites / 62 passed`。
- 后端 build：通过。
- 前端定向 lint：`0 errors / 0 warnings`。
- 前端全量 lint：批准基线 `3 errors / 0 warnings`，仅 `ui/badge.tsx` 与 `utils/index.ts`。
- 前端 Vitest：`11 files / 27 passed`。
- 前端显式 `VITE_API_BASE_URL` build：通过，`2456 modules transformed`。
- Playwright 列表：`7 files / 41 tests`；全量 `41 passed`。

## 4. 真实服务复验

使用唯一后端实例 `localhost:3105`，现有验收账号登录；未输出 token、连接串或 key。

- Search“玛莲妮亚打法”：外部 embedding 本轮仍未在 20 秒内完成；接口在 `20030ms` 有限返回 HTTP 200、`code=1`，不再无限 pending。前端单测锁定该结果进入 ErrorState。
- Chat“黑神话有什么攻略”：引用 embedding 在 20 秒 timeout 后降级为空引用；DeepSeek 随后完成流式回答。结果 HTTP 201，首字节 `20749ms`，总耗时 `37544ms`，`x-vercel-ai-data-stream=v1`，存在 `0:` 与 `d:`，无 `3:`；因检索降级，本轮无 `8:` annotation，符合契约。
- deterministic 单测另行覆盖模型永不启动、未提交 504、已提交 `3:` error part 和客户端 55 秒 abort，避免把供应商偶然恢复当作超时验证。

## 5. 环境清理与剩余门禁

- 临时 smoke 脚本已删除；3105 验收后端已停止。
- 3000、3105、5173 最终均需保持无监听。
- 本轮没有修改 CORS、数据库、seed、uploads、限流或既有 Playwright。
- Search 成功结果与 Chat 带引用仍受当前 embedding 供应商可用性影响；用户需在供应商恢复到 20 秒内时人工复验成功链路。有限失败本身已有确定性自动证据。
- 运行 `pnpm start:prod` 时发现既有脚本指向 `dist/main`，而当前 Nest build 产物位于 `dist/src/main.js`；本轮为避免扩大 P5.9，仅用真实产物入口完成 smoke，未修改 package script。该部署脚本缺口需在进入 P6 前单独收口。

## 6. 用户人工复验

- Search：慢 embedding 最终进入明确可重试 ErrorState，无无限 loading、无伪空结果、控制台无错误。
- Chat：约 23.6 秒开始流式，约 43.6 秒完成；输入恢复，无引用、无残留生成状态、无横向溢出或控制台错误。
- 数据保持 35 帖、13 评论、31 点赞、10 File；P5.9 于 2026-07-17 获人工确认通过。
