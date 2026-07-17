# 第四期 P6 调研结论

## 最终门禁结论（2026-07-17，已人工验收通过）

- P6.0～P6.5 均已完成；用户独立复核后明确确认 P6 与第四期整批人工验收通过。
- P6.2 发现的真实 user id 跨层类型缺口已获授权修复：登录响应统一数字 id，JWT sub 不变，前端兼容归一化旧 persist 字符串；全量回归与隔离真实链路均通过。
- P6.4 发现的零引用 `src/assets/react.svg` 直接 HEX 残留已获授权删除；复扫 HEX 仅在 App.css token/cover，删除后 build、差分 lint 和 41 条 Playwright 通过。
- P6 未污染真实 `yue`，未重跑 cleanup apply、seed/full 或 embedding backfill；未修改原型、schema/migration 或既有行为断言。
- `AGENTS.md` 已在用户最终确认后同步为一期至四期完成；当前不自动进入第五期。
- 最终用户截图复核推翻了首轮 Compose 移动预览判断：grid container 自身的 `min-w-0` 不足以约束缺少 `min-w-0` 的直接 grid item，内部 `min-w-lg` table 会参与 intrinsic minimum。最小修复后页面 390/390、table scroller 242/512；该结果已重拍并全量回归。
- 受限环境的 `Get-NetTCPConnection` 会漏报宿主已有监听，不能作为 P6 无残留的唯一证据。用户发现的 3000 服务由 netstat/HTTP 复现，提升权限确认是仓库内 `dist/src/main`（PID 13520，父 cmd 33092）；获明确要求后终止。最终端口门禁改以 `netstat -ano` 为权威。

## 已确认基线

- P5.1～P5.10 已获用户整批人工验收通过。
- 前端行为基线仍为 7 个 Playwright spec、41 tests；现有 P4/P5 Vitest 为 11 files/27 tests。
- 后端现有 Jest 为 14 suites/63 tests，另有 `test/app.e2e-spec.ts`。
- P0 默认截图 manifest 固定 7 页 × 4 视口；现有脚本只支持默认态，不支持 P6 的 14 个补充状态。
- P5 数据终态为 35 帖、13 评论、31 点赞、10 File、5 游戏各 7 帖、35/35 embedding（1536 维）；uploads dry-run 为 control 4、referenced 22、orphan 0。
- `start:prod` 已指向 `dist/src/main.js` 并通过隔离生产启动。

## 设计与真实实现差异

1. P6.1 旧文要求所有命令退出 0，但此前批准的前端全量 lint 基线为 3/0，后端全量只读 eslint 也有历史格式债。用户已批准继续采用差分门禁，lint 清债作为独立工程任务。
2. P6.1 旧矩阵漏列 `pnpm test:unit`，但 P4/P5 已有 11 files/27 tests；P6 方案已补入。
3. P6.4 原文要求再次做 cleanup apply 副本演练和两轮 seed；P5 已完成真实 apply、备份 A/B 与两轮 full。P6 只复核证据并做真实库只读统计/dry-run，避免重复写入和 70 次外部 embedding 调用。
4. 真实七页串验包含注册、发帖、评论和上传，会污染已验收的 `yue` 终态。方案改为当前数据/文件的仓库外一次性副本；backend 从临时 cwd 启动，使 `process.cwd()/uploads` 指向副本。
5. P0 只保存工作树路径台账和聚合指纹，没有逐文件 P0 内容快照；P6 对已经在 P0 前脏的 schema/migration 只能做路径级及各批 QA 证据审计，不声称逐字节未变。

## 调查错误

- 首次只读核对截图脚本时已处于 `frontend/black_box`，命令又拼接一次相同路径；同次 `pnpm exec playwright test --list` 也未找到命令。该次没有修改文件、启动服务或形成门禁结果。随后从仓库根以真实路径完成脚本、manifest、测试文件和 package scripts 核对。

## 无范围缺口

- 不需要新增产品路由、接口、字段、migration、依赖或业务能力。
- P6 新增内容仅为 QA 捕获/索引脚本、截图、报告和规划文档。

## P6.2 真实链路阻塞

- 真实注册/登录后，`AuthService.login()` 明确返回 `user.id.toString()`；前端 `User` 契约却声明 `id: number`。
- 评论接口返回 `comment.user.id` 数字，`CommentItem` 以 `currentUserId === comment.user.id` 判断删除入口。真实浏览器诊断得到 store `user.id` 类型为 `string`，因此本人评论的 `delete-comment` 数量为 0。
- 现有 `social.spec.ts` mock 使用数字 user id，41 条回归无法暴露该跨层类型差异。
- 该问题是既存社交行为缺口，不是视觉或 QA runner 问题；P6 不临时修复，需用户确认回到业务责任批次做最小契约统一与回归。
