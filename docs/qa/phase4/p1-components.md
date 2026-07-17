# 第四期 P1 token、Inter 与基础组件验收记录

日期：2026-07-15  
状态：人工门禁问题已修正并完成复验，等待用户确认；未进入 P2。

## 1. 范围与实现

- 字体：前端依赖由 `@fontsource-variable/geist` 替换为本地 `@fontsource-variable/inter@5.2.8`，无 CDN。
- token：`frontend/black_box/src/App.css` 的 `:root` 保存 foundation/system.css 数值，`@theme inline` 只暴露 Tailwind 语义别名；保留 dark variant，删除旧 `.dark` 值块且不提供入口。
- 改造：Button、Input、Textarea、Avatar、Card、Carousel。
- 新增：Select、Pill、TagChip、StatButton、CountBadge、内容类型唯一映射，以及 `button-variants.ts`、`carousel-context.ts` 两个 Fast Refresh 边界模块。
- 隔离：gallery 由 `src/dev/phase4-component-gallery.tsx` 直接挂载到被忽略的 `.tmp/phase4-components.html`；产品 Router、`index.html` 和生产入口均无引用。
- 未修改：页面、路由、store、API、JWT、SSE、业务语义、既有 e2e 与原型。

## 2. 自动门禁

| 检查 | 结果 | 证据摘要 |
|---|---|---|
| `pnpm build` | 通过 | TypeScript build 与 Vite production build 完成，2081 modules transformed；Inter 字体进入产物 |
| P1 TS/TSX 定向 lint | 通过 | 0 errors / 0 warnings |
| `pnpm lint` | 符合差分门禁 | 14 errors / 3 warnings，较施工基线 16/3 减少 button/carousel 两个既有错误 |
| `pnpm exec playwright test --list` | 通过 | 7 个 spec、41 tests |
| `pnpm e2e` | 通过 | 41 passed，5.4s |
| 旧字体/暗色值扫描 | 通过 | P1 源码、package/lock 无 Geist；`App.css` 无旧 `.dark {}` 值块 |
| gallery 生产隔离扫描 | 通过 | Router、App、main、生产 `index.html` 无 gallery 引用 |
| P1 inline style 扫描 | 通过 | P1 基础组件无 `style={{...}}` |

全量 lint 剩余命中严格来自已登记范围外文件：

- `e2e/compose.spec.ts`、`e2e/social.spec.ts`
- `src/api/config.ts`
- `src/components/ui/badge.tsx`
- `src/pages/Compose.tsx`、`Login.tsx`、`Search.tsx`、`post/index.tsx`
- `src/utils/index.ts`

这些债务未在 P1 顺手修改，后续另立工程清理任务。

## 3. Gallery 四视口检查

截图为本地 QA 产物，位于被忽略的 `frontend/black_box/.tmp/phase4-gallery/`，不作为产品路由或行为 e2e。

| 视口 | 结果 | 人工检查 |
|---|---|---|
| 1440×1000 | 通过 | variant/size/state 清晰；硬阴影、墨边、字体和间距稳定 |
| 900×1000 | 通过 | 组件矩阵自然换行，无裁切或横向溢出 |
| 390×844 | 通过 | 表单、长选项、chip、卡片和 44px 控件可用；Carousel slide/viewport 均为 354px，标题中心偏差 0 |
| 320×740 | 通过 | Carousel slide/viewport 均为 284px，标题中心偏差 0；按钮下置且不遮挡标题 |

人工门禁曾指出，仅检查 `body.scrollWidth <= viewport` 会漏掉 Carousel 内部裁切：旧 gallery 的移动 slide 因 `aspect-[16/7] + min-h-52` 宽约 475.42px，而 390/320 viewport 仅 354/284px。修正后移动端使用 `h-52`，`sm` 起才恢复宽高比；自动门禁现同时断言 slide 完整落入 viewport 且标题中心偏差不超过 1px。四档字体均为 `Inter Variable`、7 个 gallery section 均存在、Console/Page Error 均为空。

## 4. 键盘与状态检查

- TagChip：Enter 可切换 `data-state=active`。
- Select：Enter 打开、方向键选择、Escape 关闭并归还焦点。
- Carousel：上一张/下一张可用，方向键与 Embla API 保留；移动端按钮保持 44px 命中区。
- Button/Input/Textarea：disabled、busy、invalid、focus-visible 均由组件契约表达。
- reduced-motion：全局规则和 Carousel 局部规则均存在，不移除必要状态变化。

## 5. 门禁结论

P1.1～P1.5 技术完成条件已满足：token 单一来源、Inter 本地加载、11 个基础组件契约可编译、gallery 四视口及键盘检查通过、41 条行为测试无回归。人工门禁指出的移动 slide 裁切已按真实几何数据修正并复验；当前等待用户确认 P1，确认前不得进入 P2。
