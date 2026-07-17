# 第四期 P1 调研结论

## 已确认事实

- `App.css` 当前加载 `@fontsource-variable/geist`，保留 `@custom-variant dark`，同时存在完整旧 `.dark` oklch 值块。
- package/lock 当前锁定 `@fontsource-variable/geist@5.2.8`；本地尚无 Inter 包。本轮未安装依赖、未修改 package/lock。
- 现有 Button/Input/Avatar 基于 `@base-ui/react`，Select 可直接复用已安装的 `@base-ui/react/select` Root/Trigger/Value/Portal/Positioner/Popup/Item 等 parts，无需新 primitive。
- Button 真实组合接口是 Base UI 的 `render` prop，不是 Radix `asChild`；P1 应保持真实导出和 primitive 行为。
- 当前调用仍使用 Button `default` 默认值以及 `sm/icon/icon-sm` 等尺寸；Carousel 内部显式使用 `icon-sm`。P1 新契约必须保留兼容 alias，不能要求页面在 P1 同步迁移。
- Avatar 当前 `default/sm/lg`，且多处页面用 className 覆盖尺寸；P1 提供 `sm/md/lg` 后应保留 `default` alias，页面尺寸清理由 P2/P3 完成。
- Card 当前保留所有 slot 导出及 `size=default|sm`。04 设计指定新 `padding=none|sm|default`，实施计划 P1.3 写成 `sm|default|lg`，二者冲突；施工方案按权威优先级采用 04 的 `none|sm|default`，并保留旧 `size` 兼容。
- `src/dev/` 与 `.tmp/` 当前均不存在；仓库根 `.gitignore` 已忽略 `.tmp`。gallery 可用 Vite HTML 多入口方式加载，不注册 Router、不改生产 `index.html`。
- P1.1 后全量 `pnpm lint` 实测为 16 errors / 3 warnings。既存错误位于 `e2e/compose.spec.ts`、`e2e/social.spec.ts`、`src/api/config.ts`、`ui/badge.tsx`、既有 `ui/button.tsx`/`carousel.tsx`、Compose/Login/Search/PostDetail 和 utils；大多数不属于 P1 文件矩阵。要让全量 lint 归零必须扩大范围，或把 P1 门禁改为“P1 文件无新增 lint + 既存清单不增加”。
- 用户拍板采用差分门禁：P1 TS/TSX 0/0；button/carousel 两个 P1 内既存错误必须清除；全量结果不得高于 14 errors / 3 warnings，剩余文件必须严格等于登记清单。范围外 lint 债务不在视觉迁移中处理。

## 施工决策

- token 数值只在 `App.css` 的 `:root` 定义，`@theme inline` 仅暴露 Tailwind 语义别名，避免双份数值源。
- 内容类型映射集中在 `src/lib/content-type.ts`；未知值固定返回 `soft`。
- P1 改造基础组件只改变组件契约和视觉基底，不接线页面业务；新增组件只在 gallery 使用，P2/P3 再进入产品页面。
- reduced-motion 由全局 CSS 降低非必要位移/长动画；Carousel 继续保留手动键盘与 Embla API。
- P1 最终验证：生产 build 通过；P1 TS/TSX 定向 lint 0/0；全量 lint 14 errors/3 warnings且只来自登记白名单；既有 41 条 Playwright 全通过。
- Gallery 四档均无横向溢出。320px 实测发现横向 Carousel 标题与 44px Next 控件几何重叠，最终采用移动端控制按钮下置、`sm` 起恢复侧边居中的响应式契约，复验无重叠且不缩小命中区。
- 人工门禁进一步确认：上一轮只分离了按钮和标题，未解决 slide 自身宽约 475px、viewport 宽约 284px 的裁切。根因是 gallery 示例把 `aspect-[16/7]` 与 `min-h-52` 同时用于窄屏；正确门禁必须比较 slide 内容与 Carousel viewport 的边界和中心，而不能只看 body 横向溢出。

## 文件矩阵

| 动作 | 文件 | 职责 |
|---|---|---|
| 修改 | `frontend/black_box/package.json`、`pnpm-lock.yaml` | 仅把 Geist 依赖替换为本地 Inter；不新增其他 primitive |
| 修改 | `frontend/black_box/src/App.css` | `:root` 保存视觉数值，`@theme inline` 暴露 Tailwind 语义 token；保留 dark variant、删除旧 dark 值 |
| 修改 | `src/components/ui/button.tsx`、`input.tsx`、`textarea.tsx` | 统一命令/表单的 Neo 视觉、focus/invalid/disabled/busy；保留真实原生/Base UI props |
| 修改 | `src/components/ui/avatar.tsx`、`card.tsx`、`carousel.tsx` | 尺寸/cover、panel/tile、Embla 控制与 reduced-motion；保留现有 slot/API |
| 新建 | `src/components/ui/select.tsx` | 封装现有 `@base-ui/react/select` parts，不增加依赖 |
| 新建 | `src/components/ui/pill.tsx`、`tag-chip.tsx`、`stat-button.tsx`、`count-badge.tsx` | 展示、筛选、统计和计数的唯一基础契约 |
| 新建 | `src/lib/content-type.ts` | 固定内容类型和 variant 类型、中文名映射、未知值回退 `soft` |
| 新建 | `src/dev/phase4-component-gallery.tsx` | 只在 Vite dev 直接入口展示组件矩阵，不进入产品路由 |
| 本地生成、不提交 | `frontend/black_box/.tmp/phase4-components.html` | dev gallery HTML 入口；根 `.gitignore` 已忽略 `.tmp` |
| 新建 | `docs/qa/phase4/p1-components.md` | 四视口、键盘、状态、静态扫描和 41 条回归证据 |
| 完成时修改 | `docs/design/04-phase4-visual-polish.md`、`docs/plans/04-phase4-implementation-plan.md`、`.planning/phase4-p1/` | 回填真实 token/props/alias、验证结果和 checkbox；不改设计范围 |

## 实施检查点

1. P1.1：替换字体依赖；将 system.css/foundation 数值集中到 App.css token；保留 dark variant、清除旧 dark 值；加入 reduced-motion 规则。验证 build/lint 与 Geist/dark 静态扫描。
2. P1.2：改 Button/Input/Textarea，新建 Base UI Select。先在 gallery 覆盖 variant/size/focus/invalid/disabled/busy，再验证 Tab/Enter/Arrow/Esc 和 320px 长选项。
3. P1.3：新增内容类型映射、Pill/CountBadge，改 Avatar/Card。验证未知类型、空头像、8 个 cv、计数边界、长文案和旧导出兼容。
4. P1.4：新增 TagChip/StatButton。选中/点赞用 `data-state`，busy 阻止重复提交，view 默认非交互；验证键盘和 44px 移动命中区。
5. P1.5：改 Carousel 底层控制/focus/reduced-motion；完成 gallery 四视口人工检查；运行 build、lint、测试列表与既有 41 条 e2e，并回填 QA/设计/计划。

## 依赖差异与回滚

- `package.json` 预期只有 `@fontsource-variable/geist:^5.2.8` 删除、`@fontsource-variable/inter:^5.2.8` 增加；lock importer、package resolution 和 snapshot 对应一删一增，不引入 CDN 或第二套 UI primitive。
- 回滚按三组：字体+App.css；表单/展示 primitives；交互 primitives+gallery。任何回滚只触碰 P1 文件，不覆盖前三期脏改动。
- 全局 token 和基础组件会被现有页面立即消费，最大风险是视觉变化导致文本溢出或点击尺寸变化；每个检查点均先 build/lint，最终以 41 条行为回归和四视口 gallery 截断问题兜底。

## 建议提交拆分

1. `feat(ui): establish phase four tokens and Inter`
2. `feat(ui): add phase four component primitives`
3. `docs(qa): record phase four P1 component baseline`

仅在用户要求提交时执行；默认不提交 Git。每次只暂存对应 P1 文件，不混入前三期未提交改动。

## 待用户确认

- 用户已确认整体 P1 施工方案。
- Card 以 04 设计的 `padding=none|sm|default` 为最终契约，实施计划中的 `lg` 已按文字勘误修正。
- Button 保留 Base UI `render` 而不新增不存在的 `asChild`；旧 `default/xs/icon-xs/icon-sm/icon-lg` 作为兼容 alias 保留至页面迁移完成，其中 `default` 固定映射为 `outline`。
