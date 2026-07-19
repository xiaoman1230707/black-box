# O2 实施与验收关闭报告

> 状态：已实现、已人工验收通过并完成行为锁定（2026-07-18）
> 范围：O2.1～O2.5 的实现、完整回归、稳定截图、真实链路、验收后 Playwright 与越界核对
> 约束：未修改既有 46 条 Playwright，未提交 Git，未进入第五期

## 1. 自动验证矩阵

| 门禁 | 结果 |
|---|---|
| 后端 Jest | 17 suites / 74 passed |
| 后端 build | 成功 |
| 后端新增文件 lint | 0 errors / 0 warnings |
| 后端历史修改文件差分 lint | 相对 O2.1 已验收基线无新增；直接扫描共 278 条均为已登记历史格式债 |
| 前端 unit | 16 files / 53 passed |
| 前端 build | 成功，2460 modules transformed |
| O2 前端定向 lint | 0 errors / 0 warnings |
| 前端全量 lint | 3 errors / 0 warnings；仅 `ui/badge.tsx` 1 条、`utils/index.ts` 2 条历史债 |
| Playwright 人工验收前基线 | 8 files / 46 passed；既有 e2e 零修改 |
| Playwright 验收后终态 | 9 files / 51 passed；新增文件定向 5 passed、lint 0/0 |

后端历史文件采用已批准的差分门禁：新增 DTO/spec 直接要求 0/0；`post-query.dto.ts`、`posts.controller.ts`、`posts.service.ts` 与 O2.1 已验收版本一致，未在 O2.2～O2.4 引入新问题。本文不把后端全量表述为 lint 通过。

## 2. 稳定截图证据

截图由 `frontend/black_box/scripts/capture-personal-content-screenshots.mjs` 生成，只使用 route mock、固定登录态、reduced-motion 和稳定锚点，不调用真实 AI 或后端，也不注册产品路由。

### 2.1 默认态 12 张

- 视口：`1440x1000`、`900x1000`、`390x844`、`320x740`。
- 页面：`mine.png`、`my-posts.png`、`my-likes.png`。
- 路径：`docs/qa/post-phase4-personal-content/screenshots/default/<viewport>/`。

### 2.2 专项状态 3 张

- `states/390x844/my-posts-empty.png`
- `states/390x844/my-likes-error.png`
- `states/390x844/my-likes-load-more-error.png`

`layout-metrics.json` 记录全部 15 个状态的 `scrollWidth === clientWidth`。人工抽查确认：桌面列表组合统一 PostItem；390/320 为单列；Mine 两入口不压缩；empty/error/retry 不跳布局；下一页错误完整显示在移动底栏上方；无页面级横向溢出、双滚动或 72px 底栏遮挡。

## 3. 真实 HTTP 与浏览器串验

真实串验使用本机演示账号，密码与 token 只在进程内使用，未输出或写入报告。除一次明确取消既有点赞外，没有数据写入、维护脚本或批量操作。

### 3.1 身份与数据边界

- 匿名 `GET /api/posts/mine`：401。
- 匿名 `GET /api/posts/liked`：401。
- 携带额外 `userId=1` query 时，两接口的 `items id` 与 `total` 均和不带该参数完全一致，证明数据边界仍由 JWT 用户决定。
- 两接口返回公共 Post 字段、数组 tags 和布尔 `likedByMe`；两页 id 无重复。

### 3.2 分页

演示用户当时有 10 篇发布、9 篇收藏，页面固定 `limit=10`，因此真实 UI 不会出现加载下一页。为验证接口分页，使用同一 JWT 只读请求 `limit=5`：

- mine：第一页 5、第二页 5、total 10、两页 id 唯一。
- liked：取消点赞后的第一页 5、第二页 3、total 8、两页 id 唯一。

UI 的自动翻页、去重、busy/竞态和下一页错误重试由 11 条共享列表 unit 与稳定 mock 专项状态覆盖；未伪造真实 UI 存在第二页。

### 3.3 页面链路

- Mine 两个入口分别进入 `/mine/posts`、`/mine/likes`；390px 命中区均大于 44px，页面无横向溢出。
- 头像 Drawer 可打开并取消关闭；未选择文件，未产生上传写入。
- 我的发布进入真实 PostDetail，浏览器返回后重新请求第一页并恢复列表。
- 我的收藏进入帖子 117，详情显示 liked；执行唯一一次 DELETE like 后按钮恢复 idle。
- 返回收藏页会重新请求第一页，帖子 117 消失；权威 API total 从 9 降为 8，且不再包含该 id。
- 匿名直达 `/mine/posts`、`/mine/likes` 均由 RequireAuth 导向 `/login`。
- 退出登录后进入 `/login`；浏览器未出现 pageerror。

empty、首屏 error+retry、下一页 error+retry 使用稳定 mock 验证；并发删除后的数据库级级联与 PostDetail 不可用状态沿用既有后端/前端测试，不在 O2.4 制造额外真实删除。

## 4. 既有能力回归

- Mine 头像上传完整 Drawer→关闭→Loading→反馈控制流未修改，由 Mine unit、既有 Playwright 与代码 diff 锁定；真实串验只执行无写入的打开/取消。
- 退出、Home tag×game、Search、Chat、点赞/评论及 O1 assistant Markdown 均由现有 46 条 Playwright 回归覆盖。
- O2 未修改 Home store、Search、Chat/SSE、PostDetail 业务逻辑、点赞写接口、评论、Markdown renderer 或 O1 文件。

## 5. 受保护文件与工作树

- `protected-files-before.sha256` 与 `protected-files-after.sha256`：65 项 / 0 mismatch。
- `CLAUDE.md` 在清单中且哈希一致；用户原有改动未被编辑、格式化或覆盖。
- Prisma schema/migrations、package/lock、既有 e2e、原型及其他禁改范围哈希一致。
- 没有执行 reset、checkout、clean、stash 或 Git commit。

## 6. O2.5 验收后行为锁定

用户确认 O2.4 人工验收通过后，新增 `frontend/black_box/e2e/personal-content.spec.ts`，没有修改或弱化既有 46 条。五条稳定用例只断言 URL、query、testid、可见文本和请求方法：

1. 匿名访问 `/mine/posts`、`/mine/likes` 均重定向 `/login`。
2. Mine 两个入口分别进入我的发布与我的收藏。
3. 我的发布按 page/limit 翻页、append 去重并进入详情。
4. 我的收藏只读取 liked 列表，翻页并进入详情。
5. 详情取消点赞后返回收藏页重取首屏并移除该帖。

定向结果为 5 passed；最终列表为 9 files / 51 tests，全量 51 passed。测试不包含 CSS 类、DOM 层级或像素断言。

## 7. 最终状态

O2 已实现并经用户人工验收通过，foundation、06 设计、QA 与 planning 已回填。O2 已关闭；未提交 Git，未自动进入第五期。
