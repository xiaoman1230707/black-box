# 第四期 P2：App Shell 与跨页复用组件施工方案

## 目标

按已确认方案实施 P2.1～P2.5，完成自动验证和四视口截图检查后停在 P2 人工确认门禁，不进入 P3。

## 阶段

- [completed] 1. 恢复上下文并同步 P1 人工确认状态
- [completed] 2. 核对 P2 权威设计、foundation 与实施主计划
- [completed] 3. 核对 App Shell、共享组件、调用方与现有测试事实
- [completed] 4. 形成真实文件矩阵、P2.1～P2.5 顺序和验证门禁
- [completed] 5. 自审范围与差异，提交 P2 施工方案等待确认
- [completed] 6. 同步 foundation 事实并实施 P2.1 App Shell
- [completed] 7. 实施 P2.2 SearchBar 与 Topbar
- [completed] 8. 实施 P2.3 PostItem
- [completed] 9. 实施 P2.4 SildeShow 与 BackToTop
- [completed] 10. 实施 P2.5 辅助状态组件并完成自动验证、截图与 QA 回填
- [completed] 11. 修正人工评审指出的 Topbar 表面、44px 命中区与 PostCard 键盘语义，并完成全量复验

## 当前门禁

- P2 人工评审四项契约缺口已修正并完成技术复验；用户已于 2026-07-15 人工复验通过，允许进入 P3 施工方案阶段。
- 未进入 P3，未新增 e2e，未提交 Git。

## 范围红线

- 只规划 MainLayout、Sidebar、Topbar/SearchBar、PostItem、SildeShow/Carousel/BackToTop、ErrorBoundary/Loading/InfiniteScroll。
- 不迁移七个页面，不改路由、store、API、JWT、SSE、筛选或滚动恢复语义，不进入 P3。
- 不修改既有 e2e、不新增 e2e、不改原型、不提交 Git。
- 延续 P1 差分 lint 门禁，范围外债务不在 P2 清理。

## 错误记录

| 时间 | 问题 | 处理 |
|---|---|---|
| 2026-07-15 | PowerShell 双引号中的 `['\"]` rg pattern 被解析器截断 | 改用单引号 pattern 后完成只读调用关系扫描，无文件改动 |
| 2026-07-15 | Windows 路径对 `node_modules/.pnpm/embla-carousel-autoplay*` 通配报文件名语法错误 | 先用 `Get-ChildItem -Filter` 取真实目录，再对确定路径读取类型声明 |
| 2026-07-15 | 沙箱内 Vite 读取本地 Inter 报 `EPERM`，Playwright 自动 webServer 的 `::1:5173` 遗留进程使沙箱外复跑仍命中 overlay | 核对监听 PID 与命令行只属于当前 workspace 后终止遗留进程；沙箱外显式启动 `localhost` Vite 并复用，build 与 41 条回归取得有效结果；未改配置/依赖 |
| 2026-07-15 | reduced-motion effect 在 Embla 初始化前调用 Autoplay `play()`，首页进入 ErrorBoundary | 用一次性 pageerror 诊断取得 `internalEngine` 栈；改为仅在 `api.plugins().autoplay` 可用后同步，守卫 11/11、全量 41/41 复验通过 |
| 2026-07-15 | BackToTop 一次性核验最初等待超时 | 诊断 mock 仅一帖且最后一次导航后未等异步列表，页面无滚动高度；改为等待第 8 张 PostItem 后滚动，产品代码不改，回顶实测 `scrollY=0` |
