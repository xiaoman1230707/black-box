# 第四期 P3 调研发现

## 权威约束

- 页面固定为 Home、Search、PostDetail、Compose、Chat、Mine、Login；只迁移现有能力。
- 组件组合必须复用 foundation 与 P1/P2 单一体系；P4/P5 接缝只能预留，不提前实现。

## 代码核对

- `Home.tsx` 仍包含页面私有 sticky 搜索/筛选 header、直接橙色阶、渐变、柔阴影和私有 chip；真实行为全部在 `useHomeStore.loadMore(patch?)`，其中 switch 路径绕 `!hasMore`、响应采纳同时比较 `currentTag/currentGameId`。P3 只能改 Home 组合与事件接线，不能改 store。
- Home 的返回保持由 Zustand 中 `posts` 是否为空决定，滚动由 `sessionStorage['home-scroll']` + 双 rAF 恢复；详情回写和发帖 prepend 也共用同一 store。施工验证必须覆盖详情返回而非只看首次加载。
- `Search.tsx` 现只读取 `category`，未消费 Topbar 的 `q`；500ms debounce 会在 keyword 变化时调用现有 `search()`。P3 需把 URL 初始化与 debounce 去重写清，避免 q 首次触发两次请求；category 继续优先。
- `useSearchStore` 当前只有 `loading/suggestions/history`，失败与成功空结果都写 `suggestions=[]`；04 已明确允许新增非持久化纯 UI `error`。`partialize` 必须仍只保留 `history`。
- Search 的 `suggestions` 类型已经固定为 `Post[]`，页面仍残留一个按字符串建议渲染的 `any` 分支；该分支与真实 store/API 不一致且造成当前 P3 范围 lint error。P3 方案应按真实 `Post[]` 单一路径收敛，不新增另一类建议数据语义。
- Search 当前两个 effect 有缺依赖 warning，页面还有 `any` lint error；P3 差分门禁要求迁移该页时一并归零，但不得扩到范围外文件。
- `PostDetail` 的详情接口真实返回 `content`，页面却把 `brief` 当正文渲染；P3 应在既有 `post-body` 接缝中使用 `post.content ?? post.brief` 保持旧 mock/旧数据兼容，P4 再把同一字符串交给 MarkdownRenderer。该修正不新增字段或接口。
- PostDetail 还有无 handler 的“关注”按钮和“下载 APP 查看完整内容”假提示，应随页面迁移删除；分享、点赞、评论、两层回复、删除确认和 Home 计数回写保留。评论无 `createdAt`，不得补假时间。
- 后端 `findOne()` 未 include/返回 `game` 或 `gameId`，前端 `Post` 类型也无游戏字段；04 的“详情头展示游戏信息”与“不改接口字段”冲突。按范围红线，P3 不展示游戏信息，保留 tags；未来若要展示需独立接口契约，不在四期偷加。
- PostDetail 当前评论栏 `fixed bottom-0 left-0 right-0 z-50` 覆盖整个 viewport；P2 截图已确认移动端与 72px bottom tab 冲突。P3 需按 App Shell 断点：桌面/rail 左侧避让 `--sidebar-w`，移动 bottom 为 `calc(var(--bottombar-h) + env(safe-area-inset-bottom))`，正文底部预留评论栏高度，且评论栏层级低于 Sidebar。
- Compose 真实提交状态为 `title/content/gameId/selectedTagIds/images`；上传是“选图即传、失败不回滚已上传文件”，成功后详情拉全量 Post 并 `prependPost`。P3 只能替换表单组合，不能改变编排。
- Compose 当前 2 个 `any` lint error；P3 迁移文件必须用 `unknown` + Axios 类型守卫保持原错误文案优先级，不提前抽 P4 `api-error` helper。
- Compose 的既有 e2e 用 `selectOption()` 操作 `compose-game`，而 P1 Base UI Select 不渲染原生 `<select>`；“P3 复用统一 Select”与“既有 e2e 不修改且 41 条必须通过”存在直接测试契约冲突。施工方案需显式处理，不能用隐藏双控件伪兼容。
- Chat 页面仅负责渲染，真实 token/SSE/store 单向同步均在 `useChatBot`/`useChatStore`；P3 禁止修改两者。页面可读取 hook 已暴露的 `error` 做兼容错误槽，但不得清消息或增加 stop/regenerate。
- Chat 现有 41 条测试锁定 placeholder `Type your message...` 和按钮 accessible name `Send`；P3 必须保留这些行为锚点，视觉中文化不能破坏既有可访问名称匹配。
- Mine 上传选图后立即关闭 Drawer，再显示全局 Loading；P3 只迁移视觉并隐藏无路由的“我的帖子”，不改变上传关闭时序。上传 toast/失败时保留 Drawer 属 P4 反馈接线，不能提前实现。
- Login 已经独立于 App Shell，但实际品牌栏断点为 `md=768`，foundation 定义 `≤860px` 隐藏；P3 应改为 861px 精确边界。登录/注册、自动登录兜底、强度算法和 token store 均保持。
- 七页当前定向 lint 为 6 errors / 3 warnings：Compose 2、Login 2、Search 1+2 warnings、PostDetail 1+1 warning。Compose/Social 两个因组件迁移必须维护的 spec 另有 4 个 `any` errors；所有 P3 修改 TS/TSX 必须 0/0，因此全量 lint 预期由 14/3 降至 4/0，剩余仅来自未触碰的 api/config、ui/badge、utils。
- P3 现状静态扫描再次确认旧视觉集中在 Home（orange/gradient/shadow/私有 chip）、PostDetail（orange/gradient/大圆角/私有 liked class）、Mine（gray/blue/red shadow）、Login（yellow/green 强度色）和 Chat 唯一引用的旧 Header（gray/dark class）。Search/Compose/Chat 虽直接色阶较少，仍有私有组合和圆角/状态不统一。
- `Header.tsx` 当前只有 Chat 一个引用；Chat 迁移后可按 `rg` 零引用物理删除，不影响其他页面。
- Search 的手动提交去重 ref 不能只在“下一次同值 debounce”时清空：当提交发生在该值 debounce 已完成之后，不会再产生同值 effect，标记会跨过 B 残留并误吞未来的 A。最终契约是下一轮 debounce 无论同值、异值或空值都先消费清空；仅同值跳过，异值继续请求，category 分支也清除标记。

## 设计差异

- 04 的 Home 文案仅写“提交后导航 `/search`”，实施主计划已具体化为 `/search?q=`；这与已批准的 Topbar q 契约和 Search 消费 q 一致，不构成范围扩大，P3 统一采用编码后的 `/search?q=`。
- Search 设计提到“历史/建议现有语义”，真实 store 已不存在字符串 suggestion 类型，仅保留 `Post[]` 结果；施工方案按真实类型删除页面死分支，保留 history、category 和语义搜索三条真实行为。
- 04 要求 PostDetail 展示游戏信息，但当前 API/类型没有该字段；按同文“不改接口字段/业务语义”高优先级约束，需把 P3/P4 页面目标订正为“不显示游戏信息，不伪造；仅展示真实 tags”。
- 04 的 Mine 目标写“上传失败保留 Drawer”，真实实现是选图即关闭并显示 Loading；该交互变化属于 P4 统一反馈阶段，P3 方案保持现状时序，只固定反馈接缝。
- 04/实施主计划要求 Compose 使用 P1 Select，但既有行为 e2e 明确依赖原生 select。P3 方案已采用最小测试维护：只把 `selectOption()` 改为按 combobox/option 操作，41 条数量和业务断言不变、不新增 e2e；不采用隐藏原生 select + 自定义 Select 的双控件伪兼容。
- Search 的关键词高亮若页面自己重画卡片会违反唯一 PostItem 契约；P3 方案选择给 PostItem 增加可选 `highlight?: string` 纯展示 prop，并在实施前回填 foundation。默认路径不变，不形成搜索专用卡。
- PostDetail 私有 `unliked` 状态与 P1 StatButton 的 `liked|idle` 契约不一致；P3 使用 P1 契约，并只维护 Social spec 的状态字面量。两个被触及 spec 的既有 `any` 同步改为明确 mock 类型，是差分 lint 门禁所需，不扩到其他测试。
