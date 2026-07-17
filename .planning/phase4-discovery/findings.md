# 调研发现

## 设计权威与阶段进度
- 权威链：`01-分期概要设计.md`（范围）→ `00-foundation.md`（token/全局组件/App Shell 契约）→ 各期详细设计（功能事实来源）。原型值与概要冲突时，以 `docs/prototype/css/system.css` 为准。
- 一期：最终 App Shell、三断点、路由守卫、Game/titleEmbedding 数据基础已落地。
- 二期：注册登录、发帖、上传、评论、点赞、数据正确性、首页状态/滚动保持已落地；视觉仅功能可用。
- 三期：embedding/search/chat/game filter 与 rag/git/avatar 删除均已实现并验收；e2e 当前文档记录 41 passed。
- 四期定位：只做视觉落地与收尾，不重复结构、不新增三期后续的游戏专区/详情页。

## 第四期明确承接
- Tailwind v4 `@theme` 接入 foundation token，Neo-Brutalism 全站皮肤与全局组件映射。
- Inter 正式引入；统一 `data-state`；消除内联硬编码颜色/阴影/间距。
- 全页面视觉重构、loading/error/empty/toast/Dialog、Markdown 渲染与 XSS 防护。
- 去硬编码上传 URL、限流/强密钥、旧文件清理、丰富演示 seed。
- 暗色模式不启用；保留机制但不提供切换入口。

## 已知边界/遗留
- 游戏专区页/游戏详情页属于三期后续迭代，不应塞入四期。
- 浏览量自增是后续待办，可并入四期收尾但并非已焊死。
- 个人中心 profile/my-posts/my-likes 尚未形成第四期明确范围，需设计时单独判断，不能从原型直接照搬。

## 原型核对
- 原型共有 10 页：home、search-results、post-detail、compose、chatbot、auth、profile、edit-profile、my-posts、my-likes。
- 已有功能页可作为四期视觉参照：home/search/post-detail/compose/chat/auth/Mine；profile/edit-profile/my-posts/my-likes 含未完成业务能力，不能仅凭原型纳入四期。
- `system.css` 是视觉数值权威：奶黄 `#fff8d7`、墨色 `#1d1836`、橙 `#ff6b00`、2px 墨边、2/4/6px 硬阴影、Inter、1024/760 响应断点。
- 原型脚本 `app.js` 仅为静态演示：DOM class 切换、假点赞、客户端卡片过滤、轮播和下拉刷新；React 落地复用意图，不复用脚本。
- 原型页面仍有大量 inline style、`.active/.liked` class、原生 alert/confirm、假数据；四期须按 foundation 收敛为 token、`data-state`、toast/Dialog 和真实状态。
- Chat 原型有多会话 rail，但三期明确只做单会话内存保持；四期不能因视觉原型擅自新增多会话功能。

## 当前代码核对
- 当前真实业务页 7 个：Home、Search、PostDetail、Compose、Chat、Mine、Login；路由与 App Shell/RequireAuth 已成型，第四期不应重做结构。
- 当前 App.css 仍为 Geist + 旧 oklch shadcn 主题，`.dark` 仍是旧值；foundation 要求四期替换为 Inter + Neo-Brutalism 浅色，暗色入口不开放。
- Sidebar/Topbar/MainLayout 已存在并实现 248/80/底 tab 三态；foundation 中“待新建 Sidebar”属于历史目标描述，四期只做视觉映射与细节校准。
- foundation 契约尚缺 Select、Pill、TagChip、StatButton、CountBadge；现有 Button/Input/Textarea/Avatar/Card/Carousel/PostItem/Sidebar/Topbar 需要改造而非另建平行体系。
- 直接色彩类集中于 Header、SildeShow、Home、Login、Mine、PostDetail；页面还大量使用圆角/柔阴影/渐变，说明旧皮肤残留广泛。
- 仍有硬编码 API/上传 URL：前端 axios/chat 指向 localhost:3000；后端 posts/auth/comments/ai/upload 拼 localhost 上传地址。
- 当前无 Markdown 渲染、sanitize/DOMPurify；帖子详情仍 `whitespace-pre-wrap`，评论删除仍 `window.confirm`。
- 当前无显式限流依赖/模块；强密钥仅由 env 提供，需四期定义校验与部署口径。
- 正式脚本已有 seed-games、seed-demo-posts、backfill-embeddings、rebuild-tags；四期需要在此基础上扩丰富演示 seed，而非重造三期 AI 最小数据集。
- 测试基线：7 个 Playwright 文件，共 41 个测试（list 已确认）。
- 工作树包含前三期大量未提交改动与生成目录；第四期开始前应先建立清晰基线，避免视觉批量改动混入历史 diff。

## 第四期设计前必须拍板/澄清
- 目前没有 `04-phase4-*.md`；按项目纪律，应先写第四期详细设计再改代码。
- profile/edit-profile/my-posts/my-likes、预设头像、浏览量自增、评论 createdAt 均不是已明确的四期核心范围，不能因原型存在就自动实现。
- 四期可明确做：已有 7 页视觉重构、全局组件/token、反馈系统、Markdown/XSS、URL 配置、限流、清理、演示 seed。

## 第四期详细设计复核（2026-07-13）
- 用户已冻结此前不确定项：只迁移 7 页；个人中心扩展、浏览量自增、评论时间均转明确后续债务，因此本期无范围拍板缺口。
- foundation 的组件名存在历史命名差异：契约写 `PostCard` 对应真实 `PostItem.tsx`，写 `Panel/Tile` 对应 `ui/card.tsx`；第四期应保留真实导出名并通过 variant 落契约，避免无收益全局重命名。
- foundation 明确的全局新增组件为 Select、Pill、TagChip、StatButton、CountBadge，并需抽 SearchBar；现有 Button/Input/Textarea/Avatar/Card/Carousel/PostItem/Sidebar/Topbar 走改造路线。
- 真实实现再次确认：`App.css` 仍是 Geist/oklch 旧主题；页面与基础组件广泛存在 `rounded-*`、柔阴影、直接色阶；评论删除仍用 `window.confirm`；ErrorBoundary 仍有 inline style。
- 后端上传 URL 硬编码分布不止早期文档所说的“4 处”，当前在 posts/auth/comments/ai/upload 相关返回映射中均需统一通过 URL 构造服务/助手收口；设计不得照搬旧数量。
- 当前 AI chat 与 search 已稳定落地；四期只能做视觉状态与配置/限流收尾，不改变检索、阈值、SSE、annotation 或 store 语义。

## 04 文档评审补正（2026-07-13）
- Search 现状异常与空结果不可区分；设计允许给 `useSearchStore` 增加不持久化的纯 UI `error` 元数据，但不改变请求、debounce、历史、排序和 suggestions 语义。
- Markdown 旧纯文本单换行需显式兼容，最终库组合增加 `remark-breaks`，并加入单换行/空行分段/列表前文本验收样本。
- `Topbar` 写入 `q` 而 Search 不消费是既存行为缺口；已定为 P0 登记、P2/P3 接 SearchBar 时读取 `q` 并复用现有 `search()`，不扩接口。
- P6 完成条件章号已从十三修正为十四；04 状态改为“已确认”。
