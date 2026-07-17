# 第四期 P4 调研发现

## 已确认约束

- Markdown 技术栈固定为 `react-markdown + remark-gfm + remark-breaks + rehype-sanitize`，禁止 raw HTML 路径。
- `Post.content` 原样存储 Markdown；Compose/PostDetail 只改表现层，Chat 保持纯文本。
- 全局单一 Toaster；PostDetail 唯一 `window.confirm` 改 AlertDialog；统一状态组件不得重排 P3 信息结构。

## 代码事实

- `frontend/black_box/package.json` 当前没有 `react-markdown`、`remark-gfm`、`remark-breaks`、`rehype-sanitize` 或 `sonner`，P4 实施会产生明确 package/lock 依赖差异；本轮不安装。
- `radix-ui` 聚合依赖已存在，lock 中已有 Radix AlertDialog/Dialog/Toast；但现有 Select 使用 `@base-ui/react`、Drawer 使用 Vaul。经本地类型核对，AlertDialog 继续使用 `@base-ui/react@1.3.0`，不因 lock 命中引入另一套 primitive。
- 当前没有 AlertDialog、Toaster、PageState、Skeleton 或 MarkdownRenderer；`main.tsx` 只挂载 ErrorBoundary + Router。
- `PostDetail` 仍有唯一 `window.confirm`；既有 `social.spec.ts` 通过原生 dialog 监听接受，P4 实施时该既有测试需要最小控件交互适配，但不得改变删除业务断言或用例数量。
- P3 已预留 `Compose[data-slot="markdown-editor"]`、`Search[data-slot="search-state"]` 和 PostDetail `post-body` 等组合接缝。
- `@base-ui/react@1.3.0` 本地类型明确导出 AlertDialog `Root/Backdrop/Close/Description/Popup/Portal/Title/Trigger/Viewport`，且 Root 固定 modal、禁止 pointer dismissal；P4 可沿用 Base UI，不需新增 AlertDialog primitive 依赖。受控 open、busy、取消/确认按钮和关闭时机仍由页面控制。
- `main.tsx` 当前结构为 `ErrorBoundary > RouterConfig(BrowserRouter) > App(BackToTop)`；Toaster 不依赖 Router，可作为 `RouterConfig` 同级但仍在 ErrorBoundary 内挂载一次。Base UI AlertDialog Portal 会进 body，继续受 `<body translate="no">` 覆盖。
- 现有 `Loading` 是 fixed 全屏 overlay，承担 Suspense 和 Mine 上传 busy；不能拿它替代内容区 PageState/Skeleton。P4 应保留该全局职责，新增状态组件只替换页面内部重复状态块。
- `Search` 已有真实 idle/loading/error/empty/success 和 retry；`PostDetail` 有首屏 loading、post 缺失 empty，但 fetch 异常与不存在目前合流，comments 异常也与 empty 合流；若 P4 要满足“首屏失败显示 ErrorState”，只允许增加不持久化的本地 UI error 元数据，不改变请求/API。
- `Home` store 没有可靠 error channel，只能迁移已有 loading/empty；`Chat` 有 hook error、空会话和生成中；`Mine` 头像上传只记录 console 且必须保持 Drawer 先关再全屏 Loading；`Compose` 有 action error 字符串并保持逐文件上传、部分成功不回滚。
- `PostDetail` 的点赞失败已有局部 inline error；评论创建/删除失败仅 console，删除唯一 `window.confirm`。P4 可接 toast/Dialog，但必须保留 optimistic like 回滚、评论重拉、Home `patchPost` 和删除失败保留评论。
- `fetchPostById()` 在前端 API helper 内捕获所有错误并返回 `null`；PostDetail 无法区分 404/网络失败，Compose 创建后回拉也依赖该语义。P4 不改 API helper，因此 PostDetail 只能把 null 统一呈现为“不可用/不存在”并提供重试，不能伪造精确 ErrorState。
- `fetchPosts()`/`fetchTags()` 同样吞错返回空集合，`useHomeStore` 没有 error；Home P4 只能用 Skeleton/EmptyState 统一已有状态。若要区分失败需另行改变数据层错误契约，明确不在 P4。
- Compose 当前发送 `normalizedContent = content.trim()`。P4 的“存原始 Markdown”口径是“不预渲染/不存 HTML”，不是改变已验收的 trim payload；预览读取同一未转换 content state，提交继续沿用 trim。
- 前端没有单元测试 runner。为在人工验收前对 URL/XSS/旧换行与错误映射做红绿测试，方案增加 `vitest@4.1.10` devDependency 与 `test:unit`；使用 Node 环境和已有 `react-dom/server`/MemoryRouter，不增加 jsdom。新增 e2e 仍严格延后到 P4 人工验收后。
- 新运行时依赖拟固定到已核元数据：`react-markdown@10.1.0`（React >=18）、`remark-gfm@4.0.1`、`remark-breaks@4.0.0`、`rehype-sanitize@6.0.0`、`sonner@2.0.7`（支持 React 19）。

## 设计差异

- 实施主计划预写的 `@base-ui/react/alert-dialog` 已由本地类型核实成立；04 设计中遗留的“Radix/shadcn primitive”历史描述已订正为 Base UI 1.3 真实 parts API，不新增第三套 primitive。
- 04 §7.2 写 Home 错误重试、§8.2 要求首屏失败 ErrorState，但真实 Home/PostDetail API helper 会吞错；按“不改 API/状态流”高优先级约束，设计需订正为只在真实 error channel 存在时分离 ErrorState，并把数据层错误可观测性登记为后续工程债。
- “Post.content 原始 Markdown”与现有 Compose `trim()` 并不要求更改 payload；设计需明确 raw 指不转换 HTML，继续保持已验收的首尾 trim。

## 最终方案决议

- P4 按共享 primitive/状态 → Markdown policy/renderer → Home/Search/Chat 状态接线 → Compose 编辑预览 → PostDetail/Dialog 与 Mine/Login 反馈的 5 个 task 顺序实施，各 task 可独立验证和回滚。
- Markdown 仅接受 GFM 白名单并保留旧帖单换行；链接和图片分别使用独立 URL 允许规则，拒绝 raw HTML、危险协议、控制字符、反斜杠和协议相对 URL。
- Sonner 只挂一个 Toaster；toast 通过稳定 id 去重。评论删除使用单例受控 Base UI AlertDialog，取消初始聚焦，异步失败保留 Dialog 与数据。
- 删除成功后原删除按钮会随评论节点卸载，不能无条件恢复触发按钮。最终契约为：取消/Esc 返回原按钮；失败保持 Dialog 内焦点；成功时触发按钮仍连接则返回，否则通过 `finalFocus` 或受控逻辑聚焦 `comments-heading`/评论列表稳定锚点。
- PageState/Skeleton 只统一 P3 已有组合槽，不取代 Suspense/Mine 上传使用的 fixed Loading，也不为吞错的数据源伪造 ErrorState。
- 实施前单元测试可使用 Vitest Node/SSR 按 TDD 编写；P4 新增 Playwright 必须等用户人工验收通过后再创建。

## 实施实测补充

- Vitest 若直接沿用产品 Vite 配置，会加载 mock plugin 并误收集 Playwright spec；最终使用独立 `vitest.config.ts`，只收集 `src/**/*.test.{ts,tsx}`，稳定基线为 4 files / 14 passed。
- Base UI Dialog 在异步删除失败后，确认按钮由 disabled 恢复时浏览器可能把焦点落到 `body`；页面必须在失败状态结束后显式聚焦 Cancel，才能满足“失败保持 Dialog 内焦点”。该路径及成功后 `comments-heading` fallback 均已实测通过。
- P4 最终静态与行为门禁为：范围 lint 0/0、全量 lint 4/0、build 最终复验 2453 modules、Playwright 7 files/41 passed、四视口截图 28/28；用户已于 2026-07-16 人工验收通过，原阻塞全部关闭。
- `loadComments()` 会吞掉刷新异常并返回 `null`，所以 DELETE 已成功后不能把可见状态完全委托给刷新；最终采用“本地评论树先提交删除、刷新只做校准”的契约。这样刷新失败只影响最新列表校准，不会让已被服务端删除的节点继续显示。
