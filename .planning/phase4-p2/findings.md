# 第四期 P2 调研结论

## 已拍板事实

- P1 已于 2026-07-15 人工确认通过，P2 只能先提交方案，未经确认不得实施。
- App Shell 必须保留桌面 248px、窄桌面 80px、移动 72px 底 tab 三态及四个导航目的地。
- Topbar 只生成 `/search?q=`；Search 消费 q 属 P3。
- PostItem 是唯一 PostCard，不改业务 props、testid、跳转和交互语义。

## 待核对

- 已完成，无未核对项。

## 真实代码差异

- foundation 历史段落写“新建 Sidebar + 改造 BottomNav”，但 04 和真实代码已订正：`Sidebar.tsx` 是统一三态组件，`BottomNav.tsx` 已删除。P2 只改现有 Sidebar，不新增第二套移动导航。
- MainLayout/Sidebar 当前用 fixed + padding；foundation 指定 grid + sticky。P2 保持 `Sidebar + main(Topbar + Outlet)` DOM 顺序和职责，恢复文档已有 grid/sticky 布局，不动路由。
- 当前 `lg` 从 1024px 起展开，和“1024px 仍为 80px rail”差 1px；P2 使用 1025/760 精确边界。
- 当前移动 Sidebar/MainLayout 为 64px (`h-16/pb-16`)，目标是 72px + safe-area。
- `App.css` 已有 container max/gutter，但 foundation 定义的 `--sidebar-w`、`--bottombar-h` 尚未落地；P2 在 token 单一来源内补齐，不另建常量体系。
- Topbar 已正确 trim、encode 并写 `/search?q=`；P2 只抽 SearchBar，Search 消费 q 仍留 P3。
- PostItem 仍使用 Badge、直接统计 markup、柔阴影/大圆角及 `event.target.style.display`；P2 改为 P1 Card/Pill/Avatar/StatButton，并用 React state 处理失败图。当前 PostItem 无点赞 handler，P2 不新增。
- SildeShow 保留正确拼写约束、Embla 和 Autoplay 8.6.0，但当前没有 arrows、dot 无 scrollTo、无图片失败态和 reduced-motion autoplay 控制；已确认该版本支持 `playOnInit/play/stop/reset`。
- Loading CSS module 仅由 Loading/index 引用，可在迁移后经 grep 删除；Loading 仍同时供 Router Suspense 和 Mine 使用。
- ErrorBoundary 只在 main.tsx 挂一次；`body translate="no"` 在现有入口防护，P2 不改挂载与 reload 语义。
- Header 仍被 Chat 使用，P2 不得删除。
- P2 现有目标 TS/TSX 定向 lint 基线为 0/0；全量门禁延续 14 errors/3 warnings。
- P2 实施实测：Autoplay 插件对象虽已创建，但 `play()` 只能在 Embla 初始化后调用；reduced-motion 同步必须从 `api.plugins().autoplay` 取得已初始化实例，不能在父组件首次 effect 中直接调 ref。
- P2 四视口实测：移动轮播标题需与底部 arrows/dot 分区，最终采用移动标题上置、`sm` 起标题下置。PostDetail 旧固定评论栏覆盖底 tab 是 P3 页面层级观察项，不在 P2 修改页面。

## 文件矩阵

- Create：`components/SearchBar.tsx`、`docs/qa/phase4/p2-shell-components.md`。
- Modify：`App.css`、`layouts/MainLayout.tsx`、Sidebar/Topbar/PostItem/SildeShow/BackToTop/ErrorBoundary/Loading/index/InfiniteScroll。
- Delete：`Loading/loading.module.css`，仅在 index import 移除且全仓无引用后。
- Read-only：P1 UI primitives、router、pages、store、API、Header、e2e、prototype。
