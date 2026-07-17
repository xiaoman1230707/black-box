# Black-box 四期后 UX 优化批次 O1 详细设计

> 状态：已实现、已人工验收通过  
> 日期：2026-07-17  
> 定位：第四期整批人工验收通过后的独立优化批次 O1；**不代表第五期启动**

---

## 一、文档定位、事实来源与覆盖关系

### 1.1 文档职责

本文只定义两项已确认的四期后 UX 优化：

1. 从 App Shell 物理移除全局固定搜索框，保留 Home 页面级搜索入口与 Search 页内搜索能力。
2. 让 Chat 的 assistant 消息复用现有安全 `MarkdownRenderer`，user 消息继续按纯文本展示。

本文是这两项优化的权威设计。它不增加页面、接口、数据字段、依赖或产品能力，不重开第四期，也不自动进入第五期。

### 1.2 事实来源优先级

1. 本文中已经拍板的 O1 产品语义。
2. `docs/design/00-foundation.md` 的 token、基础组件、Sidebar、响应式和交互契约。
3. `docs/design/03-phase3-ai-gamification.md` 的 Chat/SSE/JWT/检索/annotation/store 事实。
4. `docs/design/04-phase4-visual-polish.md` 与 `docs/plans/04-phase4-implementation-plan.md` 的已验收视觉和工程事实。
5. 当前真实代码与第四期 P6 截图证据。

### 1.3 对既有文档的窄范围覆盖

本文只覆盖下列历史契约，其余内容继续有效：

- 覆盖 `00-foundation.md` §4.1 与 `04-phase4-visual-polish.md` §6.1/6.2 中“App Shell 固定包含 Topbar”的描述。O1 目标 App Shell 为 `Sidebar + main + 内容容器 + Outlet`。
- 覆盖 `00-foundation.md` §3.13 与 `04-phase4-visual-polish.md` §7.6 中“Chat 不复用 MarkdownRenderer、AI 文本保持纯文本”的描述，但**只覆盖 assistant 正文**；user 消息仍是纯文本。
- 保留 Sidebar 的 248px / 80px / 移动 72px 底 tab 三态、内容 gutter、Login 独立布局、Search 语义、Chat SSE/JWT/store/检索/annotation 等全部既有契约。

---

## 二、背景与真实问题

### 2.1 重复搜索框

当前组件树为：

```text
MainLayout
├─ Sidebar
└─ main
   ├─ Topbar
   │  └─ SearchBar                 全局固定搜索框
   └─ 内容容器
      └─ Outlet
         ├─ Home → SearchBar       页面级搜索框
         └─ Search → SearchBar     页内搜索框
```

`frontend/black_box/src/layouts/MainLayout.tsx` 无条件渲染 `Topbar`；`Topbar.tsx` 的唯一职责是组合 `SearchBar` 并导航 `/search?q=`。与此同时，Home 与 Search 已各自拥有符合页面任务的 `SearchBar`。

第四期 P6 的 1440×1000 与 390×844 Home 截图均能看到上下两层搜索框。该现象由组件树稳定产生，不是 CSS、HMR 或某一视口的偶发问题。PostDetail、Compose、Chat、Mine 也被迫保留一个与当前页面任务无关的固定搜索区，占据 4.5rem 顶部高度。

### 2.2 Chat assistant 纯文本限制

`frontend/black_box/src/pages/Chat.tsx` 当前对 user 与 assistant 都使用 `whitespace-pre-wrap` 的纯文本 `<p>`。当模型输出标题、列表、强调、代码块或表格时，Markdown 标记会原样暴露，信息层级和可读性不足。

第四期已经建立唯一安全 `MarkdownRenderer`，并通过 Compose/PostDetail 验证了 GFM、旧单换行、sanitize、URL 白名单与宽内容局部滚动。Chat 尚未复用该能力。

### 2.3 当前 Chat 滚动事实

Chat 现有消息区是 `overflow-y-auto` 的单滚动容器，但代码没有显式“流式内容自动跟随到底部”的 ref/effect。O1 不把自动跟随写成既有能力，也不扩展为新的滚动功能；O1 要保证 Markdown 增量重渲染不会替换消息节点、重建滚动容器、重复消息或无故重置用户当前滚动位置。

---

## 三、目标与非目标

### 3.1 目标

- Home 仅保留一个页面级搜索框。
- Search 仅保留一个页内搜索框，并继续消费 `/search?q=`。
- PostDetail、Compose、Chat、Mine 不再出现全局搜索框或顶部空白壳。
- Login 独立布局完全不受影响。
- assistant 流式消息以安全 Markdown 增量展示，user 消息保持原始纯文本。
- annotation 引用继续独立呈现在 assistant Markdown 正文之后，并保持可点击站内链接。
- 复用现有 token、`SearchBar`、`MarkdownRenderer`、sanitize policy 和 P1～P4 组件，不形成第二套视觉或安全体系。

### 3.2 非目标

- 不新增或删除产品路由，不修改路由守卫。
- 不改变 Home/Search 的 API、store、debounce、history、category、排序或错误状态语义。
- 不改变 Chat 的 prompt、embedding、检索阈值、timeout、降级、JWT、限流或 SSE 字节协议。
- 不新增多会话、会话落库、停止生成、重新生成或显式自动滚动能力。
- 不将 user 消息解释为 Markdown。
- 不把 annotation 序列化进 Markdown 文本，不改变引用目标。
- 不修改后端、数据库、schema、migration、seed、原型或依赖。
- 不借 O1 清理历史 lint 债、重构页面信息架构或重做第四期视觉。

---

## 四、真实代码映射与现状分类

| 文件/模块 | 当前职责 | O1 处置 |
|---|---|---|
| `src/layouts/MainLayout.tsx` | Sidebar、Topbar、内容容器、Outlet | **修改**：移除 Topbar import/render；保留其余结构 |
| `src/components/Topbar.tsx` | 唯一职责是全局 SearchBar 导航 | **删除**：MainLayout 移除后全仓零引用 |
| `src/components/SearchBar.tsx` | 受控/非受控输入、清除、提交、loading | **保持**：Home/Search 继续复用，不内置路由/API |
| `src/pages/Home.tsx` | 页面级搜索入口，导航 `/search?q=` | **保持业务**：仍是 Home 唯一搜索入口 |
| `src/pages/Search.tsx` | 页内查询输入、q/category、debounce、history、retry | **保持业务**：仍是 Search 唯一搜索框 |
| `src/pages/Chat.tsx` | 消息气泡、纯文本正文、annotation chip、输入和状态 | **修改**：assistant 接共享 Markdown；user/引用/SSE 接线不变；重算去 Topbar 后高度 |
| `src/hooks/useChatBot.ts` | `useChat`、JWT、timeout、429、store 单向写回 | **不修改** |
| `src/store/useChatStore.ts` | 非持久化 `Message[]` | **不修改** |
| `src/components/MarkdownRenderer.tsx` | Compose/PostDetail 的唯一安全 renderer | **修改**：增加 `article|chat` 语义 variant，默认 article |
| `src/lib/markdown.ts` | remark plugins、sanitize schema、URL/图片策略 | **不修改**：Chat 必须消费同一策略 |
| 后端 `ai.controller.ts` | 写 `8:`、`0:`、`3:`、`d:` data stream parts | **不修改** |
| `e2e/ai-chat.spec.ts` | JWT、stream、引用、store 保持 | 人工验收前不改；验收后增量补行为用例 |

---

## 五、选定方案与淘汰方案

### 5.1 全局搜索框

**选定：从 MainLayout 物理移除 Topbar，并删除零引用 `Topbar.tsx`。**

理由：Topbar 没有搜索以外的职责；Home 与 Search 已有各自正确的页面级入口。物理删除能同时消除重复 UI、无关页面搜索框和顶部占位，不引入路由分支。

淘汰方案：

1. **按路由条件隐藏 Topbar**：会保留无意义组件与布局分支，容易在新路由上再次露出，也可能残留高度或 sticky 层。
2. **只用 CSS 隐藏**：DOM、可访问树和维护负担仍在，违背物理移除要求。
3. **把 Home/Search 状态提升到 Topbar**：会把页面 query、history、category、retry 与 Shell 耦合，改变现有状态边界。
4. **删除 Home 或 Search 页内输入**：Home 的明确入口和 Search 的查询编辑能力都会受损，不符合产品语义。

### 5.2 Chat Markdown

**选定：扩展唯一 `MarkdownRenderer` 为 `article|chat` variant，Chat 只对 assistant 使用 `chat`。**

理由：语法、安全、URL 与 XSS 策略只有一个来源；variant 仅决定排版密度，不复制解析器或 schema。默认 `article` 使 Compose/PostDetail 保持兼容。

淘汰方案：

1. **新建 Chat 专用 Markdown renderer**：会复制 plugins/schema/URL policy，后续安全修复容易分叉。
2. **后端把模型输出转 HTML**：扩大协议与信任边界，引入服务端渲染/存储语义，且流式 HTML 片段更脆弱。
3. **`dangerouslySetInnerHTML` 或 `rehype-raw`**：直接破坏第四期 XSS 口径。
4. **完成后一次性解析**：失去流式阅读体验，不符合边接收边展示要求。
5. **把引用拼成 Markdown 链接**：丢失结构化 annotation 契约，并改变现有可点击 chip 与目标路径。

---

## 六、App Shell 与搜索职责契约

### 6.1 目标结构

```text
MainLayout
├─ Sidebar                         保持三态
└─ main
   └─ 内容容器                     保持 max-width/gutter/padding
      └─ Outlet
         ├─ Home → SearchBar       导航入口
         ├─ Search → SearchBar     查询编辑/提交/清除/重试
         └─ 其他业务页             无搜索框
```

移除 Topbar 后不得保留空 `header`、占位 div、固定高度、sticky 层或用于补偿旧顶栏的 margin/padding。

### 6.2 页面行为矩阵

| 页面 | 搜索框终态 | 保留行为 |
|---|---|---|
| Home | 1 个页面级 SearchBar | trim 后非空导航 `/search?q=${encodeURIComponent(value)}`；空值导航 `/search` |
| Search | 1 个页内 SearchBar | category 优先、q 初始化、500ms debounce、手动提交去重、history、clear、retry |
| PostDetail | 0 | 详情、点赞、评论、Markdown 与固定评论栏不变 |
| Compose | 0 | 表单、上传、编辑/预览、提交不变 |
| Chat | 0 | 单会话、流式、引用与输入不变 |
| Mine | 0 | 用户摘要、头像上传、退出不变 |
| Login | 独立布局，不受 MainLayout 影响 | 登录/注册行为不变 |

### 6.3 响应式与高度

- Sidebar 继续严格使用 `>1024px` 248px、761～1024px 80px、≤760px 72px 底 tab。
- MainLayout 内容容器继续使用 `--container-max` 与桌面/平板/手机 gutter；移除 Topbar 不改变横向布局。
- 所有业务页内容自然上移 4.5rem，不增加替代 banner 或空白带。
- Chat 当前固定高度公式包含旧 Topbar 高度。O1 必须同步重算：桌面/窄桌面只扣除内容容器纵向 padding；移动端另扣 `--bottombar-h` 与 `env(safe-area-inset-bottom)`。不得保留旧 Topbar 的 4.5rem 幽灵减项，也不得产生页面与消息区双滚动。
- PostDetail 移动评论栏仍只避让底 tab/safe-area；不因顶栏删除改动评论业务或 fixed bottom 规则。

### 6.4 可访问性

- Home 与 Search 的 `SearchBar` 继续使用原生 `role="search"` form、可访问提交/清除名称和 ≥44px 命中区。
- 其他业务页的可访问树中不再出现无关 search landmark。
- 移除 sticky Topbar 后，页面标题或返回按钮成为内容区首个主要焦点目标；不添加自动聚焦，避免路由切换抢焦点。
- Sidebar 导航顺序、active `data-state`、键盘可达性和移动底 tab 不变。

---

## 七、共享 MarkdownRenderer 契约

### 7.1 类型契约

```ts
type MarkdownRendererVariant = 'article' | 'chat';

interface MarkdownRendererProps {
  content: string;
  variant?: MarkdownRendererVariant; // 默认 article
  className?: string;
  empty?: React.ReactNode;
}
```

- `article` 是兼容默认值，保持 Compose/PostDetail 已验收的排版和行为。
- `chat` 只调整组件映射中的视觉密度与消息容器适配，不改变 plugins、sanitize schema、URL transform、图片失败策略或节点语义。
- variant 使用明确 prop/data 属性表达，不通过调用方复制一组私有 Markdown class。

### 7.2 单一解析与安全来源

两个 variant 必须共同使用：

- `markdownRemarkPlugins = [remarkGfm, remarkBreaks]`
- `rehypeSanitize + markdownSanitizeSchema`
- `skipHtml`
- `markdownUrlTransform`
- `sanitizeLinkUrl`、`sanitizeImageUrl`、`isInternalMarkdownLink`
- 同一个 React components 生成入口

实现可按 variant 选择排版 class 映射，但不得创建第二个 `ReactMarkdown` 封装、第二份 schema 或第二套 URL 函数。

### 7.3 article 与 chat 排版差异

| 元素 | article | chat |
|---|---|---|
| h1/h2/h3 | 帖子正文层级与较大段前距 | 保留语义层级，字号与段前距收紧到消息气泡尺度 |
| paragraph | `leading-7`、正文段距 | 紧凑行高与段距，首尾不增加气泡空白 |
| ul/ol/li | 正文列表间距 | 缩小列表项间距，保留 marker 和缩进 |
| blockquote | 正文强调块 | 紧凑左边框与 padding，不形成嵌套大卡片 |
| inline code | token 背景、可断行 | 同安全节点，颜色适配 assistant 气泡，长 token 可断行 |
| fenced code | 局部横滚 | 气泡内局部横滚，不撑宽气泡 |
| table | `min-width` + 局部横滚 | 保持可读最小表宽，仅表格容器横滚 |
| link/image | 同一安全策略 | 同一安全策略与可见 focus；不得突破气泡宽度 |

Chat variant 不引入 `prose` 主题、不缩放字体随 viewport 变化、不使用页面私有颜色或阴影。

---

## 八、Chat 数据流与渲染契约

### 8.1 不变的数据流

```text
user submit
  → useChatBot / useChat@1.2.12
  → POST /api/ai/chat + Authorization
  → backend data stream
      8: annotation citations（可选，通常先于正文）
      0: assistant text token（多次）
      3: stream error（可选）
      d: finish
  → useChat messages
  → useChatStore 单向内存快照
  → Chat render
```

O1 只改变最后一个呈现步骤，不修改任一上游边界。

### 8.2 角色分流

```tsx
message.role === 'assistant'
  ? <MarkdownRenderer content={message.content} variant="chat" />
  : <p>{message.content}</p>
```

- user 文本由 React 默认转义并保留换行；`**粗体**`、`[链接](...)`、HTML 等均按原始字符显示。
- assistant 内容视为不可信输入，必须经过共享 sanitizer 后渲染。
- system/data 等非 assistant 角色若未来由 SDK 暴露，也不得自动进入 Markdown；O1 不扩展角色语义。

### 8.3 流式增量

- 每次 `message.content` 增长时，renderer 直接解析当前完整前缀，不建立第二份 buffer、不等待 `d:`、不 debounce token。
- 未闭合强调、反引号、代码围栏、表格行或链接在当前前缀下按 `react-markdown` 的安全容错结果展示；后续 token 到达后自然重解析。
- `article` 的 React key 继续使用稳定 `message.id`，不得改为 content/hash；否则每个 token 都会卸载重建消息节点并破坏滚动/焦点。
- 不把解析结果写入 `useChatStore`；store 仍只保存 AI SDK `Message[]`。
- 不复制或追加消息来表达“解析中”，现有 `chat-loading` 继续独立表示生成状态。

### 8.4 annotation 引用

- `message.annotations` 继续独立解析为 `{id,title}[]`。
- 引用区域继续位于 assistant Markdown 正文之后；无引用时不渲染空容器。
- citation title 仍由 React 作为文本转义，不交给 MarkdownRenderer。
- citation `id` 继续生成 `/post/:id`，保留 `chat-citations` 与 `chat-citation-link` testid、focus 和点击行为。
- Markdown 正文中的普通链接与 citation chip 是两种并列来源，不互相替换、去重或合并。

---

## 九、安全边界

### 9.1 必须继承的防护

- 禁止 `dangerouslySetInnerHTML`、`rehype-raw`、手写 HTML 拼接和后端预渲染。
- raw HTML、script、iframe、style、form、事件属性不进入输出。
- 链接只允许 `http:`、`https:`、`mailto:` 与站内相对路径；拒绝控制字符、反斜杠、`//`、`javascript:`、`data:` 等危险形式。
- 图片只允许绝对 `http/https`，继续使用 lazy、async decode、no-referrer 与 React 失败 fallback。
- 外链继续使用 `target="_blank"` 与 `rel="noopener noreferrer"`；站内相对链接继续用 Router Link。
- GFM task checkbox 强制 disabled，不允许模型输出可提交表单。

### 9.2 专项攻击样例

自动测试至少覆盖：

- `<script>alert(1)</script>`
- `<img src=x onerror=alert(1)>`
- `<iframe src="https://evil.example"></iframe>`
- `[x](javascript:alert(1))`
- 混合大小写、控制字符与反斜杠协议绕过
- `[x](//evil.example)`
- `![x](data:text/html,...)`
- 未闭合 `[link](https://example.com`、反引号、强调、代码围栏和表格前缀

验收要求是危险节点、属性和 URL 不进入 DOM，解析过程不抛错，后续 token 到达后可继续形成正常安全结构。

---

## 十、响应式、长内容与可访问性

### 10.1 四视口

统一检查：

- 1440×1000
- 900×1000
- 390×844
- 320×740

### 10.2 搜索与页面布局

- Home 只有一个 SearchBar，页面首区与轮播间距自然衔接。
- Search 只有页内 SearchBar，返回按钮、输入、清除、提交在 320px 下均不被挤压。
- PostDetail、Compose、Chat、Mine 顶部没有 search landmark、边线、透明层或 4.5rem 空白。
- 页面 `scrollWidth === clientWidth`；Sidebar 三态和移动底 tab 无遮挡。

### 10.3 Chat 内容

- assistant 标题、段落、列表、引用、代码和表格在气泡内保持紧凑层级。
- 长 URL/连续字符可断行；fenced code 与 table 只在自身容器横向滚动。
- Markdown 外层、气泡 flex item、table/pre wrapper 均保持 `min-width:0/max-width:100%` 约束，不能重现 Compose 预览 intrinsic width 撑宽问题。
- user 的 Markdown 标记原样可见；assistant 的同样标记按语义渲染。
- 消息区继续 `aria-live="polite"`；链接保持键盘 focus。O1 不新增自动 focus 或朗读专用副本。
- reduced-motion、typing spinner 和发送 busy 规则保持第四期现状。

---

## 十一、兼容、风险与回滚

### 11.1 兼容策略

- `MarkdownRenderer.variant` 默认 `article`，现有 Compose/PostDetail 调用无需改动即可保持原结果。
- `SearchBar` API、Home/Search 调用和路由编码保持不变。
- 删除 Topbar 不删除 SearchBar，也不改变 `/search` 的 RequireAuth。
- Chat 不复制 messages、不修改 annotations，因此切走/切回内存保持与刷新可丢语义不变。

### 11.2 主要风险

| 风险 | 约束/验证 |
|---|---|
| 删除 Topbar 后 Chat 高度仍扣旧高度 | 重算可用高度，四视口检查消息区/输入栏/底 tab与页面双滚动 |
| chat variant 误改 article 排版 | 默认 article，Compose/PostDetail 单测和截图回归 |
| 每个 token 重建消息节点 | 保持 `key=message.id`，不引入 content key或 shadow state |
| 宽表格撑破气泡/页面 | flex item `min-w-0`，table/pre 局部 overflow，断言页面无横溢 |
| assistant XSS | 完整复用现有 policy，专项恶意前缀与完成态测试 |
| user 被误解析 | 角色分支测试，user Markdown 标记必须按文字显示 |
| annotation 被 Markdown 吞并 | 引用区域保持正文后独立 Link chip，现有 testid/目标不变 |

### 11.3 回滚边界

- Shell 改动可独立回滚：恢复 `Topbar.tsx` 与 MainLayout import/render，不影响 Markdown。
- Markdown 改动作为一组回滚：Chat 接线与 renderer variant 同时回滚，默认 article 调用和 `lib/markdown.ts` 不动。
- 无数据库、后端、依赖或数据迁移，回滚不需要数据恢复。
- 若安全测试失败，必须回滚 Chat Markdown 接线，不能通过放宽 sanitize schema 或启用 raw HTML解决。

---

## 十二、实施文件职责矩阵

### 12.1 业务实现阶段

| 路径 | 动作 | 唯一职责 |
|---|---|---|
| `frontend/black_box/src/layouts/MainLayout.tsx` | 修改 | 移除 Topbar；保留 Sidebar/main/内容容器/Outlet |
| `frontend/black_box/src/components/Topbar.tsx` | 删除 | 确认零引用后物理删除全局搜索壳 |
| `frontend/black_box/src/components/MarkdownRenderer.tsx` | 修改 | 新增 `article|chat` variant，共享解析与安全策略 |
| `frontend/black_box/src/pages/Chat.tsx` | 修改 | 按角色选择 Markdown/纯文本、保持引用独立、重算高度 |
| `frontend/black_box/src/components/MarkdownRenderer.test.tsx` | 修改 | variant、GFM、前缀容错、XSS 与 article 回归 |
| `frontend/black_box/src/pages/Chat.test.tsx` | 新增 | assistant Markdown、user 纯文本、引用顺序的 SSR/组件契约 |

### 12.2 明确不改

| 路径 | 原因 |
|---|---|
| `src/components/SearchBar.tsx` | 现有契约已满足 Home/Search |
| `src/pages/Home.tsx` | 搜索导航与业务状态已正确 |
| `src/pages/Search.tsx` | q/category/debounce/history/retry 已正确 |
| `src/hooks/useChatBot.ts` | SSE/JWT/timeout/store 接线不属于呈现改造 |
| `src/store/useChatStore.ts` | 单会话内存语义不变 |
| `src/lib/markdown.ts` | 现有安全 policy 直接复用，不复制不放宽 |
| `src/components/Sidebar.tsx` | 三态与导航目的地不变 |
| `src/router/index.tsx` | 路由与守卫不变 |
| 后端全部文件 | 协议、检索与模型行为不变 |

### 12.3 文档与 QA

| 路径 | 动作 |
|---|---|
| `docs/design/05-post-phase4-ux-optimization.md` | 实施后回填完成/人工验收状态 |
| `docs/design/00-foundation.md` | 实施验收后回填 App Shell 无 Topbar、MarkdownRenderer variant 的最新共享契约 |
| `docs/qa/post-phase4-ux-optimization/` | 新增基线、自动验证、四视口截图与人工验收记录 |
| `.planning/post-phase4-ux-optimization/` | 持续记录实施检查点与最终关闭 |

`docs/design/04-phase4-visual-polish.md` 保持第四期历史事实，不重写其已验收阶段内容；由本文明确后继覆盖关系。

---

## 十三、实施批次与完成条件

### O1.0 范围冻结与基线

- 记录工作树与 O1 预计触碰文件，不覆盖前三期/第四期未提交改动。
- 运行前端 unit、build、差分 lint、Playwright `--list` 与现有 41 条基线。
- 复用 P6 截图并补当前双搜索框/Chat 纯文本状态证据。

**完成条件**：基线结果和既有失败债分开记录；如出现新行为失败，停止 O1 实现。

### O1.1 App Shell 搜索收口

- MainLayout 移除 Topbar import/render。
- 全仓确认零引用后删除 Topbar。
- 核对 Home/Search 搜索职责与其他业务页自然上移。
- 重算 Chat 可用高度，但不改消息业务。

**完成条件**：四视口页面无空白顶栏；Home/Search 搜索数量和行为符合 §6.2；Sidebar/路由回归通过。

### O1.2 MarkdownRenderer variant

- 先扩充单元测试，再增加 `article|chat` variant。
- article 默认结果保持；chat 使用紧凑排版并继承同一安全 policy。
- 以完整内容和多个未闭合流式前缀验证不抛错。

**完成条件**：Markdown/XSS/旧换行/GFM/危险 URL 全部通过；Compose/PostDetail 无回归。

### O1.3 Chat 接线

- assistant 使用 `variant="chat"`，user 继续纯文本。
- annotation 继续在正文后独立呈现。
- 不修改 hook/store/backend，保持稳定 message id 与现有 loading/error/input。

**完成条件**：mock 流和一次真实流均能边接收边展示；完成后引用、store、timeout/降级不变。

### O1.4 自动回归与人工验收

- 执行 §十四自动矩阵。
- 生成 7 页 × 4 视口的 28 张 O1 截图；Login 作为独立布局控制样本。
- 对 Home/Search/Chat 做完整交互串验，对其余业务页检查顶栏清除与布局上移。

**完成条件**：用户明确人工验收通过；此前不新增或修改 O1 Playwright 用例。

**实施状态（2026-07-17）**：O1.4 已完成全量 unit、build、差分 lint、既有 7 files/41 tests Playwright 回归、110 条受保护文件 SHA-256 前后比对、七页四视口 28 张默认态截图及 Chat Markdown 四视口专项截图。稳定 mock 已覆盖安全 Markdown、未闭合前缀、长代码/宽表格、user 纯文本与 annotation chip；真实 AI 本次在约 6.9 秒内完成并由 `variant="chat"` 渲染。用户人工复验通过后，O1.5 新增 5 条稳定行为锁定，终态为 8 files/46 passed；O1 已关闭。

### O1.5 人工验收后的 e2e 锁定与文档关闭

- 新增 `e2e/app-shell-ux.spec.ts` 三条稳定行为：Home 单一 search landmark；Search 单一页内搜索并消费 q；PostDetail/Compose/Chat/Mine 无全局 search landmark。
- 在 `e2e/ai-chat.spec.ts` 增加两条：assistant 流式 Markdown + citation；user Markdown 标记保持纯文本。
- 现有 7 files/41 tests 不删除、不弱化；增量后目标为 8 files/46 tests。
- 回填 foundation、本文、QA 与 planning 的最终事实。

**完成条件**：增量 e2e 全绿且用户已先人工确认；O1 关闭但不自动进入第五期。

---

## 十四、验证与验收矩阵

### 14.1 自动验证

| 类别 | 验证口径 |
|---|---|
| Type/build | 显式注入 `VITE_API_BASE_URL` 后 `pnpm build` 成功 |
| 单元测试 | 现有 12 files/29 tests 全部保持；新增 Markdown/Chat 测试通过 |
| 定向 lint | O1 新增/修改 TS/TSX 为 0 errors / 0 warnings |
| 全量 lint | 不高于第四期批准基线 3 errors / 0 warnings；剩余只允许既存 `ui/badge.tsx` 与 `utils/index.ts` |
| 实施前行为回归 | Playwright 保持 7 files/41 passed，不提前改断言 |
| 静态引用 | `Topbar` 文件删除且业务源码零引用；SearchBar 仅由 Home/Search 使用 |
| 安全扫描 | `dangerouslySetInnerHTML`、`rehype-raw`、新 Markdown policy/renderer 均零新增 |
| 协议守恒 | 前后端仍使用 `0:/3:/8:/d:`，Authorization、timeout、annotation 与 store 文件无 diff |

### 14.2 搜索人工验收

- 1440/900/390/320 下 Home 只出现一个页面级搜索框。
- Home 输入中文和 `& ? # %` 后，URL 只编码一次并进入 `/search?q=`。
- Search 正确显示 q、仅发既有搜索请求；修改、清除、retry、category 优先和 history 正常。
- PostDetail、Compose、Chat、Mine 不出现搜索框、顶栏边线、透明遮罩或空白占位。
- Sidebar 三态、移动底 tab、安全区与 Login 独立布局不变。

### 14.3 Chat Markdown 人工验收

- assistant 在流式生成中与完成后正确显示标题、段落、强调、列表、引用、链接、行内代码、代码块和表格。
- user 输入 `**不要加粗**`、`[不要变链接](/post/1)`、`<b>text</b>` 时按原始纯文本显示。
- 未闭合强调、链接、反引号、围栏代码和表格前缀不会崩溃、复制消息或卡死 loading。
- 危险 HTML/URL 不执行、不生成危险 href/src；安全站内/外链保持既有行为。
- 长链接正常断行；长代码和宽表格只局部横滚；页面和消息区不横向撑宽。
- annotation chip 始终位于正文后，标题、目标 `/post/:id`、focus 和点击跳转不变。
- 切走 Chat 再返回消息仍在，刷新可丢；有限 timeout、检索失败降级和错误状态不变。

### 14.4 截图与人工门禁

- O1 截图覆盖七页、四视口，共 28 张，并与 P6 默认态并排抽查。
- 截图只用于视觉评审，不新增像素阈值或 CSS/DOM 层级行为断言。
- 重点检查页面首屏上移、Chat 可用高度、移动底栏、长 Markdown、局部滚动与 focus。
- 用户未明确“人工验收通过”前，不执行 O1.5，不新增对应 Playwright e2e。

---

## 十五、自审结论

- **范围**：仅两项 O1 优化；未引入第五期、后端、数据库、依赖或新产品能力。
- **权威关系**：已明确两处窄范围后继覆盖，其他 foundation/03/04 契约继续有效。
- **单一体系**：SearchBar 与 MarkdownRenderer 均复用现有组件；无第二套搜索或 Markdown 安全实现。
- **真实映射**：Topbar 已物理删除且零引用；Home/Search 各自保留 SearchBar；Chat/annotation/hook/store 接缝均按当前代码记录。
- **安全**：assistant 内容按不可信输入处理；user 纯文本；annotation 独立；禁止 raw HTML。
- **验收时机**：已先完成 unit/build/lint/原 41 条与人工四视口验收，再补 5 条稳定 e2e，终态为 8 files/46 passed。
- **占位检查**：本文无模糊占位或未闭合决策。
- **需新增产品拍板事项**：无。

**实现与验收状态（2026-07-17）：** O1 已按确认设计完成并经用户人工验收通过。全局 Topbar 已物理删除，Home/Search 各保留一个页面级 SearchBar；Chat assistant 复用唯一安全 `MarkdownRenderer variant="chat"`，user 保持纯文本，annotation 引用独立。最终自动门禁为 unit 13 files/39 passed、Playwright 8 files/46 passed、build 成功；差分 lint 0/0，全量 lint 保持批准的 3 errors/0 warnings 历史基线。O1 已关闭，不自动进入第五期。
