# O1 调研发现

## 已确认输入

- 第四期已整批人工验收通过。
- O1 仅包含两条优化线：物理移除 App Shell 全局 Topbar 搜索区；assistant 消息复用共享 Markdown 安全渲染器。
- Home 页面级 SearchBar 与 Search 页内搜索框均保留，职责不同。
- Chat 的 SSE/JWT/store/timeout/检索与 annotation 引用协议保持不变。

## 待核对证据

- MainLayout 是否直接渲染 Topbar、Topbar 是否存在其他引用。
- Home 与 Search 各自 SearchBar 的真实接线及 `/search?q=` 消费。
- Chat 当前 assistant/user 消息渲染差异、流式 message 更新和 annotation 渲染位置。
- MarkdownRenderer 的 props、sanitize schema、链接/图片与宽内容约束。
- 现有测试锚点及第四期基线中会受 O1 影响的行为面。

## 已核对：全局搜索框

- `layouts/MainLayout.tsx` 无条件 import 并渲染 `<Topbar />`，位置在 Sidebar 后、Outlet 内容容器前。
- `components/Topbar.tsx` 的唯一职责是持有临时查询值并组合 `SearchBar` 导航 `/search?q=`；无品牌、导航或其他全局命令职责。
- `pages/Home.tsx` 已有独立页面级 `SearchBar`，同样正确编码并导航 `/search?q=`。
- `pages/Search.tsx` 已有页内 `SearchBar`，负责关键词修改、提交、清空、retry 及现有 debounce/history/category 语义。
- 全仓引用显示 `Topbar` 只有 `MainLayout` 一个消费者；实现时从 MainLayout 移除后可物理删除 `Topbar.tsx`，不保留空 header。
- P6 Home 的 1440 与 390 截图均直观看到 Shell 搜索框和 Home 搜索框上下重复；这是组件树结构造成的稳定现象，不是 CSS 偶发。

## 已核对：Chat 与 Markdown

- `pages/Chat.tsx` 当前对 user/assistant 均使用 `whitespace-pre-wrap` 纯文本 `<p>`；assistant 的 `message.annotations` 在正文后独立渲染为 `/post/:id` Link chip。
- `hooks/useChatBot.ts` 封装 `useChat@1.2.12`、JWT header、55 秒客户端 timeout、429 反馈和 messages 单向写回 store；O1 无需修改 hook 或 store。
- `store/useChatStore.ts` 仅保存 `Message[]`，不 persist；切走恢复、刷新可丢的单会话语义保持。
- `MarkdownRenderer.tsx` 已统一使用 `react-markdown@10.1.0`、`remark-gfm`、`remark-breaks`、`rehype-sanitize`，并通过 `lib/markdown.ts` 实施 URL/图片白名单与 sanitize schema。
- 共享 renderer 当前只有 article 风格：标题、段落、列表、引用、表格、代码块间距偏正文；O1 需要新增 `article|chat` 单一 variant 契约，而不是复制 renderer。
- renderer 已有 `min-w-0`、表格/pre 局部横滚、长文本断行、安全内外链及图片失败回退；chat variant 必须继承安全/结构逻辑，只替换排版密度。
- Chat 当前只有 `overflow-y-auto` 消息容器，没有显式自动跟随流式内容滚到底部的代码。设计不得把“自动滚动”写成已存在事实；O1 只要求 Markdown 重渲染不重置用户当前滚动位置或制造重复消息，新增自动跟随不属于本批次。

## 权威文档窄范围冲突

- `00-foundation.md` §4.1 与 `04-phase4-visual-polish.md` §6.1/6.2 把 Topbar 写为 App Shell 固定组成；O1 将仅覆盖“Topbar 固定存在”这一点，Sidebar 三态、内容容器、路由和 Login 独立布局继续有效。
- `00-foundation.md` §3.13 与 `04-phase4-visual-polish.md` §7.6 把 Chat 定为纯文本且不复用 MarkdownRenderer；O1 将仅覆盖 assistant 正文呈现，user 纯文本、annotation chip、SSE/JWT/store/AI 行为继续有效。
- `04-phase4-implementation-plan.md` P3.5 的 Chat 高度明确按 App Shell Topbar 计算。物理移除 Topbar 后必须同步重算 Chat 可用高度，减项只保留内容容器纵向 padding、移动底 tab 与 safe-area，不能留下 4.5rem 幽灵空白。

## 方案比较结论

- 全局搜索选物理移除 MainLayout 中 Topbar 并删除零引用文件；淘汰按路由条件隐藏和把页面搜索状态提升到 Shell，两者分别会留下布局分支/空壳或引入跨页状态耦合。
- Chat 选共享 `MarkdownRenderer variant="article|chat"`；淘汰复制 Chat renderer、后端预渲染 HTML、把 annotation 拼入 Markdown。三种淘汰方案分别造成安全策略分叉、协议/存储扩域、结构化引用语义丢失。
- renderer 默认 variant 保持 `article`，Compose/PostDetail 无调用改动；Chat 只对 `role === "assistant"` 使用 `chat` variant，其余角色保持 React 纯文本转义。

## 设计产物结论

- 05 文档将 O1 分为基线、Shell 收口、renderer variant、Chat 接线、人工验收、验收后 e2e 六个检查点。
- 实施前 Playwright 保持 7 files/41 tests；用户人工验收后计划新增 5 条稳定行为并形成 8 files/46 tests。
- 四视口仍为 1440×1000、900×1000、390×844、320×740；O1 计划重拍七页 28 张，以 Login 作为独立布局控制样本。
- 现有 `lib/markdown.ts`、`useChatBot.ts`、`useChatStore.ts`、Home、Search、SearchBar、Sidebar、router 与全部后端均明确不改。

## 实施计划结论

- 实施计划落在 `docs/plans/05-post-phase4-ux-optimization-implementation-plan.md`，按 O1.0～O1.5 分批；O1.0 基线需用户确认，O1.4 功能与视觉需用户人工验收，O1.5 才允许补增量 Playwright。
- 产品代码责任边界只包含 `MainLayout.tsx`、`Topbar.tsx`、`Chat.tsx` 和 `MarkdownRenderer.tsx`；其余变动限聚焦单测、QA 脚本及文档记录。
- 当前仓库存在历史未提交改动，普通 `git diff` 无法证明 O1 未越界；计划改用禁改文件 SHA-256 前后清单，任一差异都先停止并核对所有权。
- O1 实施前后 Playwright 门禁分别保持 7 files/41 tests；人工验收后目标为 8 files/46 tests。全量 lint 继续采用第四期批准的差分口径，不借 O1 清理无关债务。

## O1.4 最终验证发现

- 七页默认态截图 28/28、Chat Markdown 专项截图 4/4；Home/Search 各只有一个页面级搜索框，其余 App Shell 业务页无全局搜索框或空顶栏。
- 稳定 mock 专项检查确认 assistant 标题、列表、引用、链接、代码和表格按紧凑 Markdown 排版；user Markdown 符号保持纯文本；annotation chip 独立位于正文之后。
- 1440/900/390/320 均满足页面 `scrollWidth === clientWidth`；长代码和宽表格仅在自身容器局部横向滚动。
- XSS fixture 未产生 script/iframe/事件属性或危险链接，未触发全局 XSS 标记；未闭合流式前缀由单元测试覆盖且不抛错。
- 真实 AI 本次约 6.9 秒完成；assistant 使用唯一 `data-variant="chat"` renderer，形成 3 个语义节点，390px 页面宽度无扩张。
- 110 条受保护文件前后 SHA-256 差异为 0；O1 未触碰 Search/Home/hook/store/backend/SSE/JWT 等禁改边界。
- 临时真实链路 QA 脚本已物理删除；现有 Playwright 文件与断言未修改，仍为 7 files/41 tests。

## O1.5 关闭结论

- 用户先完成人工复验，再授权补行为 e2e，时机符合跨期测试纪律。
- 新增 `app-shell-ux.spec.ts` 3 条，锁定 Home/Search 搜索职责、q 消费、无 Topbar 页面与 Login 独立布局。
- `ai-chat.spec.ts` 保留原 3 条并新增 2 条，锁定 assistant Markdown + citation 与 user 纯文本。
- 首轮增量测试唯一失败来自可访问名称模糊匹配测试定位；收紧 `exact: true` 后 8/8，通过过程未改产品代码。
- 最终 Playwright 8 files/46 passed，unit 13 files/39 passed，build 2455 modules，O1.5 定向 lint 0/0，全量 lint 保持批准的 3/0 历史基线。
- foundation 已回填无 Topbar App Shell、Home/Search 页面级 SearchBar 和 `MarkdownRenderer article|chat` 单一安全契约。
- O1 已关闭，不提交 Git，不自动进入第五期。
