# 第四期 P2 App Shell 与共享组件 QA

> 日期：2026-07-15  
> 状态：人工评审四项缺口已修正并复验，等待用户确认  
> 截图：`docs/qa/phase4/screenshots/p2/`

## 覆盖范围

- App Shell：`MainLayout.tsx`、`Sidebar.tsx`、`Topbar.tsx`、`App.css` 布局 token。
- 共享组合：新增 `SearchBar.tsx`，迁移 `PostItem.tsx`、`SildeShow.tsx`、`BackToTop.tsx`。
- 辅助状态：迁移 `ErrorBoundary.tsx`、`Loading/index.tsx`、`InfiniteScroll.tsx`；删除唯一引用已移除的 `Loading/loading.module.css`。
- 未修改 router、pages、store、API、P1 primitives、既有 e2e、原型、package/lock。

## 自动门禁

| 门禁 | 结果 |
|---|---|
| 生产 build | 通过；Vite 8.0.1，2085 modules transformed |
| P2 TS/TSX 定向 lint | 0 errors / 0 warnings |
| 全量 lint | 14 errors / 3 warnings；全部仍来自批准的范围外文件 |
| Playwright 列表 | 7 个 spec / 41 tests |
| Playwright 全量 | 41 passed |
| P2 截图 | 7 页 × 4 视口 = 28/28 |

一次性交互核验（脚本运行后已删除，不进入 `e2e/`）还确认：1440/900/390/320 的 Sidebar 实测分别为 248×1000、80×1000、390×72、320×72，且均为 4 个导航项；Topbar 输入 `黑神话 &?#%` 后 URL 只编码一次；轮播第 2 个 dot 可切为 active；PostItem 整卡进入 `/post/1`；可滚动列表中 BackToTop 点击后 `scrollY=0`。

人工评审修正后的浏览器级复验（一次性脚本已删除）确认：Topbar 计算样式为 `background alpha=0.9`、`backdrop-filter: blur(12px)`；320px 视口下 SearchBar 清除按钮与三个 SildeShow dot 的实际按钮框均为 44×44px，视觉 dot 仍保持 10px/激活 28px；PostItem 外层 article 可聚焦、`role=link`、`tabIndex=0`，按 Enter 后进入 `/post/1`。首次量测发现 dot 在 flex 中被压缩至约 41.3px，最终通过 `shrink-0` 修正并复测，不以 class 名义尺寸代替实测。

环境说明：沙箱内 Vite 读取本地 `@fontsource-variable/inter` 时出现 Windows `EPERM`；生产 build 与 Playwright 均在沙箱外验证。Playwright 自动 webServer 遗留的 `::1:5173` 进程曾使后续运行复用错误 overlay，核对命令行并停止该 workspace 进程后，改为显式启动 `http://localhost:5173` 再运行回归。此问题没有通过修改依赖、配置或测试规避。

## 四视口人工抽查

| 视口 | 结论 |
|---|---|
| 1440×1000 | Sidebar 展开为 248px；品牌、导航文字和用户区完整。Topbar 与内容 gutter 对齐，轮播、PostItem 无横向溢出。 |
| 900×1000 | Sidebar 为 80px 图标栏，文字/meta 隐藏并保留 title；内容未被 rail 挤压。 |
| 390×844 | Sidebar 为四项均分的 72px 底 tab；Topbar 输入和提交按钮稳定，PostItem 单列，回顶避让底栏。 |
| 320×740 | 无 body 横向溢出；搜索框、轮播箭头/dot、单列 PostItem 均落在 viewport 内，四项底 tab 保持完整。 |

首轮移动截图中，SildeShow 标题与底部 arrows/dot 共占控制区；已把移动标题移到顶部，`sm` 起仍使用底部标题，复验 390/320 不再互相遮挡。轮播 reduced-motion 截图同时暴露 Autoplay 在 Embla 初始化前调用 `play()` 的崩溃，已改为仅在 `api.plugins().autoplay` 可用后同步并由既有守卫用例验证。

人工评审修正后重建 28 张截图：移动端 dot 使用 44px 透明命中容器包裹小圆点，标题、箭头和圆点无新增遮挡；桌面标题区增加底部预留，900/1440 下文字与 controls 分离。Topbar 的半透明效果需结合页面滚动观察，计算样式已由浏览器量测确认。

## 静态残留检查

- P2 TS/TSX 无 inline style、直接色阶、额外 HEX、柔阴影、大圆角或字面量渐变。
- 图片 fallback 仅引用 P1 `--gradient-cv-*` token；业务 active 使用 `data-state`。
- 扫描命中的 `active:` 仅为按压伪类，不是业务状态 class。
- `loading.module.css` 无残留引用；`Header.tsx` 因 Chat 仍在使用而保留。

## P3 观察项

- `PostDetail` 当前页面级评论输入栏使用 `fixed bottom-0 z-50`，在移动截图中位于 App Shell 底 tab 之上。该层级来自未迁移页面，P2 不越界修改；P3 PostDetail 迁移时必须协调评论输入与 72px + safe-area 底 tab。
- Topbar 已正确生成 `/search?q=`，Search 消费 `q` 仍按既定边界在 P3 完成。

## 人工门禁

- [ ] 用户确认 248/80/72 三态和四个导航目的地。
- [ ] 用户确认 Topbar/SearchBar、PostItem、SildeShow、BackToTop 的四视口视觉。
- [ ] 用户确认 P2 可结束并进入 P3 方案阶段。
