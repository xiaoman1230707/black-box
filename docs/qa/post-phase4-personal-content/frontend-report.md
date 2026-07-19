# O2 前端实施证据

## O2.2 共享列表、API 与路由

状态：已实施并经用户确认；后续已进入 O2.3～O2.4。

### 范围

- `src/types/index.ts`：`PostsResponse` 补齐 `total`，新增 `PersonalPostListKind`。
- `src/api/personal-posts.ts`：新增 `/posts/mine` 与 `/posts/liked` 两个 helper；只透传 page、limit、AbortSignal，不读取 token 或 userId，不捕获异常。
- `src/pages/personal/personal-post-list-state.ts`：集中定义本地状态、按 id 去重与 `hasMore` 纯逻辑。
- `src/pages/personal/PersonalPostListPage.tsx`：唯一共享容器与视图，组合既有 `PostItem`、`PageState`、`InfiniteScroll`、`Button`；长列表继承 `App.tsx` 的全局唯一 `BackToTop`。
- `src/pages/MyPosts.tsx`、`src/pages/MyLikes.tsx`：仅传固定 kind 的薄页面。
- `src/router/index.tsx`：新增 `/mine/posts` 与 `/mine/likes` 两条 `RequireAuth` 路由。
- 未修改 Mine 入口、后端、数据库、Home store、PostDetail、依赖、配置或既有 Playwright。

### TDD 证据

- RED：`personal-posts.ts`、`PersonalPostListPage.tsx` 与状态 helper 尚不存在时，2 个测试文件均因缺少目标模块失败。
- GREEN：定向 Vitest 为 `2 files / 11 passed`。
- API 测试覆盖 URL、page/limit、AbortSignal、默认分页与同一异常对象透传。
- Node/SSR 测试覆盖 loading、published/liked empty、首屏 error+retry、保留列表的翻页 error+retry、权威 total、完整 PostItem 输入、去重顺序和 total 下降后的分页停止。

### 状态与竞态审查

- 页面仅使用 React 本地状态，不使用 Zustand、sessionStorage 或 Home store。
- 同一时刻 busy 锁阻止重复请求；request id 与 AbortController 防止卸载后的旧响应写回。
- 下一页成功按 Post id 去重并保留首次出现顺序；`hasMore` 使用去重后长度与最新 total。
- 下一页失败不清空已加载列表；错误存在时关闭 InfiniteScroll 自动观察，局部重试由用户显式触发。
- 首屏错误与 empty 分离；Abort 不显示错误。

### 自动验证（2026-07-18）

| 门禁 | 结果 |
|---|---|
| O2.2 定向 Vitest | 2 files / 11 passed |
| 前端全量 unit | 15 files / 50 passed |
| O2.2 定向 ESLint | 0 errors / 0 warnings |
| 前端全量 ESLint | 历史基线 3 errors / 0 warnings；仅 `ui/badge.tsx` 1 条、`utils/index.ts` 2 条 |
| 前端 build | 成功，2460 modules transformed |
| Playwright 列表 | 8 files / 46 tests |
| Playwright 全量 | 46 passed |
| 受保护文件 SHA-256 | 65 项，0 mismatch；包含 `CLAUDE.md` |
| `git diff --check` | 无补丁错误；仅既有 CRLF 提示 |
| 端口 | 3000、5173 无监听 |

### 环境说明

沙箱权限下 pnpm store 与 `node_modules` 读取返回 EPERM；全部 Node 工具在正常权限下执行并获得上述结果。未安装依赖、未修改 lockfile、未改权限。

### 检查点

O2.2 的共享实现、状态边界和两条受保护路由已获用户确认；该阶段未修改 Mine、未新增 Playwright、未提交 Git。

## O2.3 Mine 两个真实入口

状态：已实施并经用户确认；后续已进入 O2.4。

### 实现与范围

- 仅修改 `src/pages/Mine.tsx` 并新增 `src/pages/Mine.test.tsx`。
- 在账户摘要 Card 与退出按钮之间新增“个人内容”section。
- “我的发布”与“我的收藏”使用现有 Base UI `Button` 的 `render` 接口承载 React Router `Link`，目标分别为 `/mine/posts`、`/mine/likes`。
- Link 明确设置 `nativeButton={false}`，保留原生链接语义、键盘访问和现有 `focus-visible` 契约。
- 布局为默认单列、`sm` 起两列；每个入口 `min-h-20`，高于 44px 交互目标，文案允许换行。
- 未读取个人列表 API、未显示计数、未增加 Sidebar 或全局导航项。

### TDD 与控制流审查

- RED：3 条 Mine 聚焦测试中，仅语义入口测试因目标 testid 不存在而失败；账户摘要、头像上传、退出锚点已先行通过。
- GREEN：`1 file / 3 passed`，覆盖 href/文案、零预取、无虚构数量与原账户操作存在性。
- `git diff` 复核确认 `handleAvatarUpload`、Drawer open/close、Loading、feedback 和 logout handler 均未修改。
- 首轮完整回归发现 Base UI 控制台错误，定位为 Link 缺少 `nativeButton={false}`；最小修正后完整回归日志不再出现该错误。

### 自动验证（2026-07-18）

| 门禁 | 结果 |
|---|---|
| Mine 定向 Vitest | 1 file / 3 passed |
| 前端全量 unit | 16 files / 53 passed |
| Mine 定向 ESLint | 0 errors / 0 warnings |
| 前端全量 ESLint | 历史基线 3 errors / 0 warnings；无新增 |
| 前端 build | 成功，2460 modules transformed |
| Playwright | 8 files / 46 passed；未修改既有 e2e |
| Base UI 控制台 | Link 语义修正后无相关 error |
| 受保护文件 SHA-256 | 65 项，0 mismatch；包含 `CLAUDE.md` |
| `git diff --check` | 无补丁错误；仅既有 CRLF 提示 |
| 端口 | 3000、5173 无监听 |

### 检查点

O2.3 的 Mine 入口与头像/退出回归已获用户确认；该阶段未新增 Playwright、未提交 Git。
