# 四期功能详细设计：视觉落地 + 收尾打磨

> 版本：v1 · 日期：2026-07-13 · 状态：已实现、已人工验收通过（2026-07-17）  
> 适用范围：第四期实现的事实来源。上游范围权威为 `01-分期概要设计.md` 第四期与第十一章；前端设计契约权威为 `00-foundation.md`；已实现业务行为分别承接 `01-phase1-skeleton.md`、`02-phase2-social.md`、`03-phase3-ai-gamification.md`。

---

## 一、文档定位、事实来源与术语

### 1.1 文档定位

本文件是第四期唯一的详细设计文档，负责把 foundation 已定义的视觉语言落到真实工程，并完成作品集演示前的工程收尾。后续实施计划、代码改造、人工验收和回归均以本文件为依据。

第四期不是重新设计产品或业务架构，而是对前三期已经成立的页面、路由、接口和状态流做一次完整、可回归的系统迁移。每个页面只迁移一次，禁止“局部换皮后再重做”。

### 1.2 事实来源优先级

发生冲突时按以下顺序裁定：

1. `docs/design/01-分期概要设计.md`：分期范围总纲。
2. `docs/design/00-foundation.md`：token、全局组件、App Shell、响应式与交互契约。
3. `01-phase1-skeleton.md`、`02-phase2-social.md`、`03-phase3-ai-gamification.md`：已经实现的业务行为和接口事实。
4. 当前真实代码：验证实际落地状态，不用历史描述覆盖现状。
5. `docs/prototype/css/system.css`：第四期视觉数值权威。
6. `docs/prototype/screens/*.html` 与 `docs/prototype/js/app.js`：仅用于理解视觉和交互意图，不作为业务实现依据。

根目录 `AGENTS.md` 已完成最终阶段同步：一期至四期均已实现并人工验收通过；当前不自动进入第五期。后续工作仍以设计、实施计划、QA 证据和真实代码共同核对，不让历史阶段描述覆盖事实。

### 1.3 术语

- **Neo-Brutalism**：本项目的浅色视觉语言，核心是奶黄页面底、白色表面、墨色 2px 描边、橙色强调和实心偏移硬阴影。
- **token**：由 `App.css` 的 Tailwind v4 `@theme` / CSS 变量暴露的颜色、字体、圆角、阴影、动效和间距语义值。
- **全局组件**：跨两个及以上页面复用、受 foundation 契约约束的组件。
- **页面级组件**：仅服务单页信息结构，可组合全局组件，但不得自建颜色、阴影、圆角或状态体系。
- **行为测试**：现有 Playwright 对路由、请求、状态和交互结果的断言，不断言 CSS 类名、DOM 层级或像素。
- **视觉验收**：按指定视口人工检查并保存截图基线，覆盖整体层级、溢出、状态和响应式形态。

---

## 二、目标、范围与非目标

### 2.1 本期目标

1. 把 foundation token 正式接入 Tailwind v4，以 `system.css` 数值落地全站 Neo-Brutalism 浅色主题。
2. 把现有 7 个业务页面迁移到同一套全局组件契约，消除旧 shadcn 皮肤和页面私有视觉体系。
3. 统一 loading、empty、error、disabled、success、确认与异步反馈。
4. 在不改变帖子字段和接口语义的前提下，为 Compose 增加 Markdown 编辑/预览，为 PostDetail 增加安全渲染。
5. 收口 URL 配置，增加敏感/高消耗接口限流和强密钥启动校验，提供安全文件清理与丰富演示 seed。
6. 保持现有 41 条 Playwright 行为基线，并用多视口人工验收和截图回归完成视觉定稿。

### 2.2 本期包含

- 现有页面：`Home`、`Search`、`PostDetail`、`Compose`、`Chat`、`Mine`、`Login`。
- App Shell：`MainLayout`、`Sidebar`、`Topbar`，只做视觉与细节校准，不改变一期结构。
- 全局组件：改造现有组件，新增 foundation 已定义但尚缺的组件，抽取 `SearchBar`。
- 内容和反馈：Markdown、安全渲染、toast、Dialog、统一状态组件。
- 工程收尾：URL、限流、密钥、文件清理、演示 seed。

### 2.3 明确非目标

- 不新增 `profile`、`edit-profile`、`my-posts`、`my-likes` 页面、路由、接口或业务能力；原型只提供视觉语言。
- 不实现 `viewCount` 进入详情自动加一，不设计访客去重、并发计数或写接口；本期仅读取和展示数据库现值。
- 不给 `Comment` 增加 `createdAt`，不创建 migration；评论区不显示伪造时间或占位时间。
- 不新增游戏专区页、游戏详情页、多会话 AI、预设头像、正文 embedding、改帖功能。
- 不改变 AI 检索模型、相似度阈值、SSE 协议、annotation 引用或 `useChatStore` 单会话内存语义。
- 不改 JWT 存储模式、token 刷新机制、路由守卫语义、帖子/评论/点赞/上传接口字段。
- 不重建 App Shell、路由、首页 store、滚动恢复或三断点结构。
- 不定义或开放暗色主题入口；保留机制不等于暗色可用。
- 不实施对象存储、CSP、Helmet、HttpOnly Cookie 等生产级平台改造。

### 2.4 已拍板决议

- 一份权威文档，内部按 P0～P6 独立实施、独立验收。
- 只迁移 7 个真实页面；个人中心扩展、浏览量自增、评论时间均列为后续债务。
- 首页内容类型 tag 仍是主筛选，游戏 chip 仍是第二行补充筛选；两者 AND 和独立 toggle 行为不变。
- Chat 仍为单会话、不落库，切走返回保持、刷新可丢。
- 第四期只能改变呈现和工程配置，不借机重构前三期业务语义。

---

## 三、当前基线与差距

### 3.1 已存在且必须保留

| 领域 | 当前真实状态 | 第四期处置 |
|---|---|---|
| 页面与路由 | 7 页；`/login` 独立，其他页在 `MainLayout`；`/search`、`/chat`、`/mine`、`/compose` 有 `RequireAuth` | 保留路由与守卫 |
| App Shell | `MainLayout.tsx` + `Sidebar.tsx` + `Topbar.tsx` 已实现 248/80/移动底 tab | 只迁移视觉、校准尺寸 |
| 首页状态 | `useHomeStore` 保存列表、tag/game 双筛选、分页与竞态保护；sessionStorage 恢复滚动 | 不改数据流 |
| Chat | DeepSeek 流式、JWT、站内引用、annotation chip、内存对话保持 | 只做视觉与状态反馈 |
| 搜索 | `text-embedding-3-small` 标题向量库内余弦，返回真实帖子 | 只做视觉与关键词呈现 |
| 社交 | 登录注册、发帖上传、点赞、评论回复/删除、头像上传 | 保留行为与接口 |
| 测试 | 7 个 Playwright 文件，`--list` 基线 41 tests | 全量保留 |

### 3.2 需要改造的视觉基线

- `frontend/black_box/src/App.css` 仍加载 Geist，并使用旧 oklch shadcn 主题；`.dark` 仍是旧主题值。
- `Home`、`Mine`、`Login`、`PostDetail`、`PostItem`、`SildeShow`、`Header`、`BackToTop` 等仍有直接色阶、柔阴影、渐变和大圆角。
- `button.tsx`、`input.tsx`、`textarea.tsx`、`card.tsx`、`avatar.tsx`、`carousel.tsx` 等仍是 base-nova 默认外观。
- 页面中相同语义使用不同结构和样式；loading/error/empty/success 缺少统一组件。
- 选中态已有部分 `data-state`，但仍有模板字符串直接切颜色的页面私有写法。

### 3.3 需要新增或补齐的能力

- UI：`Select`、`Pill`、`TagChip`、`StatButton`、`CountBadge`、`SearchBar`、toast、Dialog、统一状态组件。
- 内容：当前 Compose 只写纯文本，PostDetail 用 `whitespace-pre-wrap`；无 Markdown 渲染与 sanitize 依赖。
- 配置：前端 axios/chat 和后端媒体 URL 均有 `localhost:3000` 硬编码。
- 安全：当前无明确限流模块；`TOKEN_SECRET` 可为空字符串，AI key 与 URL 无启动期校验。
- 运维：旧头像、孤儿上传文件无安全清理流程；三期 seed 仅是 14 帖 AI 最小数据集。

### 3.4 历史文档与真实代码差异

1. foundation 3.11 的“Sidebar 新建”是一期前历史描述；真实代码已经存在 `Sidebar.tsx`，本期是改造而非新建。
2. foundation 的 `PostCard` 对应真实 `PostItem.tsx`，`Panel/Tile` 对应真实 `ui/card.tsx`。本期保留真实文件/导出名，通过 props 和 variant 落契约，不为命名一致做高风险全仓重命名。
3. 二期文档提到上传 URL “4 处”已过时；当前命中分布于前端 axios/chat 及后端 posts/auth/comments/ai/upload。第四期按统一构造入口收口，不按旧数量验收。
4. `AGENTS.md` 原“当前是二期”阶段说明已过期；本文件确认后已同步更新为“前三期完成、第四期进入 P0 实施计划阶段”，不再让旧阶段描述覆盖设计和代码事实。
5. `Topbar.tsx` 当前提交关键词会导航到 `/search?q=...`，但 `Search.tsx` 只读取 `category`，不消费 `q`，因此顶栏关键词名义上传入、实际不触发搜索。该项登记为 P0 既存行为缺口；第四期允许在 P2/P3 随共享 SearchBar 接线修正：Search 读取一次 `q`、同步输入框并调用现有 `search()`。修正不新增接口、不改变 debounce、结果排序、历史记录或持久化语义。

---

## 四、token 映射与迁移原则

### 4.1 单一来源

`docs/design/00-foundation.md` 第二章是 token 命名权威，`docs/prototype/css/system.css` 是视觉数值权威。本文件不另建命名体系，只规定第四期如何接入和清理。

核心映射如下；完整值仍以 foundation 为准：

| 语义 | token | 值/来源 |
|---|---|---|
| 页面底 | `--color-background` | `#fff8d7` |
| 主文字/前景 | `--color-foreground` | `#1d1836` |
| 强描边/硬阴影 | `--color-ink` | `#1d1836` |
| 卡面 | `--color-card` | `#ffffff` |
| 品牌强调 | `--color-primary` | `#ff6b00` |
| 暖色表面 | `--color-surface-warm` | `#ffef9f` |
| 二级文字 | `--color-foreground-2` | `#4c426c` |
| 弱文字 | `--color-muted-foreground` | `#796f91` |
| 状态色 | `--color-success/warn/destructive` | foundation 2.3 |
| 内容类型色 | `--color-type-news/guide/help/review/event` | foundation 2.3 |
| 圆角 | `--radius-sm/md/lg/pill` | `10/16/24/9999px` |
| 硬阴影 | `--shadow-sm/md/lg/hover` | `2/4/6/7px` 偏移体系 |
| 字体 | `--font-sans`、`--font-heading` | Inter Variable |
| 动效 | `--motion-fast/base`、`--ease-standard` | `150ms/240ms` |
| 布局 | `--container-max/gutter`、`--section-y` | foundation 4.3 |

### 4.2 Tailwind v4 接入

- 在 `frontend/black_box/src/App.css` 的 `@theme inline` / `:root` 中覆写现有语义槽位，并加入 foundation 的扩展 token。
- 正文、标题和 mono 字体通过 `--font-sans`、`--font-heading`、`--font-mono` 暴露；移除 Geist import，改为安装并加载 `@fontsource-variable/inter`，使用本地依赖而非运行时 CDN。
- `.dark` 结构可以保留，但不得继续暴露旧 oklch 值形成可误用主题；第四期不渲染主题切换入口，不把暗色纳入验收。
- 仅为真实重复语义增加 token；页面遇到新视觉值时先判断能否收敛到既有 scale，不能直接添加任意值。

### 4.3 迁移纪律

1. 颜色、阴影、圆角、字体、间距引用 token 或对应 Tailwind 语义 utility；禁止 `style={{ color:'#...' }}`、`shadow-orange-*`、页面私有 HEX。
2. Neo 主容器默认是 `2px solid var(--color-ink)` + 硬阴影；弱分隔线才使用 `--color-border` / `--color-border-soft`。
3. hover、active、focus-visible 统一使用 foundation 6.1 的位移、下沉和 focus ring；尊重 `prefers-reduced-motion`，关闭非必要位移动画。
4. 选中、点赞、展开、当前路由使用 `data-state`；原生 `disabled`、`aria-invalid`、`aria-expanded` 保留其语义，不为所有伪类制造 data 属性。
5. 页面布局只使用已有 1024/760 断点和 container/gutter token，不新增相邻断点造成四段式布局。
6. 原型中的 inline style、`.active/.liked`、假点赞、客户端假筛选、`alert/confirm` 和假数据均不得复制。
7. 视觉迁移期间保持现有 `data-testid`，不得因重排结构删除行为测试锚点。

### 4.4 静态残留审计口径

P1～P4 完成后用静态搜索建立残留清单并逐项判定：

- 旧字体：`Geist`、`@fontsource-variable/geist`。
- 旧视觉：页面/业务组件中的直接色阶类、`shadow-sm/lg/xl` 柔阴影、大量 `rounded-xl/2xl`、旧渐变和 inline style。
- 旧状态：以 `.active/.liked/.on` class 表示业务状态。
- 原生反馈：`window.confirm`、`window.alert`。

不能机械删除 shadcn primitive 内部必要的圆角或第三方状态选择器；验收目标是“无页面私有旧皮肤”，不是让源码中某个字符串绝对为零。

---

## 五、全局组件迁移矩阵

### 5.1 组件契约

| 组件 | 真实现状 | 处置 | 目标契约 | 主要复用页 |
|---|---|---|---|---|
| Button | `components/ui/button.tsx`，base-nova cva | 改造 | `primary/secondary/ghost/outline/destructive/link`；`sm/default/lg/icon`；2px 墨边、硬阴影、disabled/focus | 全部 |
| Input | `ui/input.tsx` | 改造 | 单一基础态；`aria-invalid`/disabled；墨边、`shadow-sm`、focus 转橙 | Search/Compose/Chat/Login |
| Textarea | `ui/textarea.tsx` | 改造 | 与 Input 同体系；长文用 relaxed line-height；resize 行为由页面决定 | Compose/PostDetail |
| Select | Compose 当前原生 `<select>` | 新增 `ui/select.tsx` | 复用现有 `radix-ui`/shadcn primitive；trigger/content/item；open/disabled/invalid；键盘可用 | Compose |
| Avatar | `ui/avatar.tsx` + 各页私有尺寸 | 改造 | `sm=28/md=44/lg=72`；图片/首字母 fallback；`cv=1..8` 渐变 | Sidebar/PostItem/PostDetail/Mine |
| Card | `ui/card.tsx` 默认软卡 | 改造 | `variant=panel|tile`、`padding=none|sm|default`；禁止卡套卡装饰 | Search/PostDetail/Mine/Login |
| Carousel | `SildeShow.tsx` + `ui/carousel.tsx` | 改造 | 保留 Embla；dot `data-state=active`；箭头 icon button；稳定 aspect-ratio | Home |
| Pill | Badge 不能承载内容类型色 | 新增 `ui/pill.tsx` | `accent/warm/soft/news/guide/help/review/event`；纯展示 | Home/Search/PostDetail/PostItem |
| TagChip | Home 私有 button | 新增 `ui/tag-chip.tsx` | `active` 驱动 `data-state`；类型 variant；可单选/toggle | Home |
| StatButton | PostItem/PostDetail 私有统计按钮 | 新增 `ui/stat-button.tsx` | `like/comment/view`；`data-state=liked|idle`；count、busy、disabled | PostItem/PostDetail |
| CountBadge | 无 | 新增 `ui/count-badge.tsx` | mono、tabular nums、统一 k 缩写；纯展示 | PostItem/PostDetail/Sidebar 可选 |
| SearchBar | Topbar/Home/Search 各自输入 | 抽取 `components/SearchBar.tsx` | value/defaultValue、submit、clear、loading、showKbd；不内置 API | Topbar/Home/Search |
| PostItem | 现有 `components/PostItem.tsx` | 改造 | 作为 foundation `PostCard` 的真实实现；封面/正文/作者/统计固定槽位 | Home/Search |
| Sidebar | 已存在 | 改造 | 4 项配置不变；路由 active 用 `data-state`；248/80/底 tab | App Shell |
| Topbar | 已存在 | 改造 | sticky、SearchBar、可选用户操作；不重复页面标题 | App Shell |

### 5.2 状态与尺寸要求

- Icon button 保持稳定正方形尺寸，图标用现有 `lucide-react`，所有仅图标按钮有 `aria-label` 和 tooltip/title。
- Button/Input/Select 的高度档位统一，不允许页面用任意 `h-*` 改出同义控件。
- Pill 是展示，TagChip 是筛选交互，二者不可互换；Badge 保留给第三方/兼容用途，不再承担内容类型体系。
- StatButton 的 view 变体只展示，不触发自增；like 保留现有乐观更新、busy 禁用和失败回滚。
- Card 只用于真实面板/重复项，不把整个页面 section 包成漂浮卡，也不嵌套装饰卡。
- SearchBar 只负责输入与提交，Topbar 导航到 `/search`、Search 页调用语义搜索的业务仍由各自容器负责。

### 5.3 全局辅助组件

P4 增加以下跨页反馈组件，不形成第二套视觉系统：

- `Toaster`：基于 `sonner` 的 shadcn 封装，全局仅挂载一次；`success/error/warning/info` 映射状态 token。
- `AlertDialog`：基于已安装的 Base UI 1.3 `@base-ui/react/alert-dialog` 真实 parts API，承载不可逆确认；删除评论使用 destructive action，默认焦点落取消，不新增另一套 dialog primitive。
- `PageState`：组合 `LoadingState`、`EmptyState`、`ErrorState`，接收 icon/title/description/action；页面决定文案和重试动作。
- `Skeleton`：仅用于结构可预测的首屏加载；流式 Chat 保留专用 typing/loading 状态。

这些组件不得吞掉业务错误；API/store 仍负责捕获和状态恢复，UI 只呈现明确结果。

### 5.4 组件响应式规则

- Button、Input、Textarea、Select 不因视口改变语义或字号，仅由容器决定 `w-full`；移动端触控目标不小于 44px，紧凑桌面工具栏的 icon button 仍须提供足够命中区。
- SearchBar 桌面可显示 kbd 提示，窄屏隐藏提示但保留清除/提交；不得因隐藏提示改变输入宽度造成跳动。
- TagChip/Pill 保持单行内容；筛选容器横向滚动而不是压缩文字，滚动条视觉克制但键盘仍可达。
- PostItem 在宽内容区可采用封面+正文或网格卡结构，移动端收为单列；同一列表中卡片封面比例和统计脚部高度稳定。
- Card/Panel 不通过断点改变语义；页面只调整 padding 档位。Drawer 在移动端保持底部形态，桌面可保持受控宽度，不另建 modal 视觉。
- Sidebar/Topbar/Carousel 的断点行为分别以第六章、foundation 4.2 和稳定 aspect-ratio 为准，页面不得覆盖。

---

## 六、App Shell 与响应式视觉规则

### 6.1 结构保持

保持当前 `MainLayout.tsx` 的 Sidebar + main + Topbar + Outlet 结构；`/login` 继续使用独立全屏 auth 布局。不得引入第二套移动导航或恢复已删除的 keep-alive。

### 6.2 三档形态

| 视口 | Sidebar | Topbar/内容 | 验收重点 |
|---|---|---|---|
| `>1024px` | 248px 展开，品牌、图标+文字、用户区可见 | container 最大 1180，gutter 36 | 信息密度、硬边阴影、侧栏不抖动 |
| `761～1024px` | 80px 图标列，隐藏文字/meta | gutter 24 | icon 对齐、tooltip、内容不被挤压 |
| `≤760px` | fixed 底部 72px tab，4 项均分 | 单列、gutter 16、main 预留 bottom padding | 无遮挡、安全区、长文本换行 |

- 断点不变，Sidebar 视觉从现有 Tailwind 响应式类迁移到 token/统一状态。
- Topbar 保持 sticky，使用浅色半透明表面、backdrop blur 和底部墨边；不能盖住弹层或页面首行。
- 移动底 tab 使用 `env(safe-area-inset-bottom)` 扩展底部内边距，不改变 4 个导航目的地。
- auth 页在 `≤860px` 隐藏左品牌面板，这是 foundation 已有的独立页面规则，不加入 App Shell 760 断点体系。

### 6.3 全局可访问性与稳定性

- focus-visible 在键盘导航时清晰，hover 不能是唯一状态线索。
- 页面标题、label、button 和 link 使用语义元素；可点卡片须保证内部交互不产生嵌套按钮/链接冲突。
- 长标题、用户名、错误文本和 AI 输出必须换行，不遮挡统计区或按钮。
- 轮播、头像、封面、筛选行、底 tab 使用稳定尺寸/aspect-ratio，加载和 hover 不引发布局跳动。
- 继续保留 `body translate="no"` 和全局 `ErrorBoundary`；仅迁移其视觉，不移除 React 19 翻译扩展防护。

---

## 七、7 个页面逐页迁移设计

### 7.1 总迁移矩阵

| 页面 | 现状组件 | foundation/原型参照 | 目标组合 | 禁止触碰 |
|---|---|---|---|---|
| Home | SlideShow、Input、私有 tag/game chip、PostItem、InfiniteScroll | home.html；Carousel、SearchBar、TagChip、PostCard | 页面标题/搜索入口 → 轮播 → 两行筛选 → 帖子网格/状态 | store、双维度竞态、滚动恢复、筛选语义 |
| Search | Input/Button/Card/ScrollArea/PostItem | search-results.html；SearchBar、Panel、PostCard | 搜索摘要 + 输入/清除 + loading/empty/error + 结果列表 | JWT、debounce、search store、语义 API |
| PostDetail | Badge/Card/Avatar/Textarea/私有统计和评论 | post-detail.html；Pill、Avatar、StatButton、Dialog、MarkdownRenderer | 文章头 → 安全正文 → 统计 → 评论树/回复框 | 点赞/评论接口、viewCount 只读、评论无时间 |
| Compose | Input/Textarea/原生 select/私有 tag 和上传 | compose.html；Select、TagChip、MarkdownEditor、toast | 基础信息 → 图片 → 编辑/预览 → 提交 | POST 字段、上传接口、无改帖 |
| Chat | Header、Button/Input、message/annotation chip | chatbot.html；Panel、Input、Button、Pill/Link | 单会话消息流 + 引用 link chip + 固定输入区 | SSE、JWT、检索、阈值、单会话 store |
| Mine | Avatar/Button/Drawer/Loading | profile/edit-profile 视觉语言；Panel、Avatar、Drawer、toast | 用户摘要 + 头像修改 + 现有入口 + 退出 | 不新增个人中心页面/列表/编辑资料 |
| Login | Input/Button/Label/seg/强度条 | auth.html；独立 auth shell、Button/Input | 左品牌面板 + 右登录/注册 seg + 表单状态 | auth 接口、密码规则、token store |

### 7.2 Home

**保留行为**：首次加载、无限滚动、tag 与 game AND、独立 toggle、快速切换竞态保护、返回首页数据与滚动恢复、PostItem 跳详情。

**目标结构**：

1. 顶部不再重复一套私有搜索输入，使用 `SearchBar` 作为明确的搜索入口，提交后仍导航 `/search`。
2. `SildeShow` 迁移为强描边 Carousel；保留现有数据与 autoplay，封面使用稳定 16:9。
3. 内容类型使用 `TagChip` 主行；游戏使用次级横滚 chip 行，保留游戏手柄标识但不增加“全部游戏”chip。
4. PostItem 以响应式网格呈现；真实图片优先，缺图使用 token 化封面占位，不用纯装饰渐变替代可检查内容。
5. 首屏 loading 用卡片 skeleton；筛选无结果用 EmptyState；分页 loading 保持列表尾部，不清空已加载帖子。当前 `fetchPosts/useHomeStore` 会把失败折叠为空集合且没有 error channel，第四期不改 Home 状态流、不伪造 ErrorState；数据层错误可观测性登记为后续工程债。

**允许调整**：区块间距、标题层级、轮播/筛选/列表视觉顺序。**不允许**：改变 `loadMore` patch 对象、`currentTag/currentGameId`、`hasMore` 守卫或响应采纳逻辑。

### 7.3 Search

**保留行为**：受保护路由、输入防抖/搜索触发、清除、历史/建议现有语义、调用 `GET /api/ai/search`、PostItem 跳详情。

**允许的状态元数据扩展**：当前 `useSearchStore` 在 `search/searchByTag` 捕获异常后直接把 `suggestions` 写为空数组，UI 无法区分“请求失败”和“成功但无结果”。第四期允许给现有 store 增加 `error: string | null`（或等价的纯 UI 错误元数据）：请求开始时清空、失败时写入、成功时清空，且从 Zustand `partialize` 中排除，不持久化。该扩展只服务 ErrorState 呈现，不改变搜索请求、debounce、历史持久化、结果排序或 suggestions 数据语义。

**目标结构**：

- 页面主输入使用 `SearchBar`，返回按钮为 icon button；清除动作有可访问名称。若 URL 含 `q`，页面按 3.4 已定兼容规则初始化关键词并复用现有 `search()`，使 Topbar 提交真实生效。
- 搜索前显示克制的输入引导；loading 显示明确的搜索状态；无命中显示 EmptyState；接口失败显示 ErrorState + 重试，不把失败伪装成空结果。
- 结果摘要展示关键词和结果数；在标题/brief 中做纯展示关键词高亮，使用 React 文本分段，不用不安全 `innerHTML`，不改变语义排序。
- 结果继续复用 `PostItem`，不创建搜索专用帖子卡。

**不做**：按游戏扩展搜索、正文 embedding、筛选排序器、匿名搜索。

### 7.4 PostDetail

**保留行为**：加载详情/评论、点赞乐观更新和回滚、发表评论/两层回复、删除本人评论、登录引导、详情计数回写 Home store。

**目标结构**：

- 文章头包含内容类型 Pill、标题、作者 Avatar、真实 `publishedAt` 和只读浏览量。当前详情接口与 `Post` 类型不返回游戏信息，第四期不新增接口字段、不伪造游戏；如未来需要展示，须作为独立接口契约排期。
- 正文由 `MarkdownRenderer` 安全渲染，媒体宽度受内容容器约束；缺失正文显示 EmptyState，不伪造内容。
- 点赞、评论、浏览统一用 StatButton/CountBadge；浏览按钮不可点击。
- 评论树使用页面级 `CommentItem`，回复缩进在移动端收敛；由于 schema 无评论时间，作者名旁不显示任何时间字段。
- 删除评论由 AlertDialog 确认；成功 toast，失败 error toast，并保持原有重拉评论行为。
- 评论输入 disabled/loading/error 清晰；未登录仍使用现有登录入口。

**不做**：viewCount 自增、收藏、评论时间、无限层回复、编辑/删除帖子。

**真实错误边界**：当前 `fetchPostById()` 捕获所有错误并返回 `null`，页面无法可靠区分“不存在”和“网络失败”。第四期不改变该 API helper 语义；null 统一用可恢复的不可用状态与重试/返回动作表达。评论接口会抛错，可在评论区真实区分 error 与 empty。若未来要精确区分详情 404/网络失败，应先独立调整前端数据层错误契约。

### 7.5 Compose

**保留行为**：标题、游戏、内容类型、图片上传、正文、提交校验、`POST /posts`、成功后 prepend 首页并导航详情。

**目标结构**：

- 游戏选择替换为统一 Select；内容类型使用可多选的 TagChip 视觉，但业务选中集合和 tagIds 不变。
- 图片上传区使用虚线弱边框和稳定缩略图网格；上传中、单图失败、移除均有明确反馈。
- 正文区域新增“编辑 / 预览”分段控件：编辑使用 Textarea，预览复用与详情同一个 `MarkdownRenderer`。
- 桌面可在空间允许时并排显示编辑/预览，窄屏使用分段切换；不创建第二份内容 state。
- 提交中禁用相关控件并显示进度；校验错误贴近字段；请求成功/失败使用 toast。

**不做**：改帖、草稿持久化、自动保存、富文本 WYSIWYG、正文 embedding、上传接口或字段变更。

### 7.6 Chat

**保留行为**：`useChat@1.2.12`、Authorization header、`0:/8:/d:` data stream、站内引用 annotation、`CITATION_MIN_SIM=0.5`、`useChatStore` 不持久化。

**目标结构**：

- 保持单会话内容区，不复制原型的多会话 rail。
- assistant/user 气泡使用同一 token 体系，宽度和对齐在移动端不溢出；AI 文本保持纯文本换行，不引入新的 Markdown 解释语义。
- annotation 引用渲染为可点击站内 Link chip，保留 `chat-citation-link` testid；hover/focus 明确。
- 流式 loading 使用稳定 typing 状态；请求失败在消息区给可理解错误和重试提示，不清空历史消息。
- 输入区 sticky 于页面内容底部，发送按钮为 icon+可访问名称；loading 时输入/发送状态与现有逻辑一致。

**不做**：多会话、会话落库、停止生成/重新生成等新业务、改变 SSE 或 AI prompt。

### 7.7 Mine

**保留行为**：当前用户信息、头像首字母 fallback、Drawer 选择文件并上传、退出登录；现有“我的帖子”不可达/占位入口不得包装成新页面能力。

**目标结构**：

- 用户摘要使用 unframed header + Avatar，不把整个页面做成嵌套卡片。
- 头像上传继续使用 Drawer，迁移为 Neo 表面。P3 保持当前“选图后关闭 Drawer、显示全局 Loading”的时序；P4 接入统一反馈时只增加成功/error toast，不借反馈改造重写上传请求。若未来要改为失败保留 Drawer，需作为独立交互变更评审。
- 只展示真实可用动作。若当前“我的帖子”入口没有可达路由或真实能力，第四期应隐藏而不是新增页面。
- 退出使用 destructive/outline 语义，并保留立即清理登录态和跳转行为。

**不做**：资料编辑、我的帖子列表、我的点赞列表、AI/预设头像、统计数据墙。

### 7.8 Login

**保留行为**：登录/注册 seg、密码显隐、注册确认密码和强度、真实 auth API、错误呈现、成功写 user store 并跳转。

**目标结构**：

- 独立全屏双栏：左侧品牌/价值信息，右侧表单；不套 App Shell。移动 `≤860px` 隐藏品牌栏。
- seg 使用 `data-state=active|inactive`；表单 label、Input、显隐 icon button、Button 均走统一组件。
- 密码强度映射弱/中/强状态 token，不把颜色作为唯一信息；保留既有“≥8 位且字母+数字”规则。
- loading 禁止重复提交；接口错误留在表单语义位置并可被读屏；注册成功提示使用 toast/inline success 后进入既有流程。

**不做**：第三方登录、找回密码、邮箱验证、改变 token 生命周期。

---

## 八、统一状态与反馈系统

### 8.1 状态模型

每个异步页面/区块必须明确以下互斥或可组合状态：

| 状态 | 呈现规则 |
|---|---|
| idle | 尚未执行时给简短引导，不伪装 empty |
| loading | 首屏 skeleton；局部操作保留上下文并禁用相关控件；分页只显示尾部 loading |
| empty | 请求成功但无数据；说明当前筛选/关键词，并提供清除或返回动作 |
| error | 与 empty 分离；保留可恢复上下文，显示重试或下一步 |
| disabled | 用原生 disabled/aria-disabled；视觉降低但文字仍可读 |
| success | toast 或局部完成态；不使用 alert，不制造永久成功卡片 |

### 8.2 toast 使用规则

- 成功：发帖完成、头像上传成功、评论删除成功等异步动作。
- 错误：上传、提交、点赞/评论等操作失败；文案优先采用后端可展示 message，未知错误使用统一兜底。
- warning：用户可修复的限制或未满足条件。
- 页面首屏加载失败在现有数据层能提供可靠错误信号时，不只发 toast，必须在内容区显示 ErrorState。Home 与 PostDetail 详情当前会在 API helper 内把错误折叠为空值，P4 不改变其请求语义、不伪造精确错误；仅统一真实可观测状态，并把错误可观测性列为后续工程债。

### 8.3 Dialog 使用规则

- 仅用于不可逆或高风险动作。第四期明确替换的是评论删除 `window.confirm`。
- 标题说明对象和后果；主操作 destructive，取消为默认安全路径；Esc/遮罩关闭遵循 primitive 默认行为。
- Dialog 只负责确认，业务请求和错误处理仍在页面/store；请求中禁用重复确认。
- 评论删除取消或 Esc 时焦点返回原删除按钮；删除失败时 Dialog 保持打开且焦点留在 Dialog 内；删除成功时若原按钮仍连接 DOM 则返回原按钮，否则聚焦带 `tabIndex={-1}` 的稳定评论区标题/列表锚点。使用 Base UI `finalFocus` 或等价受控逻辑，不把焦点交给已卸载节点。

### 8.4 不回归要求

- 不用视觉组件重写请求逻辑。
- toast/Dialog portal 必须继续受 `body translate="no"` 保护，并在移动端不被底 tab 遮挡。
- 新增 feedback testid 仅在行为 e2e 有稳定断言需要时添加；视觉状态不写脆弱 e2e。

---

## 九、Markdown 与 XSS 防护

### 9.1 存储与接口口径

- `Post.content` 继续存储用户输入的 Markdown 源字符串，不转换或存储 HTML；`POST /api/posts` 的字段、DTO 和数据库 schema 不变。沿用 Compose 已验收语义，提交仍使用 `content.trim()`，这里的“原始”不表示改变首尾空白处理。
- Compose 的编辑和预览共用同一个 `content` state；提交不发送 HTML。
- PostDetail 在前端渲染 Markdown；后端不预渲染、不存 HTML。
- 旧纯文本帖子天然是合法 Markdown，按段落/换行展示，不需要数据迁移。

### 9.2 库与组件

- 引入 `react-markdown`、`remark-gfm`、`remark-breaks`、`rehype-sanitize`。`remark-breaks` 将旧纯文本中的单换行转换为可见换行，闭环兼容当前 `whitespace-pre-wrap` 的阅读效果。
- 新建共享 `MarkdownRenderer`，供 Compose preview 与 PostDetail 使用；两处使用完全相同的 plugin 和 schema。
- 不启用 `rehype-raw`，因此帖子中的原始 HTML 不执行；不使用 `dangerouslySetInnerHTML`。
- 支持标题、段落、强调、列表、引用、行内代码、代码块、链接、表格、删除线和任务列表；不实现自定义脚本、iframe、style、表单或任意 HTML。

### 9.3 链接与媒体安全

- 协议只允许 `http`、`https`、`mailto` 和站内相对路径；拒绝 `javascript:`、`data:` 等危险协议。
- 外链新窗口打开时增加 `rel="noopener noreferrer"`；站内链接保持当前路由体验。
- Markdown 图片仅允许 `http/https` 和后端配置生成的上传 URL；使用 `referrerPolicy="no-referrer"`，加载失败以 React 状态切换为 token 化占位，不使用 inline style；限制最大宽度，不允许尺寸撑破布局。
- sanitize schema 以 GFM 所需标签/属性为白名单，只在确有渲染需求时扩充；不能为兼容某篇内容整体放开 HTML。

### 9.4 预览与详情一致性

- Typography 全部引用 token，不安装第二套 prose 主题。
- 代码块在窄屏横向滚动，长 URL/长单词可断行；表格放在横滚容器。
- Compose preview 为空时显示明确引导；PostDetail content 为空时显示 EmptyState。
- 安全验收包含脚本标签、事件属性、危险链接、嵌套图片和超长代码块，确认均不会执行或破坏布局。
- 旧帖兼容验收必须包含“连续文本中的单换行、空行分段、多行列表前普通文本”三类样本，确认引入 Markdown 后不把原本可见的换行合并成一行；Compose 预览与 PostDetail 结果一致。

---

## 十、URL、限流、密钥、文件清理与演示 seed

### 10.1 URL 配置

**前端运行时构建配置**：

- `VITE_API_BASE_URL`：axios API 根地址，例如开发环境 `http://localhost:3000/api`。
- Chat 的 `useChat` 从同一配置模块构造 `/ai/chat`，不得另写 host。
- 配置模块负责去除末尾斜杠和路径拼接；页面/api 文件只消费导出的 `API_BASE_URL`。

**后端部署配置**：

- `PUBLIC_BASE_URL`：浏览器可访问的后端公开根地址，例如开发环境 `http://localhost:3000`。
- 统一媒体 URL helper/service 接收相对上传路径，生成 `${PUBLIC_BASE_URL}/uploads/...`；posts、auth、comments、ai、upload 均复用。
- `PORT` 仍控制监听端口；`FRONTEND_ORIGIN` 用于部署环境 CORS 白名单。开发环境可明确允许本地前端，生产不再 `cors:true` 全开放。

开发 `.env.example` 只放占位值和注释，不写真实 key。生产缺少必须 URL 时启动失败，不回退到 localhost。

前端 `VITE_API_BASE_URL` 不提供源码 fallback：本地可使用不提交的 `.env.local`，build/CI 必须显式注入；Playwright 只在 `playwright.config.ts` 的 webServer 环境中提供固定测试值。后端保留开发环境 localhost 默认，但只能存在于集中 `src/config/env.ts`，service/controller 等业务源码不得再出现 localhost。

### 10.2 接口限流

引入 Nest 官方 `@nestjs/throttler`，采用“全局温和默认 + 敏感接口更严格”的配置，具体窗口和次数可由环境变量覆盖，但必须提供演示友好的默认值：

| 接口 | 默认策略 | 原因 |
|---|---|---|
| 全局 API | 60 次/60 秒/IP | 防明显滥用，不影响正常浏览 |
| `POST /api/auth/login` | 10 次/60 秒/IP | 防暴力尝试 |
| `POST /api/users/register` | 5 次/10 分钟/IP | 防批量注册 |
| `POST /api/ai/chat` | 10 次/60 秒/已登录用户，IP 兜底 | 外部模型成本与并发 |
| `GET /api/ai/search` | 30 次/60 秒/已登录用户，IP 兜底 | embedding 成本 |
| 上传接口 | 20 次/10 分钟/已登录用户，IP 兜底 | CPU/磁盘成本 |

- 429 返回统一 JSON 错误口径，前端通过全局错误映射显示“请求过于频繁，请稍后再试”。
- 登录、注册、refresh 始终按 IP；只有明确标注的 chat、search、上传等已鉴权高消耗接口才优先按 JWT user id，避免共享网络用户互相挤占，取不到有效用户时回退 IP。tracker 不按 URL 字符串猜测身份，也不替代 JwtAuthGuard。
- 限流只限制调用频率，不修改 JWT 守卫、DTO、AI 流式协议或接口返回成功结构。
- 自动化测试使用测试环境配置提高上限或显式覆盖，不能通过删除限流来让测试通过。
- 默认 storage 为进程内存，限额只在单进程/单实例内成立；多实例部署不会共享计数。本期不引入 Redis，不承诺集群级全局配额；未来若需要多实例统一限额，接入共享 storage 作为明确后续工程债。

### 10.3 强密钥与启动校验

在应用创建外部服务前执行集中环境校验；校验失败打印缺失变量名和要求后退出，不打印变量值。

| 变量 | 规则 |
|---|---|
| `DATABASE_URL` | 必填、非空 |
| `TOKEN_SECRET` | 必填，至少 32 字符，拒绝空值/示例值/常见弱值 |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | 必填、非空、URL 合法 |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | 必填、非空、URL 合法 |
| `PUBLIC_BASE_URL` | 生产必填且 URL 合法；开发允许明确本地默认 |
| `FRONTEND_ORIGIN` | 生产必填且 URL 合法；开发允许本地默认 |
| 模型名、PORT、限流参数 | 可选；有值时校验类型/范围 |

- `jwt.strategy.ts` 不再以 `|| ""` 掩盖缺失 secret；所有 JWT 签发和验证消费同一已校验配置。
- `.env` 不进入提交；`.env.example` 说明生成强随机 secret 的部署步骤。
- 本期不轮换已有 token 协议，不引入 secret manager；部署时更换 secret 会使旧 token 失效，作为可接受的发布说明记录。

### 10.4 文件安全清理

新增一次性维护脚本，默认 **dry-run**，只有显式 `--apply` 才删除。脚本不作为服务启动任务，也不在请求链路运行。

清理对象：

1. 磁盘中不再被 `Avatar` 记录引用的头像 small/large 变体。
2. 磁盘中不再被 `File` 记录引用的帖子原图/thumbnail 变体。
3. 数据库中 `postId=null` 且超过保护期的临时 `File` 记录及对应文件，表示上传后未完成发帖。
4. 缺失磁盘文件但仍有 DB 记录的情况只报告，不自动删除记录，避免扩大损失。

安全规则：

- 先规范化并验证目标绝对路径位于 `uploads/` 下；不得跟随目录外路径。
- 以 DB filename 为基准识别整组派生文件，不按模糊前缀删除无关文件。
- `.gitignore`、`.gitkeep` 等仓库控制文件显式忽略；不符合已知派生命名的文件只报告，不删除。
- 默认保护最近 24 小时文件，保护期可参数化但不得为负。
- dry-run 输出分类、数量和路径；`--apply` 输出实际成功/失败，单文件失败继续并最终非零退出。
- 实施前备份 `uploads/` 和数据库；先在副本/开发环境 dry-run，再在演示环境执行。

### 10.5 丰富演示 seed

在 `seed-games.ts` 与三期 `seed-demo-posts.ts` 的基础上扩充，而不是替换 14 条 AI 最小数据集。

目标数据：

- 保持 5 个 seed 游戏和 5 个内容类型，扩充至约 30～40 篇可读帖子，每个游戏/类型有可展示交叉覆盖。
- 复用两个已知演示用户，可增加少量明确命名的演示作者；密码仍满足现有规则且只用于本地演示说明。
- 为演示帖子生成真实正文、game/tag 关联、固定 viewCount、评论树、点赞关系和部分图片关联；Comment 无时间字段，不伪造时间。
- seed 后运行现有 `backfill-embeddings.ts --all`，保证新增标题与当前 `text-embedding-3-small` 同一向量空间。
- seed 数据本体与 embedding 回填是两个能力 profile：前者不要求 AI key，组合命令在 seed 成功后再运行 backfill；任一标题 embedding 失败时组合命令必须非零退出，不能报告完整成功。

幂等与数据安全：

- game/tag 按名字查真实 id，不写死自增 id。
- 只清理脚本 manifest 明确列出的演示标题和演示用户关联数据，不 `deleteMany({})` 清空真实内容。
- 相同输入重复执行得到稳定规模，不累计重复评论/点赞。
- 图片生成/复用先于 interactive Prisma transaction：脚本记录且只记录本次实际新建路径；数据库失败由 transaction 回滚，文件系统由补偿逻辑删除本次新建图片。运行前已存在的 fixture 不覆盖、不纳入补偿；补偿删除失败必须报告残留路径并非零退出。
- seed 是演示/开发维护命令，不在生产服务启动时自动执行。

### 10.6 运行时、维护脚本与部署要求区分

| 类型 | 内容 | 何时运行 |
|---|---|---|
| 运行时 | URL config、CORS、限流、启动校验、Markdown/反馈 UI | 每次应用运行 |
| 一次性维护 | 文件清理 dry-run/apply、embedding backfill | 人工受控执行 |
| 可重复数据准备 | games/demo seed、评论/点赞扩充 | 初始化或重置演示环境 |
| 部署要求 | 强 secret、公开 URL、前端 origin、备份、构建环境变量 | 发布前 |

---

## 十一、P0～P6 实施顺序、依赖与完成条件

### P0：范围冻结与基线

**工作**：确认工作树基线；记录现有 41 条 Playwright；建立 7 页桌面/窄桌面/移动截图；产出旧视觉、硬编码和工程缺口清单；确认本文件获批；把“Topbar 写入 `q`、Search 未消费”的既存行为缺口登记进实施计划，并按 3.4 的已定边界安排在 SearchBar 接线批次修正。

**依赖**：无。  
**完成条件**：范围与非目标锁定；历史改动有可识别基线；没有把未实现原型页纳入计划；行为测试和截图基线可复现。

### P1：token、Inter、基础组件

**工作**：接入 token；Geist→Inter；改 Button/Input/Textarea/Avatar/Card/Carousel 基础样式；新增 Select/Pill/TagChip/StatButton/CountBadge；建立 reduce-motion/focus 规则。

**依赖**：P0。  
**完成条件**：组件展示面覆盖 variant/size/state；无第二套 token；基础组件在浅色主题、键盘和移动尺寸下可用；现有行为测试不因组件替换失败。

**实现状态（2026-07-15，P1 已人工确认通过）**：

- `frontend/black_box/src/App.css` 已以 `:root` 保存 foundation/system.css 的原始视觉值，并通过 `@theme inline` 暴露 `background/foreground/card/primary/secondary/accent/destructive/type-*`、`radius-*`、`shadow-*`、`font-*`、`text-*`、`leading-*` 等语义 token；8 个封面渐变、间距、布局和 motion 值亦集中于同一文件。旧 `.dark` 值块已删除，只保留 `@custom-variant dark` 机制且无入口。
- 本地字体已由 Geist 替换为 `@fontsource-variable/inter`。Button 保留 Base UI `render`、旧 variant/size alias，`default` 映射 `outline`；Card 最终契约为 `variant=panel|tile` 与 `padding=none|sm|default`，并保留旧 `size` alias。
- 已改造 Button/Input/Textarea/Avatar/Card/Carousel；已新增基于 Base UI 的 Select、Pill、TagChip、StatButton、CountBadge，以及唯一内容类型映射。业务状态使用 `data-state`，统一 focus-visible、disabled/busy 与 reduced-motion；移动横向 Carousel 控制按钮下置，`sm` 起恢复侧边居中，保持 44px 命中区。
- dev-only gallery 未进入产品路由或生产入口。P1 文件定向 lint 0/0，生产 build 通过，现有 41 条 Playwright 全通过；全量 lint 保留已登记范围外债务 14 errors / 3 warnings。

### P2：App Shell 与全局复用组件

**工作**：改 Sidebar/Topbar/MainLayout；抽 SearchBar；改 PostItem、SildeShow、BackToTop、ErrorBoundary、Loading/InfiniteScroll；校准三断点。

**依赖**：P1。  
**完成条件**：248/80/底 tab 三态与原路由一致；全局组件不再使用旧皮肤；7 页尚未迁移前已有稳定壳和帖子卡。

**实现状态（2026-07-15，P2 已人工复验通过）**：

- `MainLayout.tsx` 保持 `Sidebar + main(Topbar + Outlet)` 职责和 `app-shell` 锚点，改为 grid/sticky 壳；`App.css` 落地既有 `--sidebar-w`、`--bottombar-h`。现有 `Sidebar.tsx` 统一承担 `≥1025px` 248px 展开、761～1024px 80px 图标栏、`≤760px` 72px + safe-area 底 tab，四个导航目的地不变，active 只用 `data-state`。
- 新增默认导出 `components/SearchBar.tsx`，契约为受控/非受控 value、submit、clear、loading、showKbd；清除按钮实测保持 44×44px。`Topbar.tsx` 使用 token 化 90% 表面与 backdrop blur，只 trim/编码并导航 `/search?q=`。Search 消费 `q` 仍按边界留在 P3。
- `PostItem.tsx` 保留默认导出、`PostItemProps`、`post-item`、整卡详情跳转和只读统计，以 P1 Card/Pill/Avatar/StatButton/CountBadge 组成唯一 PostCard；外层 article 补 link 语义、焦点环与 Enter 触发；封面失败使用 React state 和 token cover，不再操作 inline style。
- `SildeShow.tsx` 保留现有拼写、默认导出、`SlideData`、Embla、loop 和 autoplay props，增加箭头、可点击 `data-state` dot、token 图片回退；dot 用 44×44px 不收缩按钮承载小视觉圆点；reduced-motion 通过已初始化的 `api.plugins().autoplay` 停止自动播放，避免插件 API 就绪前调用。`BackToTop` 保留阈值、节流和监听清理，并避让移动底 tab。
- ErrorBoundary 保留 class boundary、reload 和 `role=alert`；Loading 保留默认导出并改为统一 status overlay，旧 `loading.module.css` 在确认唯一引用后删除；InfiniteScroll 保留 sentinel、IntersectionObserver 和守卫，只迁移加载尾部视觉。
- 生产 build、P2 定向 lint 0/0、既有 7 个 spec/41 条 Playwright 和 P2 28 张四视口截图已完成；全量 lint 仍为已登记范围外债务 14 errors / 3 warnings。PostDetail 旧固定评论输入栏的移动层级协调属于 P3 页面迁移观察项，P2 未越界修改页面。

### P3：7 个现有页面逐页迁移

**顺序**：Home → Search → PostDetail → Compose → Chat → Mine → Login。顺序先覆盖共享列表/详情，再表单和特殊布局。

**依赖**：P2。  
**完成条件**：每页按第七章一次性完成视觉系统迁移，并为 P4 的共享反馈/Markdown 组件预留明确组合位；保留 testid 和业务行为；每完成一页进行 1440、900、390、320 四视口人工验收，不先写视觉 e2e；全部页面无旧皮肤残留。

**P3.1 实现状态（2026-07-15，已人工验收通过）**：Home 已移除页面私有 sticky 搜索头、直接色阶、渐变、柔阴影、大圆角和私有 chip，改为组合 P1/P2 的 SearchBar、SildeShow、TagChip、PostItem、InfiniteScroll、Loading。现有 `useHomeStore`、tag×game AND、独立 toggle、分页、双维度竞态、详情回写与 sessionStorage 滚动恢复未改；SearchBar 仅编码并导航 `/search?q=`。用户已确认 Home，允许连续实施 P3.2～P3.7，最终统一进行 P3 整批人工验收。

**P3.2～P3.7 实现状态（2026-07-15，已整批人工验收通过）**：Search 已消费 `q` 并保留 category/debounce/history 语义，store 只增非持久化 error，唯一 PostItem 以安全 React 文本分段支持 highlight；PostDetail 使用真实 `content ?? brief`、只读 viewCount、`liked|idle` 和两层评论，移动 composer 避让 Sidebar/72px 底栏/safe-area；Compose 已接 P1 Select/TagChip/Button，上传、payload、回拉/prepend/导航不变，Markdown 仍留 P4；Chat 仅迁移单会话视图，JWT/SSE/annotation/阈值/store 未改，旧 Header 零引用后删除；Mine 只保留摘要、头像上传、退出并保持 Drawer→Loading 时序；Login 为独立 861px 双栏/860px 单栏，认证流程不变。整批 build、P3 lint 0/0、全量批准 lint 4/0、7 files/41 tests 与终态 28/28 截图均完成；用户已确认 P3，允许进入 P4 施工方案阶段。

**P3 Search 评审修正（2026-07-15，已人工复验通过）**：手动提交去重标记的生命周期已限定为“只消费下一轮 debounce”：下一值同于已提交关键词时跳过，不同、为空或进入 category 分支时均清除过期标记且不同值正常搜索。一次性 QA 已覆盖 `A 稳定 → Enter A → B → A`、debounce 前快速提交、首次 `q`、category 优先和 history-only 持久化；修复后请求序列与原语义均符合契约。

### P4：Markdown、统一反馈与状态系统

**实现状态（2026-07-16，已人工验收通过）**：P4.1～P4.5 已按确认方案实施。MarkdownRenderer/sanitize/旧换行、Compose 编辑预览、PostDetail Markdown、Base UI AlertDialog、根部单一 Toaster、PageState/Skeleton 及页面反馈均已接线；取消/Esc、删除失败和成功卸载触发节点三条焦点路径已实测。人工审查发现 DELETE 成功后评论刷新失败可能保留旧树，现已改为先提交本地树删除与 Home 计数、再以刷新结果校准，并用“删除 200 + 刷新 500”一次性 QA 验证；无用途的误挂焦点 ref 已删除。P4 定向 lint 0/0、全量批准基线 4/0、16 单测、build、7 files/41 Playwright 与 28/28 截图通过；用户已确认 P4，可以进入 P5 施工方案阶段。

**工作**：落 Toaster/AlertDialog/PageState/Skeleton；替换 confirm 和不一致反馈；实现共享 MarkdownRenderer、Compose 预览、PostDetail 安全渲染；补 XSS 人工/单元验证。P4 只把横切能力接入 P3 已定稿的组合位，不重新调整页面信息结构、视觉层级或另做一次换皮。

**依赖**：P1，建议在 P3 的 Compose/PostDetail 迁移后集中完成。  
**完成条件**：原生 confirm/alert 清零；页面在现有数据层能提供可靠信号时区分 loading/empty/error，不能区分时不伪造错误类型；Markdown 预览与详情一致；危险 HTML/协议不执行；帖子接口/schema 不变。

### P5：URL、限流、密钥、文件清理、演示 seed

**实现状态（2026-07-17，P5 已实现并通过整批人工验收）：** P5.1～P5.8 的 URL 单一配置、分层 env/强密钥、公开媒体 URL、精确 CORS/可信 loopback 代理、Throttler 用户/IP 配额、统一 429、上传清理工具、35 帖/5 作者/10 图演示 manifest、文件补偿、embedding 非零失败语义及部署/维护文档均已落地。备份 A 后 cleanup apply 已单次成功并完成人工验收，备份 B 随后闭环；获独立授权的两次 `seed:demo:full` 均退出 0，最终 35 帖、13 评论、31 点赞、10 图及 35/35 的 1536 维 embedding，第二轮无累计，cleanup dry-run orphan 0。Home/PostDetail 与数据终态通过；Search/Chat 暴露的外部链路无限等待经 P5.9 有限失败契约修复后亦通过真实人工复验。P5.10 已将标准生产启动脚本对齐真实 `dist/src/main.js` 产物，并在隔离端口通过真实启动与 `/api` 200 验证。用户已确认 P5.1～P5.10 整批人工验收通过，允许进入 P6 方案阶段。

**P5.9 AI 外部链路有限失败契约（2026-07-17，已确认）：** embedding 单次上限默认 20 秒，DeepSeek 流默认上限 30 秒，外部 SDK 自动重试关闭；配置值以 `AI_EMBEDDING_TIMEOUT_MS`、`AI_CHAT_TIMEOUT_MS` 进入运行时校验。Search 为请求设置 25 秒前端上限并将后端失败结果映射到既有 ErrorState，不再伪装 EmptyState。Chat 的站内引用检索超时只降级为无引用普通聊天；模型流超时在尚未提交响应时返回 504，已开始 data stream 后按 AI SDK v1 写 `3:` error part 并结束流；前端自定义 fetch 以 55 秒作为覆盖“检索 20 秒 + 模型 30 秒 + 传输余量”的最终兜底。Axios 无 response/config 时不得进入刷新 token 分支，超时与网络失败分别输出稳定文案。所有期限都允许部署显式调整，且不得记录 key、连接串或供应商原始错误。

**P5.9 实现状态（2026-07-17，已人工验收通过）：** 上述有限失败契约已全部落地并通过后端 62、前端 27 单测、双端 build、触及文件 lint 0/0、批准全量 lint 3/0 与既有 41 条 Playwright。用户真实复验确认 Search 慢响应最终进入可重试 ErrorState，Chat 引用检索 timeout 后约 23.6 秒开始流式、约 43.6 秒完成并恢复输入，无引用、无残留 loading、无控制台错误或溢出；数据保持 35 帖、13 评论、31 点赞、10 File。P5.9 已关闭；其后发现的 `start:prod` 产物路径阻塞由 P5.10 独立收口，结果见下。

**P5.10 生产启动状态（2026-07-17，已完成）：** `start:prod` 已由不存在的 `dist/main` 最小修正为真实构建产物 `dist/src/main.js`，并增加读取 package script 与产物存在性的聚焦契约测试。RED/GREEN、后端 build、14 suites/63 tests、聚焦 lint 0/0 均通过；隔离端口使用标准 `pnpm start:prod` 成功启动，`GET /api` 返回 200，验证后仅关闭隔离实例且无端口残留。未修改 Nest 输出结构、依赖、lockfile或应用业务代码。

**P5.6 安全评审修复（2026-07-16）：** 因 `File.filename` 无唯一约束，cleanup 已由单记录 Map 改为按 filename 聚合全部记录；任一记录仍关联帖子时整组保留，全部孤立时仅在文件组完整删除成功后清理该组全部 File。新增两类重复 filename 回归后，后端全量为 9 suites/50 tests。修复后的真实 dry-run 逐项报告 20 组/40 个候选文件、1 组/2 个引用文件保留，uploads 46 文件 SHA-256/mtime/size 前后差异 0；apply 仍未执行。

**P5.6 备份门禁（2026-07-16）：** cleanup 前备份 A 已在仓库外同一停写窗口完成，PostgreSQL custom dump 与 uploads tar.gz 均记录绝对路径、大小、mtime 和 SHA-256，并分别通过 `pg_restore --list`、`tar -tzf` 及完成后独立哈希复核；证据见 `docs/qa/phase4/p5-backup-a.md`。cleanup apply 仍等待用户单独授权，未进入 seed 或 P6。

**P5.6 apply 实测（2026-07-16，已人工验收）：** 用户授权的唯一 cleanup apply 命令执行一次并退出 0，删除 20 组/40 个孤儿文件和 File 记录 4、5；Post 14、Avatar 1 保持，File 归零。后续 dry-run 为 orphan 0、referenced 2、control 4，uploads 恰余两个引用头像文件和四个控制文件；备份 A 哈希不变。该结果已获人工确认，随后备份 B 与双轮 seed/full 分别按独立门禁完成。

**工作**：配置收口、媒体 URL helper、CORS；Throttler；启动校验；文件清理脚本；扩充幂等 seed 并回填 embedding；写部署/维护命令说明。

**依赖**：P0；可与 P3/P4 分支串行实施，但最终在 P6 合并验证。  
**完成条件**：源码无 localhost 业务硬编码；缺失/弱 secret 启动失败；敏感接口返回 429；清理默认 dry-run 且路径受控；seed 可重跑且首页/search/chat/详情均有完整数据。

### P6：全量回归与多视口人工验收

**执行状态（2026-07-17，已实现、已人工验收通过）：** P6.0～P6.5 全部完成并获用户最终确认。自动化、隔离生产主链路、真实库只读审计、56 张多视口/状态截图和静态残留扫描均已形成证据；P6 真实串验发现登录响应 user id 字符串与前端数字契约不一致，经用户授权以契约测试修正并全量回归。静态审计发现未引用的 Vite `react.svg` 旧资产，经用户授权删除后 HEX 仅保留在 `App.css` token/cover。最终截图评审又发现 Compose 390px 预览 grid item 被宽表格撑开，已补 `min-w-0` 并以页面 `scrollWidth=clientWidth=390`、局部 table `242/512`、重拍截图和 41 条回归关闭。端口复核使用 `netstat -ano` 发现并清理本项目 3000 production 父子进程，最终目标端口无监听。用户独立复核上述结果后确认 P6 与第四期整批通过。

**工作**：构建、类型、lint、后端测试、现有 Playwright 全量；主链路人工串验；多视口截图对比；静态残留审计；发布配置演练。

**依赖**：P1～P5 全部完成。  
**完成条件**：第十四章验收清单全部通过；没有通过删测试/放宽断言掩盖回归；截图基线获人工确认；第四期文档回填真实实现偏差后标已实现。

### 11.1 批次纪律

- 每批先确认实施方案，再改代码；若发现需扩大范围、改变业务语义或改 schema，先停下更新/评审设计。
- 每批可独立构建和回归，不把基础组件迁移与页面业务重构混在一个不可审查的大改中。
- 功能新增 e2e 仍遵守“人工验收通过后再补”；视觉不写 CSS/DOM 像素行为测试。

---

## 十二、测试、人工验收与截图回归

### 12.1 自动化基线

现有 Playwright 基线为 7 文件、41 tests：`auth`、`auth-guard`、`compose`、`home`、`social`、`ai-chat`、`game-filter`。第四期必须保留这些行为断言；组件/页面重排时保留 testid 和可访问名称。

最终执行：

- 前端 `pnpm build`、`pnpm lint`。
- 后端 `pnpm build`、`pnpm test`，以及项目现有可运行的后端 e2e。
- 前端 `pnpm e2e` 全量 Chromium 行为测试。
- 文件清理脚本 dry-run、seed 幂等复跑、弱密钥启动失败、限流 429 作为工程验收；是否补自动化测试在对应功能人工确认后决定。

### 12.2 主链路人工串验

登录/注册 → Home tag/game 筛选与无限滚动 → Search 语义命中 → PostDetail Markdown/点赞/评论/回复/删除确认 → Compose Markdown 预览/图片/发帖 → Chat 流式回答/引用/切走保持 → Mine 头像上传/退出。

额外确认：

- rag/git/avatar AI 生成功能仍不存在。
- viewCount 只显示、不自增；评论无伪时间。
- 刷新、详情返回、快速切筛选和 AI 流式状态不回归。

### 12.3 多视口截图矩阵

每个页面至少截取以下视口，使用同一演示 seed 和稳定登录态：

| 档位 | 建议视口 | 目的 |
|---|---|---|
| 宽桌面 | 1440×1000 | 248px Sidebar、最大容器、双列/网格 |
| 窄桌面/平板 | 900×1000 | 80px 图标栏、内容收缩 |
| 手机 | 390×844 | 底 tab、单列、safe area、键盘前布局 |
| 小手机补充 | 320×740 | 最长文本/按钮/筛选横滚不溢出 |

截图覆盖：默认、loading、empty、error、Dialog/Drawer、Compose preview、Chat 流式/引用、长标题/长正文。动态 AI 内容不做像素基线，使用 mock 或稳定已完成消息截图。

### 12.4 视觉审计

- 桌面侧边栏、窄桌面图标栏、移动底 tab 均是同一导航体系。
- 7 页均使用 Inter、奶黄底、墨边、硬阴影和统一状态；无旧柔阴影、旧字体、旧主题色和不一致圆角。
- 直接色阶类只允许在明确的第三方兼容/不可 token 化位置，经 review 留注；页面业务视觉不得残留。
- 所有交互 focus、disabled、loading 可辨识；文本不溢出，按钮/卡片尺寸不因状态改变。
- 不通过暗色入口；`.dark` 不作为第四期可用主题验收。

---

## 十三、风险、回滚原则与后续债务

### 13.1 主要风险与控制

| 风险 | 控制 |
|---|---|
| 全局 token 一次覆写导致多页同时变化 | P1 先组件展示面，P2 再壳，P3 逐页；保留截图基线 |
| 组件重构破坏 testid/事件 | 以行为测试为护栏；外部 props/handler 先保持，内部换皮 |
| Markdown XSS | 不启用 raw HTML；统一 renderer + sanitize 白名单 + 危险样例验收 |
| URL 收口后开发/部署路径错误 | 单一配置模块、启动校验、开发与生产示例、媒体 URL 集成验收 |
| 限流误伤演示/e2e | 可配置默认、用户/IP 双键、测试环境明确覆盖 |
| 清理脚本误删 | dry-run 默认、路径边界、保护期、备份、只按 DB 精确引用 |
| seed 污染真实数据 | manifest 定向清理、命名演示用户、禁止全表 deleteMany |
| 工作树混入前三期历史 diff | P0 建立基线，按批审查，不回滚非本期用户改动 |

### 13.2 回滚原则

- 每个 P 批次保持可独立回滚；不使用破坏性 git reset，不覆盖用户未提交改动。
- 视觉回滚以组件/token 批次为单位，不回滚前三期业务文件中的功能修复。
- 配置/限流上线异常时回滚对应模块和环境配置，不把硬编码重新散回业务代码。
- 文件清理不可逆，因此只在备份、dry-run 审核和显式 `--apply` 后执行；代码回滚不能代替数据恢复。
- seed 只在演示环境执行；回滚按 manifest 删除演示数据，不触碰非演示用户内容。

### 13.3 明确后续债务

以下事项不属于第四期，不以“原型已有”作为实现理由：

- 完整个人中心：profile/edit-profile/my-posts/my-likes。
- 浏览量自增、去重、并发与防刷。
- 评论 `createdAt` 与相关 migration。
- 游戏专区页、游戏详情页。
- 多会话 AI、会话持久化、正文 embedding、改帖及 embedding 更新。
- 预设头像与头像资产体系。
- Neo-Brutalism 暗色 token 和主题切换入口。
- HttpOnly Cookie、token 吊销/轮换、对象存储、CSP/Helmet 等生产级加固。
- 前端现存 3 errors / 0 warnings 与后端现存历史 lint 债的独立工程清理；第四期采用的差分门禁已证明新增/触及文件未增加债务，但不表述为全仓 lint 通过。

---

## 十四、最终可核对验收清单

### 范围与架构

- [x] 只迁移 Home/Search/PostDetail/Compose/Chat/Mine/Login；无新增页面、路由、接口、schema 或 migration。
- [x] App Shell、守卫、store、API 语义和前三期功能保持。
- [x] viewCount 只读，评论无伪时间，Chat 仍单会话内存保持。

### 视觉与组件

- [x] Tailwind v4 token 与 foundation/system.css 对齐；Inter 正式加载，Geist 移除。
- [x] 7 页无旧皮肤残留，无页面私有硬编码颜色/阴影/圆角/间距体系。
- [x] Button/Input/Textarea/Avatar/Card/Carousel/PostItem/Sidebar/Topbar 已改造。
- [x] Select/Pill/TagChip/StatButton/CountBadge/SearchBar 已按契约复用。
- [x] 业务状态统一 data-state；focus/disabled/reduced-motion/长文本可用。
- [x] 248px Sidebar、80px 图标栏、移动底 tab 三态通过人工验收。

### 内容与反馈

- [x] loading/empty/error/disabled/success 口径统一。
- [x] `window.confirm/alert` 不再用于业务反馈；删除评论使用 AlertDialog。
- [x] Compose 编辑/预览和 PostDetail 共用 MarkdownRenderer。
- [x] Markdown 原文仍存 `Post.content`；危险 HTML/链接不执行，接口/schema 不变。

### 工程收尾

- [x] 前端 API/chat 和后端媒体 URL 均由配置构造，业务源码无 localhost 硬编码。
- [x] 登录、注册、AI、上传限流生效并返回统一 429。
- [x] TOKEN_SECRET/数据库/AI key/公开 URL 启动校验生效，不泄露 secret 值。
- [x] 文件清理默认 dry-run、路径受控、保护期生效，并在备份后演练。
- [x] 演示 seed 可重复执行，扩充内容/评论/点赞/viewCount，并完成 3-small embedding 回填。

### 回归与交付

- [x] 前后端 build/test 通过；现有 41 条 Playwright 行为基线全部通过；lint 采用已批准差分门禁，新增/触及文件 0/0，前端历史基线 3/0、后端历史基线 881/7 均未增加，不表述为全仓 lint 通过。
- [x] 主链路串验通过；search/chat/game/tag/社交功能协同无回归。
- [x] 1440、900、390、320 四档截图审查完成，无溢出、遮挡和布局跳动。
- [x] 文档回填最终实现偏差和验收结果；`AGENTS.md` 的阶段、范围和实际实现状态已与第四期最终结果一致。

---

> 第四期实施入口：本文件获评审通过后，先编写 P0～P6 的实施计划；实施从 P0 基线冻结开始，不直接从页面换皮起步。
