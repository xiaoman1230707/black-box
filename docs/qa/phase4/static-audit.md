# 第四期 P0 静态残留台账

> 采集日期：2026-07-14  
> 扫描边界：视觉项扫描 `frontend/black_box/src/`；URL 项同时扫描 `backend/backend/posts/src/`。P0 只记录，不修改命中源。

## 1. 汇总

| 分类 | 当前命中 | 主要文件 | 目标批次 | P6 口径 |
|---|---:|---|---|---|
| Geist | 2 / 1 文件 | `App.css` | P1 | Geist 包引用和 `Geist Variable` 为 0；正式加载 Inter |
| dark 机制/旧值块 | 2 / 1 文件 | `App.css` | P1 | `@custom-variant dark` 允许保留 1 处；旧 `.dark { ... }` token 值块为 0；无暗色入口 |
| 直接 Tailwind 色阶 | 24 / 5 文件 | Header、Home、Login、Mine、PostDetail | P1～P3 | 页面/共享组件直接色阶为 0，改用语义 token |
| HEX/oklch | 67 / 4 文件 | App.css 62、ErrorBoundary 3、react.svg 1、Loading CSS 1 | P1/P2 | 视觉值只允许在 `App.css` token/cover 定义；业务组件、模块 CSS和旧资产不再散落 |
| 柔阴影 | 4 / 3 文件 | Home 2、Mine 1、BackToTop 1 | P1～P3 | `shadow-sm/md/lg/xl/2xl` 等柔阴影为 0；只消费硬阴影 token |
| 大圆角 | 8 / 6 文件 | PostItem、SlideShow、Card、Home、Mine、PostDetail | P1～P3 | `rounded-xl/2xl/3xl` 为 0；Card 最大 8px，`rounded-full` 仅 pill/avatar 等允许对象 |
| 页面渐变类 | 6 / 3 文件 | Home、SlideShow、PostDetail | P1～P3 | 业务组件渐变类为 0；cover gradient 只能由 `App.css` token 提供 |
| inline style | 4 / 2 文件 | ErrorBoundary 3、PostItem 图片 fallback 1 | P2 | JSX style 和 `.style.*` 业务写法为 0，统一组件/token 或语义 class |
| `window.confirm/alert` | 1 / 1 文件 | PostDetail `window.confirm`；alert 为 0 | P4 | 两者均为 0；评论删除使用统一 AlertDialog |
| localhost | 14 / 7 文件 | 前端 api/chat；后端 posts/auth/comments/ai/upload | P5 | 业务 `src` 为 0；只允许 `.env.example` 和运维文档中的开发示例 |
| class 状态三元 | 5 / 2 文件 | Compose 2、PostDetail liked 3 | P1/P3 | 选中/激活/点赞视觉由 `data-state` selector 驱动；交互伪类 `active:` 不属于业务状态残留 |
| 页面私有重复组合 | 4 组 | 搜索栏、筛选 chip、统计按钮、卡片表面 | P1～P3 | 页面仅组合 SearchBar/TagChip/StatButton/Card 等统一契约，不形成第二套样式 |

## 2. 可复跑命令

以下命令均从仓库根运行；统计使用 `rg -n -o` 的输出行数，文件数使用同正则的 `rg -l`。

```powershell
# Geist
rg -n -o '@fontsource-variable/geist|Geist Variable' frontend/black_box/src

# dark 机制与旧值块（P6 分别核对允许项和零残留项）
rg -n -o '@custom-variant\s+dark|(?m)^\s*\.dark\s*\{' frontend/black_box/src

# 直接色阶
rg -n -o '(?:bg|text|border|shadow|from|via|to)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(?:/[0-9]{1,3})?' frontend/black_box/src

# HEX / oklch
rg -n -o '#[0-9A-Fa-f]{3,8}\b|oklch\(' frontend/black_box/src

# 柔阴影、大圆角、渐变
rg -n -o '(?:^|["'' ])shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?:[ "''])|shadow-[a-z]+-[0-9]{2,3}' frontend/black_box/src
rg -n -o 'rounded-(?:xl|2xl|3xl)' frontend/black_box/src
rg -n -o '(?:bg-gradient-to-|from-(?:black|white|gray|orange|primary)|via-(?:black|white|gray|orange|primary)|to-(?:black|white|gray|orange|primary))' frontend/black_box/src

# inline style 与浏览器原生反馈
rg -n 'style\s*=\s*\{\{|\.style\.[A-Za-z]+' frontend/black_box/src
rg -n 'window\.(confirm|alert)\s*\(' frontend/black_box/src

# localhost
rg -n -o 'localhost(?::[0-9]+)?' frontend/black_box/src backend/backend/posts/src

# class 状态三元；data-state 作为迁移目标另行保留
rg -n -o '(?:active|liked)\s*\?' frontend/black_box/src
rg -n 'data-state' frontend/black_box/src
```

## 3. 当前命中明细

### 3.1 Geist 与 dark

- Geist：`App.css` 2 处（包导入、font-family）。
- dark：`App.css` 2 处（`@custom-variant dark`、旧 `.dark` 值块）。P1 只清旧值块，机制保留但不提供入口。

### 3.2 直接色阶

- `components/Header.tsx`：3。
- `pages/Home.tsx`：8。
- `pages/Login.tsx`：2。
- `pages/Mine.tsx`：5。
- `pages/post/index.tsx`：6。

### 3.3 HEX/oklch

- `App.css`：62，主要为现有 light/dark oklch 变量。
- `components/ErrorBoundary.tsx`：3 个 inline HEX。
- `components/Loading/loading.module.css`：1。
- `assets/react.svg`：1 个旧资产颜色；P1 核对无引用后再决定清理，P0 不删除。

### 3.4 阴影、圆角和渐变

- 柔阴影：Home 2、Mine 1、BackToTop 1。
- `rounded-xl/2xl/3xl`：PostItem 2、SlideShow 1、Card 1、Home 1、Mine 1、PostDetail 2。
- 渐变类：Home 2、SlideShow 2、PostDetail 2。

### 3.5 inline style、反馈和状态

- `ErrorBoundary.tsx` 有 3 个 JSX `style={{...}}`。
- `PostItem.tsx` 的图片 `onError` 有 1 个 `element.style.display`。
- PostDetail 有 1 个 `window.confirm`；`window.alert` 为 0。
- Compose 的 active class 三元 2 处，PostDetail 的 liked class 三元 3 处；Home/Sidebar/Login 已有部分 `data-state`，后续迁移不得倒退。

### 3.6 localhost

- 前端：`api/config.ts` 4（含注释中的旧候选）、`hooks/useChatBot.ts` 1。
- 后端：`posts.service.ts` 4、`ai.service.ts` 2、`auth.service.ts` 1、`comments.service.ts` 1、`upload.service.ts` 1。
- 合计 14；P5 按 runtime/public URL helper 收口，不在 P0 修改。

## 4. 页面私有重复组件

| 重复组合 | 当前位置 | 目标契约/批次 |
|---|---|---|
| 搜索输入 | Topbar、Home、Search | P2 `SearchBar`，P3 页面接线 |
| tag/game chip | Home；Compose 内容类型按钮 | P1 `TagChip`，P3 接线 |
| 点赞/评论/浏览统计按钮 | PostDetail 私有 button | P1 `StatButton`/`CountBadge`，P3 接线 |
| 卡片/面板表面 | PostItem、Mine、Search、Login 私有组合 | P1 Card variant，P2/P3 统一组合 |

P6 复跑本台账命令时必须逐条对比允许项，而不是只看总命中数；任何新增命中必须回到责任批次处理。

