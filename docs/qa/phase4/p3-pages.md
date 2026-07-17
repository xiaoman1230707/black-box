# 第四期 P3 页面迁移 QA

## P3.1 Home

**状态：** 自动验证、执行者四视口检查及用户人工验收均通过；允许进入 P3.2。

### 行为契约

- 迁移前、迁移后均运行 `home.spec.ts` 与 `game-filter.spec.ts`：8/8 passed。
- 保留 `tag-all`、`tag-chip`、`game-filter-row`、`game-chip`、`post-item` testid 和 `data-state=active|inactive`。
- 未修改 `useHomeStore`、API、路由或既有 e2e；tag×game AND、独立 toggle、分页、双维度竞态、详情回写和 sessionStorage 滚动恢复沿用原实现。
- Home SearchBar 只 trim、编码并导航 `/search?q=`，不调用搜索 API、不写搜索历史。

### 自动验证

- Home 定向 lint：0 errors / 0 warnings。
- 全量 lint：14 errors / 3 warnings，命中清单与 P2 批准基线一致，无 Home 新增问题。
- build：通过，2086 modules transformed。
- Playwright 清单：7 files / 41 tests；本页相关 8 tests passed。
- 首次沙箱内 build/Vite/Chromium 分别遇到本地 Inter 读取或进程启动 `EPERM`；沿用 P2 已批准方式，以沙箱外唯一 Vite 和 Chromium 复验，不修改配置或依赖。

### 四视口与交互检查

截图位于 `docs/qa/phase4/screenshots/p3-home/`；工具保持完整 manifest，生成 28/28，本节只验收四张 `home.png`。

| 视口 | 帖子列数 | 页面横向溢出 | 超长游戏 chip | 结果 |
|---|---:|---:|---:|---|
| 1440×1000 | 2 | 0px | 344×44px | 通过 |
| 900×1000 | 1 | 0px | 344×44px | 通过 |
| 390×844 | 1 | 0px | 344×44px | 通过 |
| 320×740 | 1 | 0px | 344×44px | 通过 |

- 两行筛选在窄屏横向滚动，chip 不压缩交互目标；移动底部导航未覆盖筛选或首张帖子。
- 一次性非 e2e route-mock QA 验证：InfiniteScroll 从 10 追加至 12；快速切游戏时延迟旧响应被丢弃；少帖游戏令 `hasMore=false` 后仍能切换；搜索导航正确编码中文及 `&`；详情往返恢复 `scrollY=500`。临时脚本已删除。
- 截图人工抽查未发现页面级横向滚动、控件遮挡、轮播与标题冲突；用户已确认 P3.1 Home。

### 静态残留

- `Home.tsx` 已清除私有 sticky header、直接 orange 色阶、页面渐变、柔阴影、大圆角和私有 button/chip 样式。
- 页面只组合 SearchBar、SildeShow、TagChip、PostItem、InfiniteScroll、Loading；未建立第二套组件体系。
- Home 无可靠 error channel，因此仅呈现真实 initial loading、筛选空态和分页 loading，不伪造错误态。

## P3.2 Search

**状态：** 页面级施工、自动验证和四视口检查完成，已随 P3 整批人工验收通过。

### 实现与契约

- `Search.tsx` 消费 `/search?q=`，URLSearchParams 解码结果作为 keyed 内容边界初值；category 非 `all` 时优先走原 `searchByTag()`，否则 q 经原 500ms debounce 调原 `search()`。
- 手动提交立即搜索并以 ref 只跳过紧随其后的同值 debounce；清除仍调用 `search('')` 清结果，不清历史。Search store 仅新增非持久化 `error`，`partialize` 仍只保存 history。
- `PostItem` 增加 foundation 已登记的 `highlight?: string`；标题/摘要通过转义正则后的 React 文本分段输出 `<mark>`，不用 innerHTML，其他页面默认路径不变。
- 页面统一使用 SearchBar、Button、Card 和唯一 PostItem；移除字符串 suggestion 死分支、私有 Input/ScrollArea 结果卡和重复点击导航包装。

### 验证

- 迁移前/后 `auth-guard.spec.ts`：11/11 passed；Search/PostItem/store 定向 lint 0/0；页面级 build 通过（2086 modules）。
- 一次性非 e2e route-mock QA：q 首次请求 1 次；快速手动提交后总请求只增加 1；category+q 只请求 category；history 持久化对象仅有 history；500 显示 error，重试空结果显示 empty；含括号关键词在标题/摘要安全高亮。临时脚本已删除。
- 首轮整批评审补充复现：修复前 `A` debounce 完成后再提交 A，随后输入 B、再输入 A，实际请求序列为 `A,A,B`，证明过期 `skipNextDebounce` 误吞最后一次 A。修复后下一轮 debounce 必定清空标记，仅同值跳过；同一 QA 得到 `A,A,B,A`，快速提交仍仅 `rapid` 一次，首次 q 仍仅 `initial` 一次，category 只请求 `/api/posts?...&tag=guide`，persist state 仍只有 history。临时脚本已删除。
- `p3-search` 截图工具输出 28/28，本节抽查四张 Search：1440/900/390/320 无页面横向溢出、底部导航遮挡或双滚动；320 历史项自然换行，按钮保持可操作。

## P3.3 PostDetail

**状态：** 页面级施工、自动验证和四视口检查完成，已随 P3 整批人工验收通过。

### 实现与契约

- 正文只使用真实 `content ?? brief`，保留纯文本换行兼容接缝；Markdown 安全渲染仍留 P4。未伪造游戏信息、评论时间、关注入口或应用推广。
- 点赞使用 P1 `StatButton` 的 `liked|idle` 契约；评论、回复、删除、分享与详情数据加载语义保持不变，`social.spec.ts` 只同步状态名和触及类型，不减少 7 条用例或放宽断言。
- 评论项抽为页面职责内的 `pages/post/CommentItem.tsx`，只负责两层展示和既有事件回调，不接 API/store，不形成跨页第二套组件系统。
- 移动评论输入栏位于 `72px + safe-area` 底部导航之上；桌面和窄桌面从 Sidebar 右缘开始，避免覆盖导航。

### 验证

- 迁移前/后 `social.spec.ts`：7/7 passed；PostDetail/CommentItem/social 定向 lint 0/0；页面级 build 通过（2058 modules）。
- `p3-post-detail` 截图工具输出 28/28，本节抽查四张 PostDetail；据首轮截图将标题收敛为页面尺度并把原始 ISO 改为真实日期格式后复验 social 7/7。
- 一次性四视口几何 QA：1440/900/390/320 横向溢出均为 0；桌面输入栏左缘与 Sidebar 右缘一致；移动输入栏底缘与底部导航顶缘一致；滚动到底后末条评论均未被输入栏遮挡。临时脚本已删除。

## P3.4 Compose

**状态：** 页面级施工、自动验证和四视口检查完成，已随 P3 整批人工验收通过。

### 实现与契约

- 页面统一组合 Card、Input、Textarea、P1 Base UI Select、TagChip 和 Button；未知内容类型通过 `getContentTypeVariant()` 回退 `soft`，不保留原生 select 或页面私有 chip/button 体系。
- 保留逐文件即时上传与部分失败不回滚、上传中禁用提交、标题/正文必填、`gameId/tagIds/fileIds` 请求字段、创建后回拉详情、`prependPost()` 及详情导航语义。
- `compose.spec.ts` 只把原生 `selectOption()` 改为真实 combobox/option 操作并收紧触及类型；仍为 5 条，全部业务断言保持。
- Markdown 编辑/预览仍留 P4，本页不增加依赖、存储字段或预览行为。

### 验证

- 迁移前/后 `compose.spec.ts`：5/5 passed；Compose/compose spec 定向 lint 0/0；页面级 build 通过（2167 modules）。
- `p3-compose` 截图工具输出 28/28，本节抽查四张 Compose：1440/900/390/320 表单宽度稳定、标签自然换行、图片入口保持固定尺寸，移动底部导航不覆盖当前可见控件且页面可继续滚动；无页面横向溢出或双滚动。

## P3.5 Chat

**状态：** 页面级施工、自动验证和四视口检查完成，已随 P3 整批人工验收通过。

### 实现与契约

- 页面只重组 `useChatbot()` 已有返回值；未修改 `useChatBot.ts`、`useChatStore.ts`、JWT header、SSE `0:/8:/d:`、检索阈值、annotation 或单会话内存语义。
- 移除嵌套 `h-screen`，按 App Shell 的 Topbar、页面 gutter、移动 72px 底栏和 safe-area 建立单一消息流高度；消息区内部滚动，输入栏稳定在其下。
- 用户/助手消息、typing 和 hook error 使用 token 状态；AI 内容仍为纯文本并保留换行。引用仍是 `<Link to="/post/:id">`，保留三个引用/消息 testid 和完整标题 `title`。
- `Header.tsx` 在 `rg` 确认只被 Chat 使用且迁移后零引用时删除；Topbar 仅同步移除已失真的历史注释，无运行行为变化。

### 验证

- 迁移前/后 `ai-chat.spec.ts`：3/3 passed；Chat/Topbar 定向 lint 0/0；页面级 build 通过（2166 modules）。
- `p3-chat` 截图工具输出 28/28，本节抽查四张 Chat：默认态在 1440/900/390/320 均为单一消息区，无页面横向溢出或输入栏/底部导航重叠。
- 一次性长回答与超长引用 QA：四档均 `overflow=0`，引用保持在消息气泡内，移动输入栏位于底部导航上方，长内容只令 message flow 内部滚动。临时脚本已删除。

## P3.6 Mine

**状态：** 页面级施工、自动验证和四视口检查完成，已随 P3 整批人工验收通过。

### 实现与契约

- 页面只保留真实用户摘要、头像上传和退出；删除无路由/能力支撑的“我的帖子”视觉死入口，未新增 profile、帖子列表或其他个人中心能力。
- Drawer trigger 是可聚焦 button，内部复用 P1 Avatar；头像 URL 变化仍以 key 重挂载 AvatarImage。上传仍严格保持“选图后先关闭 Drawer，再显示 Loading，成功后 setAvatar”的既有时序。
- 退出仍直接调用 `useUserStore.logout()`；错误反馈仍为既有 console 路径，统一 toast 留 P4。

### 验证

- 迁移前/后 `auth-guard.spec.ts`：11/11 passed；Mine 定向 lint 0/0；页面级 build 通过（2166 modules）。
- `p3-mine` 截图工具输出 28/28，本节抽查四张 Mine：1440/900/390/320 无横向溢出；长用户名在 320 宽自然断行，按钮、Avatar 和底部导航无重叠。
- 一次性上传时序 QA：延迟 mock 响应时确认 Drawer 已先关闭且 Loading 可见；释放响应后 Loading 消失、头像 URL 写入 persist store；窄屏 overflow 为 0。临时脚本已删除。

## P3.7 Login

**状态：** 页面级施工、自动验证和四视口检查完成，已随 P3 整批人工验收通过。

### 实现与契约

- Login 保持独立布局且不渲染 App Shell；`min-[861px]` 使用品牌/表单双栏，860px 及以下隐藏品牌栏并使用单列表单。
- 登录/注册 segmented control、登录 store action、注册 API、成功后自动登录、自动登录失败回登录态、确认密码前端拦截及密码强度评分算法保持不变。
- 后端 string/string[] message 只在页面显示层规范为字符串；密码强度改用既有语义 token，不使用直接 yellow/green 色阶。未增加第三方登录或找回密码。
- 密码 suffix Button 的定位由静态外层承担，避免 P1 Button hover 位移让 Input 拦截点击；原 `pw-toggle` testid 与键盘行为保持。

### 验证

- 迁移前/后 `auth.spec.ts`：7/7 passed；Login 定向 lint 0/0；页面级 build 通过（2166 modules）。首轮第 7 条挂起经逐步诊断定位为 hover 后命中点落回 Input，修复后原断言完整通过，未修改测试。
- `p3-login` 截图工具输出 28/28，本节抽查四张 Login：1440/900 双栏，390/320 单栏，无 App Shell、横向溢出或短屏内容裁切。
- 一次性断点/状态 QA：900、862、861 为 dual；860、390、320 为 single；各档 overflow=0。注册长数组错误可见，密码按钮聚焦后 Enter 可切换 type，短高屏按需页面滚动。临时脚本已删除。

## P3 整批门禁

**状态：** 用户已确认 P3 七页整批人工验收通过，允许进入 P4 施工方案阶段。
- 首轮整批人工评审仅阻塞 Search 去重标记生命周期；该项最小修复并完成定向/全量复验后，用户于 2026-07-15 确认通过。

- P3 所有新增/修改 TS/TSX 定向 lint：0 errors / 0 warnings。
- 全量 lint：4 errors / 0 warnings；仅为计划登记的 `api/config.ts` 1、`ui/badge.tsx` 1、`utils/index.ts` 2，P3 未增加范围外债务。
- 生产 build：通过，2166 modules transformed。
- Playwright 清单：7 files / 41 tests；最终全量：41 passed。
- 终态截图：`docs/qa/phase4/screenshots/p3/` 28/28；逐页抽查 1440/900/390/320，未发现页面级横向溢出、双滚动、不可达控件、底部导航冲突或 Login 误套 App Shell。
- 静态残留扫描：直接色阶、HEX、页面私有大圆角/柔阴影、inline style 和 class 业务选中态清零；仅保留 P1 token `gradient-cv-*` 图片 fallback，以及 PostDetail 唯一 `window.confirm` 明确进入 P4 AlertDialog。
- P4 接缝：Search error、PostDetail `post-body`、Compose `markdown-editor`、Chat error、Mine 上传动作均已稳定；未提前实现 PageState、MarkdownRenderer、toast 或 Dialog。
