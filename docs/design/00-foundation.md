# 前端基础详细设计(Foundation)

> 版本:v1 · 日期:2026-06-17 · 状态:待评审
> 适用范围:全四期共用的前端底座 —— 设计 token、全局组件契约、App Shell 与路由骨架、全局交互约定。

---

## 一、文档定位

本文件是**详细设计阶段的底座(foundation)**,定义"全四期共用的词汇与契约":设计 token、跨页面复用的全局组件、App Shell 与路由骨架、全局交互/反馈约定与复用规范。它**先于一期开发写透**,是后续各期功能设计文档的单一事实来源。

**与上游文档的关系:**
- 上承 `01-分期概要设计.md`(总纲):本文件把概要第十一章 UI/UX 的基线值与决议 A–K **落定为确切值与契约**;概要给"做什么、定什么调",本文件给"叫什么名、是什么值、对外契约长什么样"。
- 概要基线值与原型 `docs/prototype/css/system.css` 实际定义冲突时,**以 system.css 为准**(已在调研中逐项核对)。

**与下游文档的关系:**
- 后续 `0X-phaseN-*.md`(各期功能设计)**只引用、不重定义**本文件的 token 与全局组件;页面、页面级组件(评论项/聊天气泡/发帖编辑器…)、各期接口属于功能设计文档,**不写入本文件**(清单见第八章)。
- 引用方式:功能设计中提到颜色/间距/阴影/组件时,直接写本文件的 token 名(如 `--color-primary`、`--shadow-md`)或全局组件名(如 `Pill`、`PostCard`),不复制数值、不另起命名。

**本文件的边界(明确不做):**
- 不写任何**单期专属内容**(页面、页面级组件、各期接口)。
- 不贴完整组件源码 —— 本文件定**契约与结构**(props/variant/state/扩展点),实现细节留落地。
- token **命名现在定死**,但**实际接入 Tailwind v4 `@theme` 是四期的事**(见第二章说明)。一期骨架即用最终命名,不出现临时名后期改名。

---

## 二、设计 token(确切值)

### 2.0 命名策略与落地节奏

**策略:shadcn 语义骨架 + 原型独有补充。**
- 现有工程已是一套完整的 shadcn(base-nova)+ `@base-ui/react` + cva 体系,`src/App.css` 的 `@theme` 已定义 `--color-*`(oklch)/`--radius-*`/`--font-*`,且现有 ui 组件(`button.tsx` 等)的 cva 直接引用这些语义槽位。
- 因此:**基础语义 token 沿用 shadcn 现有命名(槽位不变),仅把"值"覆写为原型 Neo-Brutalism**(2.2);**原型独有、shadcn 无对应槽位的 token 按原型语义新增**(2.3)。原型独有 token **不得硬塞进 shadcn 语义槽位**(避免语义错配)。
- 好处:现有 cva 组件引用的 `--color-primary` 等无需改类名,**改值即换肤**,迁移量最小;同时不丢原型的设计语言。

**落地节奏(定义 vs 接入):**
- 本文件负责把 token 体系**定义清楚、命名定死、给出确切值**。
- **实际写入 `src/App.css` 的 `@theme`/`:root`、替换现有 oklch 值,是四期"视觉落地"的工作**。一期骨架可直接按本文件命名使用(引用尚未变更值的同名槽位不会报错,四期统一替换值时页面自动套上新皮肤)。

**颜色值表示**:下表用原型 system.css 的 HEX 原值书写,便于与原型逐一核对。落地写入 `@theme` 时,可保留 HEX,或按现有工程惯例转为 oklch(等价转换,属四期落地细节,不改语义)。

### 2.1 shadcn 语义槽位 ← 原型值 映射表(逐条,语义不得错配)

> 每个 shadcn 语义 token 的值覆写为原型对应变量。"原型来源"列指向 `system.css` 的变量名与值。

| shadcn 语义 token | ← 原型来源(system.css) | 覆写值 | 用途 |
|---|---|---|---|
| `--color-background` | `--bg` | `#fff8d7` | 页面奶黄暖底 |
| `--color-foreground` | `--fg` | `#1d1836` | 主前景文字/描边墨色 |
| `--color-card` | `--surface` | `#ffffff` | 卡片/面板表面 |
| `--color-card-foreground` | `--fg` | `#1d1836` | 卡面文字 |
| `--color-popover` | `--surface` | `#ffffff` | 浮层表面 |
| `--color-popover-foreground` | `--fg` | `#1d1836` | 浮层文字 |
| `--color-primary` | `--accent` | `#ff6b00` | 主强调橙(按钮主色/选中/链接 hover) |
| `--color-primary-foreground` | `--accent-on` | `#ffffff` | 主强调上的文字 |
| `--color-secondary` | `--surface-warm` | `#ffef9f` | 次按钮/暖底块(见 2.3 注) |
| `--color-secondary-foreground` | `--fg` | `#1d1836` | 次按钮文字 |
| `--color-muted` | `--border-soft` | `#f5eccd` | 弱化底色块 |
| `--color-muted-foreground` | `--muted` | `#796f91` | 弱化/次要文字、占位符 |
| `--color-accent` | `--surface-warm` | `#ffef9f` | hover 暖底(shadcn `accent` 语义=hover 面,非品牌色) |
| `--color-accent-foreground` | `--fg` | `#1d1836` | hover 面上的文字 |
| `--color-destructive` | `--danger` | `#e5484d` | 危险/删除 |
| `--color-border` | `--border` | `#eadfba` | 默认描边(柔)。**注**:Neo-Brutalism 的"粗黑描边"用 `--fg` 墨色,不是此 token,见 2.3 边框约定 |
| `--color-input` | `--fg` | `#1d1836` | 表单控件描边(原型输入框用墨色粗边) |
| `--color-ring` | `--accent`(focus 派生) | `rgba(255,107,0,.26)` | 焦点环颜色,见 `--focus-ring`(2.3) |

> 语义校准说明(防错配):
> - shadcn 的 `--color-accent` 在其体系中是"hover/选中的浅底面",**不是品牌强调色**;故映射到原型 `--surface-warm`(暖底),品牌橙归 `--color-primary`。
> - `--color-secondary` 与 `--color-accent` 都取暖底 `#ffef9f`,符合原型 `.btn-secondary`(暖底)与 hover 面同源;如落地需区分,可在 2.3 留派生位,不在此拆。
> - 状态色 success/warn 在 shadcn 默认无独立槽位 → 归入 2.3 新增。

### 2.2 复用 shadcn 槽位 · 其余覆写(圆角/字体槽位)

| shadcn token | ← 原型来源 | 覆写值 | 用途 |
|---|---|---|---|
| `--radius-sm` | `--radius-sm` | `10px` | 按钮/输入/导航项/小卡圆角 |
| `--radius-md` | `--radius-md` | `16px` | 卡片/面板圆角 |
| `--radius-lg` | `--radius-lg` | `24px` | 轮播/大容器圆角 |
| `--radius`(基准) | 对齐 `--radius-md` | `16px` | shadcn 派生基准(现为 0.75rem,落地改) |
| `--font-sans` / `--font-heading` | `--font-body` / `--font-display` | `Inter, system-ui, sans-serif` | 正文/标题字体(决议 E,见 2.4 字体) |

> `--radius-xl/2xl/3xl/4xl` 等现有更大档位:Neo-Brutalism 未用到,落地时保留槽位但不纳入设计基线(避免误用)。新增 `--radius-pill: 9999px`(原型 `--radius-pill`)见 2.3。

### 2.3 原型独有 · 新增 token(shadcn 无对应槽位)

> 这些是 shadcn 体系里没有、但原型设计语言必需的 token。**按原型语义新增命名**,不挤占 2.1 的语义槽位。命名前缀沿用 `--color-*` / `--shadow-*` 等以便直映 `@theme`。

**(1) 扩展色面 / 文字**

| 新增 token | ← 原型来源 | 值 | 用途 |
|---|---|---|---|
| `--color-surface-warm` | `--surface-warm` | `#ffef9f` | 暖色表面(次按钮、hover 面、磁贴底);与 2.1 secondary/accent 同源,独立命名供直接语义引用 |
| `--color-foreground-2` | `--fg-2` | `#4c426c` | 二级前景(正文副色、lead 段) |
| `--color-border-soft` | `--border-soft` | `#f5eccd` | 更柔描边(tile 默认边) |
| `--color-ink` | `--fg` | `#1d1836` | **粗黑描边专用墨色**别名(语义=Neo-Brutalism 描边/硬阴影颜色),与 `--color-foreground` 同值但语义独立,组件描边/阴影引用此名 |
| `--color-accent-hover` | `--accent-hover` | `color-mix(in oklab, var(--color-primary), black 8%)` | 主色 hover |
| `--color-accent-active` | `--accent-active` | `color-mix(in oklab, var(--color-primary), black 14%)` | 主色 active |

**(2) 状态色(shadcn 仅有 destructive,补 success/warn)**

| 新增 token | ← 原型来源 | 值 | 用途 |
|---|---|---|---|
| `--color-success` | `--success` | `#2e9d57` | 成功 |
| `--color-warn` | `--warn` | `#ffb020` | 警告 |
| (`--color-destructive` 已在 2.1) | `--danger` | `#e5484d` | 危险 |

**(3) 内容类型色 ×5(决议 D)** —— 帖子内容类型(资讯/攻略/求助/评测/活动)的 pill 底色,token 化:

| 新增 token | ← 原型 | 值 | 类型 |
|---|---|---|---|
| `--color-type-news` | `.pill-news` | `#d9efff` | 资讯 |
| `--color-type-guide` | `.pill-guide` | `#d6f5e3` | 攻略 |
| `--color-type-help` | `.pill-help` | `#ffe0e0` | 求助 |
| `--color-type-review` | `.pill-review` | `#f0e2ff` | 评测 |
| `--color-type-event` | `.pill-event` | `#ffeccc` | 活动 |

**(4) 封面渐变 ×8(决议 D)** —— 头像/封面占位渐变 `cv-1..8`,token 化为 `--gradient-cv-1..8`:

| token | 值 |
|---|---|
| `--gradient-cv-1` | `linear-gradient(135deg, #ff6b00, #ff3d81)` |
| `--gradient-cv-2` | `linear-gradient(135deg, #6a5cff, #00c2ff)` |
| `--gradient-cv-3` | `linear-gradient(135deg, #00b86b, #b6ff3d)` |
| `--gradient-cv-4` | `linear-gradient(135deg, #ff206e, #ff9f1c)` |
| `--gradient-cv-5` | `linear-gradient(135deg, #0b5cff, #6a5cff)` |
| `--gradient-cv-6` | `linear-gradient(135deg, #1d1836, #ff6b00)` |
| `--gradient-cv-7` | `linear-gradient(135deg, #00a6a6, #2e9d57)` |
| `--gradient-cv-8` | `linear-gradient(135deg, #d8005c, #6a5cff)` |

**(5) 圆角 pill / 边框约定**

- `--radius-pill: 9999px`(全圆,pill/搜索框/头像/dot)。
- **边框约定(Neo-Brutalism 关键)**:描边默认 `2px solid var(--color-ink)`(墨色粗边),**非** `--color-border`。`--color-border`(柔)用于分隔线/弱描边(如 tile 默认态、虚线 foot)。组件契约里区分"主描边=ink 2px"与"弱描边=border"。

**(6) 实心偏移硬阴影 ×3(决议 A)** —— 原型把实心硬阴影(`Npx Npx 0 颜色`)硬编码散布在各组件(2/3/4/6/7px),此处归纳为三档 token,**替代未被引用的 `--elev-*`**:

| 新增 token | 建议值(可微调) | 用途 / 原型对应 |
|---|---|---|
| `--shadow-sm` | `2px 2px 0 var(--color-ink)` | 小控件(`.btn-sm`、`.input`) |
| `--shadow-md` | `4px 4px 0 var(--color-ink)` | 常规(`.btn`、`.panel`、`.post-card`、`.avatar-lg`) |
| `--shadow-lg` | `6px 6px 0 var(--color-ink)` | 大容器(`.carousel`) |
| `--shadow-hover` | `7px 7px 0 var(--color-primary)`(派生:在 md/lg 基础上放大并转主色) | hover 抬升态(`.post-card:hover`) |
| `--focus-ring` | `0 0 0 4px var(--color-ring)` | 焦点环(原型 `--focus-ring`,叠加在硬阴影上) |

> 说明:确切偏移量(2/4/6、hover 放大幅度、颜色 ink vs accent)**可在视觉落地阶段微调**;命名(sm/md/lg/hover)现在定死。原型 `--elev-flat/ring/raised` 不纳入实心阴影体系(`--elev-ring` 作为 1px 描边阴影若仍需可保留,但不作设计基线)。

**(7) 动效**

| 新增 token | ← 原型 | 值 | 用途 |
|---|---|---|---|
| `--motion-fast` | `--motion-fast` | `150ms` | 微交互(hover/focus) |
| `--motion-base` | `--motion-base` | `240ms` | 卡片/容器过渡 |
| `--ease-standard` | `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 标准缓动 |

> 原型另有 480ms(轮播切换)、.45s/.7s(刷新动画)等:属组件内动画时长,不升为全局 token,组件契约内就近声明。

### 2.4 字体 / 字号 / 行高 / 字距 / 间距(基础 scale)

**字体(决议 E)**:
- `--font-sans` = `--font-heading` = `Inter, system-ui, sans-serif`;`--font-mono` = `"SF Mono", ui-monospace, Menlo, monospace`。
- **现状是 Geist**,本设计定义为 **Inter**;**实际替换 Geist、引入 Inter 字体文件(self-host vs CDN)是四期落地**(承概要 11.6 资源待办)。
- 原型变量名已写 Inter 但从未加载字体文件,故现状视觉是回退字体 —— 决议 E 的"正式引入"= 真正加载 Inter。

**字号(8 档删 4xl → 7 档,决议 E)**:

| token | 值 | 用途 |
|---|---|---|
| `--text-xs` | `12px` | 标注/pill/mono 计数 |
| `--text-sm` | `14px` | 正文小/按钮/导航 |
| `--text-base` | `16px` | 正文基准 |
| `--text-lg` | `18px` | 帖子标题/lead |
| `--text-xl` | `24px` | 小标题 `h-md`/品牌 |
| `--text-2xl` | `36px` | 中标题 `h-lg` |
| `--text-3xl` | `54px` | 大标题 `h-xl`/slide |
| ~~`--text-4xl`~~ | ~~76px~~ | **删除**(原型未引用,决议 E) |

**行高(决议 B:扩档并统一)** —— 原型仅 `body 1.52` / `tight 1.06` 两档,组件却散用 1.1/1.2/1.25/1.5/1.6/1.05 硬编码;统一为档位:

| token | 值 | 用途 |
|---|---|---|
| `--leading-tight` | `1.06` | 大标题(`h-xl`/slide h2) |
| `--leading-heading` | `1.2` | 中小标题(`h-md`/`h-lg`/post-title 段) |
| `--leading-snug` | `1.5` | 紧凑正文(lead/preview) |
| `--leading-body` | `1.52` | 正文基准 |
| `--leading-relaxed` | `1.6` | 长文/textarea |

> 落地时把组件里的硬编码行高(1.1/1.25 等)就近收敛到最近档位;确切档位值**可微调**,命名定死。

**字距**:

| token | 值 | 用途 |
|---|---|---|
| `--tracking-display` | `-0.025em` | 标题负字距(原型 `--tracking-display`) |
| `--tracking-tight` | `-0.03em` | 品牌/超大标题更紧(收敛原型散用的 -0.03em) |

**间距(4px 基准 scale,补 7/9/10/11,决议 F)**:

| token | 值 | | token | 值 |
|---|---|---|---|---|
| `--space-1` | `4px` | | `--space-7` | `28px`(**补**) |
| `--space-2` | `8px` | | `--space-8` | `32px` |
| `--space-3` | `12px` | | `--space-9` | `36px`(**补**) |
| `--space-4` | `16px` | | `--space-10` | `40px`(**补**) |
| `--space-5` | `20px` | | `--space-11` | `44px`(**补**) |
| `--space-6` | `24px` | | `--space-12` | `48px` |

> 补 7/9/10/11 后,落地时把组件内的硬编码非档值(11px/13px/7px 等微调)收敛到最近档位(决议 F"收敛硬编码")。布局级间距(section-y/container-gutter)**不在此 scale**,见第四章。

---

## 三、全局组件契约

> 范围:仅**跨页面复用的全局组件**(对应概要 11.2"全局组件")。页面级组件不在此(第八章清单)。
> **状态统一用 `data-state`(决议 C)**,不沿用原型的 `.active`/`.liked` 等 class。
> 每个组件给:职责 / 变体 variant / 状态 state(`data-state` 取值)/ 对外扩展点 / **对应改造的现有组件** / 落地映射。**对外契约(props/variant/state)钉死求稳**,内部实现留落地。

**扩展优先于新建的判定(贯穿全组件):**
- **加 variant**:同一组件的视觉/语义分支(如按钮 primary/ghost)→ 在现有 cva `variants` 里加值。
- **加 prop**:行为/内容扩展点(如是否显示图标、计数值)→ 加组件 prop。
- **加 className 透传**:一次性位置/间距微调 → 组件须暴露 `className`(经 `cn()` 合并)。
- **新建**:仅当现有组件无法通过上述扩展承载(结构性不同)时;新建后**回填本文档**(第七章)。

### 3.1 Button(改造 `components/ui/button.tsx`)
- **职责**:所有点击操作的统一按钮。
- **variant**:`primary`(主橙)/ `secondary`(暖底)/ `ghost`(无边无影)/ `outline`(墨边白底,= 原型默认 `.btn`)/ `destructive` / `link`。映射原型 `.btn-primary/.btn-secondary/.btn-ghost` + 基础 `.btn`；为兼容现有调用保留 `default` alias，并固定映射到 `outline` 语义。
- **size**:`sm` / `default` / `lg` / `icon` 为目标契约；现有 `xs` / `icon-xs` / `icon-sm` / `icon-lg` 作为兼容 alias 保留，不要求 P1 全仓重命名。`block`(满宽)用 `className="w-full"`，不新增 size。
- **state(`data-state`)**:`hover`/`active`/`focus-visible` 由伪类驱动(见第六章);禁用用 `disabled`。无需自定义 data-state。
- **扩展点**:`variant`/`size`/`className`/Base UI `render`/图标作为 children。当前真实 primitive 不提供 Radix `asChild`，不得为命名一致凭空新增该接口。
- **落地**:现有 `button.tsx` 已有 cva variant/size,**改造其值**(描边 2px ink、`--shadow-sm/md`、hover 位移 + 阴影放大、active 下沉)对齐原型 `.btn`;补齐目标 variant，同时保留 `default` 兼容 alias 并映射为 outline。

### 3.2 Input / Textarea / Select(改造 `input.tsx` / `textarea.tsx`;Select 新建)
- **职责**:表单文本/多行/下拉输入。
- **variant**:单一基础态(原型无多变体)。
- **state(`data-state`)**:`invalid`(校验失败,危险色边)/ focus 由伪类。
- **扩展点**:原生 input/textarea props + `className`;`Field` 包裹(label+控件+错误位)作为组合,不在单控件内。
- **落地**:`input.tsx`/`textarea.tsx` 改样式为原型 `.input/.textarea`(2px ink 边 + `--shadow-sm`,focus `--shadow` 转主色)。**Select 现有 ui 无** → 新建 `select.tsx`(shadcn select 风格,套同款描边/阴影),回填本文档。

### 3.3 Pill(新建 `components/ui/pill.tsx`)
- **职责**:类型/状态徽标(内容类型、热度、软标签)。
- **variant**:`accent` / `warm` / `soft` / 内容类型 `news`/`guide`/`help`/`review`/`event`(引用 2.3 内容类型色)。
- **state**:无(纯展示)。
- **扩展点**:`variant` / `className` / children(emoji + 文字)。
- **落地**:**现有 `badge.tsx` 变体不足**(无 5 内容类型色),且 Pill 语义(类型色体系)独立 → **新建 `pill.tsx`** 用 cva 承载 8 个变体;不强行扩 badge,避免 badge 语义膨胀。新建后回填。

### 3.4 TagChip 标签筛选(新建 `components/ui/tag-chip.tsx`)
- **职责**:首页/搜索页的内容类型**单选**筛选 chip(决议 I 单选)。
- **variant**:可叠加类型色(同 Pill 色板)。
- **state(`data-state`)**:`active`(选中,主橙底 + 硬阴影)/ 默认。**取代原型 `.tag-chip.active`**。
- **扩展点**:`active`(boolean,驱动 `data-state`)/ `onSelect` / `value` / `className`。
- **落地**:现有无 → 新建;hover 位移 + 阴影、active `data-state="active"` 驱动选中样式。

### 3.5 Avatar(改造 `components/ui/avatar.tsx`)
- **职责**:用户头像,三尺寸 + 渐变底 + 首字母 fallback。
- **variant/size**:`sm`(28)/ `md`(44)/ `lg`(72)(对齐原型 `.avatar/.avatar-md/.avatar-lg`);渐变底用 `cv` prop(1–8 → `--gradient-cv-*`)。
- **state**:无。
- **扩展点**:`size` / `cv` / `src`(有图显图)/ fallback children(首字母);`className`。
- **落地**:现有 `avatar.tsx` 已有 size(default/sm/lg)→ 改造尺寸值对齐 28/44/72,新增 `cv` 渐变底 prop;**首字母 fallback 复用现有 `PostItem` 逻辑**(概要复用点)。

### 3.6 SearchBar（共享页面级搜索组件）
- **职责**:页面级搜索框（放大镜 + input + ⏎ kbd 提示）；Home 负责导航到 `/search?q=`，Search 负责查询输入、修改、清除与重试。
- **variant**:单一。
- **state**:focus 态(阴影转主色,伪类)。
- **扩展点**:`value`/`onSubmit`/`placeholder`/`className`;kbd 提示可选(`showKbd`)。
- **落地**:已抽为可复用 `SearchBar`，产品页面仅由 Home 与 Search 使用；O1 已物理移除 App Shell 全局 Topbar，不保留空容器或兼容壳。移动端 ≤600 隐藏 kbd（原型规则）。

### 3.7 PostCard(改造 `components/PostItem.tsx`)
- **职责**:帖子卡(封面/类型 pill/标题/摘要/作者/统计)。
- **variant**:单一(网格卡)。
- **state(`data-state`)**:hover(抬升 + 阴影转主色,伪类即可,无需 data-state);点赞态见内部 StatButton。
- **扩展点**:`post` 数据 prop;`className`;`highlight?: string`（仅对标题/摘要做安全 React 文本分段，不使用 innerHTML，默认不高亮）;统计区 slot。
- **落地**:**对应现有 `PostItem.tsx`** —— 改造为原型 `.post-card` 结构(cover/body/foot),浏览量改读真实 `viewCount`(删 `Math.random()`,属二期功能,但卡结构在此定契约)。

### 3.8 StatButton 统计按钮(新建或并入 PostCard,`components/ui/stat-button.tsx`)
- **职责**:点赞/评论/浏览的图标 + 计数按钮。
- **variant**:`like` / `comment` / `view`。
- **state(`data-state`)**:`liked`(已赞,主色)/ 默认。**取代原型 `.stat-btn.liked`**。
- **扩展点**:`count`/`active`/`onToggle`/`className`;计数 k 缩写(≥1000 → `x.xk`)。
- **落地**:现有无独立组件(散在 PostItem)→ 抽为 `stat-button.tsx`,回填本文档。

### 3.9 Panel / Tile(改造 `components/ui/card.tsx`)
- **职责**:`Panel`=强描边内容容器(2px ink + `--shadow-md`);`Tile`=弱描边可悬浮磁贴(`--color-border-soft`,hover 转 ink)。
- **variant**:`panel` / `tile`(或两组件)。`panel-pad` 作为 padding 变体。
- **state**:tile hover(伪类)。
- **扩展点**:`variant`/`padding="none|sm|default"`/`className`/children；现有 `size="default|sm"` 作为兼容 alias 保留到页面迁移完成。
- **落地**:**对应现有 `card.tsx`**(已有 size default/sm)→ 扩 `variant: panel|tile` 承载原型 `.panel`/`.tile` 两种描边/阴影语义。

### 3.10 Carousel(改造 `components/SildeShow.tsx` + `components/ui/carousel.tsx`)
- **职责**:首页头条轮播(slide + dot + arrow,自动 + 手动)。
- **variant**:单一。
- **state(`data-state`)**:dot `active`(当前页)。**取代原型 `.dot.active`**。
- **扩展点**:`slides` 数据 / `autoplay` 间隔 / `className`。
- **落地**:现有轮播组件为 `SildeShow.tsx`(**沿用现状拼写**),底层 ui 为 `carousel.tsx`(embla)→ 改造视觉为原型 `.carousel`(2px ink + `--shadow-lg`、dot/arrow 样式);保留 embla 行为。

### 3.11 Sidebar 侧边导航（现有 `components/Sidebar.tsx`）
- **职责**:App Shell 左侧主导航(品牌 + nav-link ×4 + 分隔 + 用户卡);三段式下转图标列/底 tab(见第四章)。
- **variant**:由断点驱动形态(展开/图标/底 tab),非 prop variant。
- **state(`data-state`)**:nav-link `active`(当前路由)。**取代原型 `.nav-link.active`**。
- **扩展点**:导航项配置(label/icon/href/needLogin)。
- **落地**：`Sidebar.tsx` 已存在并统一承担展开侧栏、窄桌面图标栏和 ≤760px 移动底 tab 三态；历史 `BottomNav.tsx` 已删除，不再维护第二套移动导航。主导航保持 4 项（首页/攻略助手/发帖/我的，决议 K）。

### 3.12 CountBadge(新建 `components/ui/count-badge.tsx`)
- **职责**:mono 等宽数字计数(统计/会话未读等)。
- **variant**:单一。
- **state**:无。
- **扩展点**:`value`(支持 k 缩写)/`className`。
- **落地**:现有无 → 新建,`--font-mono` + tabular-nums。

### 3.13 P4 内容、反馈与状态组件

- **MarkdownRenderer**（`components/MarkdownRenderer.tsx`）：Compose 预览、PostDetail 正文与 Chat assistant 正文的唯一 Markdown 渲染器；`variant="article|chat"` 只改变排版密度，解析、安全策略与 URL 白名单保持单一来源。只接收原始 Markdown 字符串，统一使用 `remark-gfm`、`remark-breaks`、`rehype-sanitize`，不启用 raw HTML。Chat user 消息继续按 React 纯文本转义，不进入 renderer；annotation 引用继续独立渲染在正文之后。
- **Toaster**（`components/ui/toaster.tsx`）+ **feedback helper**（`lib/feedback.ts`）：应用根部只挂一个 Toaster；页面只调用带稳定 `id` 的 success/error/warning helper 去重，不让 toast 接管请求、store 或导航。
- **AlertDialog**（`components/ui/alert-dialog.tsx`）：基于已安装的 Base UI 1.3 `@base-ui/react/alert-dialog` 真实 parts API；只用于不可逆动作。取消按钮为初始安全焦点，确认 action 不自动关闭，异步成功后由受控页面关闭；busy 时禁止重复确认。取消或 Esc 后焦点返回触发按钮；成功动作若会卸载触发节点，`finalFocus` 必须在节点仍连接时返回触发按钮，否则返回页面提供的稳定恢复锚点。
- **PageState**（`components/PageState.tsx`）：统一 `idle|loading|empty|error` 内容区状态，外层用 `data-state`；loading 为 `role=status`，error 为 `role=alert`，action 由页面传入既有 Button。只呈现真实可观测状态，不捕获 API、不伪造 error。
- **Skeleton**（`components/ui/skeleton.tsx`）：无语义的稳定占位块，`aria-hidden`，reduced-motion 下停止动画；页面按已冻结结构组合，不替代全局 Suspense/Mine busy 使用的 fixed `Loading` overlay。

**P4 落地状态（2026-07-16，已人工验收通过）：** 上述五项契约均已实现；Compose/PostDetail 共用唯一 `MarkdownRenderer`，产品入口只挂一个 Toaster，评论删除使用受控 Base UI AlertDialog，Home/Search/Chat/PostDetail 已接入真实可观测的 PageState/Skeleton。删除取消或 Esc、失败保留 Dialog 内焦点、成功后触发节点消失时回退 `comments-heading` 三条焦点路径，以及 DELETE 成功但评论刷新失败时的本地树一致性均已实测；用户已确认 P4，可以进入 P5 施工方案阶段。

### 3.14 标题层级(样式约定,非组件)
- `eyebrow`(mono 小标 + 主色)/ `h-xl`(text-3xl/tight)/ `h-lg`(text-2xl/heading)/ `h-md`(text-xl/heading)/ `lead`(text-lg/foreground-2/snug)。
- **落地**:作为 Tailwind utility 组合或 `Heading` 辅助组件,落地择一;此处只定义层级与 token 引用。

> **组件 ↔ 现有实现对照速查**

| 全局组件 | 现有对应 | 处置 |
|---|---|---|
| Button | `ui/button.tsx` | 改造(扩 variant 值) |
| Input/Textarea | `ui/input.tsx`/`ui/textarea.tsx` | 改造 |
| Select | — | 新建 |
| Pill | `ui/badge.tsx`(不足) | 新建 `pill.tsx` |
| TagChip | — | 新建 |
| Avatar | `ui/avatar.tsx` | 改造(尺寸+cv) |
| SearchBar | `components/SearchBar.tsx` | 已抽取；仅 Home/Search 复用，App Shell 不再固定渲染 |
| PostCard | `PostItem.tsx` | 改造 |
| StatButton | 散在 PostItem | 抽取新建 |
| Panel/Tile | `ui/card.tsx` | 改造(扩 variant) |
| Carousel | `SildeShow.tsx`+`ui/carousel.tsx` | 改造 |
| Sidebar | `Sidebar.tsx` 已存在；`BottomNav.tsx` 已删除 | 改造现有 Sidebar，统一承担展开/图标栏/移动底 tab 三态 |
| CountBadge | — | 新建 |
| MarkdownRenderer | `components/MarkdownRenderer.tsx` | P4 新建、O1 扩展 `article|chat`；Compose/PostDetail/Chat assistant 共用唯一安全渲染器 |
| Toaster/feedback | — | P4 新建；根部单例 + 页面 helper |
| AlertDialog | `window.confirm` | P4 新建并仅替换评论删除确认 |
| PageState/Skeleton | 页面私有 loading/empty/error 块 | P4 新建；只统一真实状态，不改数据流 |

---

## 四、App Shell 与布局骨架

> 一期落地结构;后续业务页面在内容容器内渲染。

### 4.1 App Shell 结构

```
.app (grid)
├─ Sidebar(左侧主导航)         ← 第三章 3.11
└─ main(右主区)
   └─ 内容容器(.container)      ← 各页面在此渲染
```

- 桌面:`grid-template-columns: 248px 1fr`,sidebar `position: sticky; height: 100vh`。
- O1 已物理移除全局 Topbar；Home 与 Search 各自在内容容器内组合页面级 SearchBar，其余业务页自然上移且不保留顶部占位。

### 4.2 三段式响应式(断点与各档形态)

| 断点 | 触发 | Sidebar 形态 | 内容 |
|---|---|---|---|
| 桌面 | `> 1024px` | 全展开 248px(图标+文字+用户卡) | `.container` gutter 桌面档 |
| 平板 | `≤ 1024px` | 收为 **80px 图标列**(隐藏文字/品牌字/用户卡 meta,nav-link 居中) | gutter 平板档 |
| 手机 | `≤ 760px` | 转**底部 fixed tab**(横向均分,隐藏品牌/分隔/用户卡;`main` 留 `padding-bottom: 72px`) | 单列;`post-grid` 单列 |

- 断点值 `1024 / 760` 定死(原型一致);App Shell grid 在各档切换列模板(248→80→1fr)。
- **登录注册页(auth)例外**:`auth.html` 是**独立全屏分栏**(`grid-template-columns: 1.05fr .95fr`,左品牌面板 + 右表单),**不套 App Shell**（无 Sidebar）；移动端(≤860)隐藏左品牌面板、仅留表单。功能设计中 auth 页直接用此独立布局,不进 `.app`。

### 4.3 布局间距 token(单列,与 2.4 基础 scale 区分)

> 语义为"区块级/容器级"间距,非组件内 spacing;独立命名,不混入 `--space-*`。

| token | ← 原型 | 值(桌面/平板/手机) | 用途 |
|---|---|---|---|
| `--container-max` | `--container-max` | `1180px` | 内容最大宽 |
| `--container-gutter` | `--container-gutter-*` | `36px / 24px / 16px` | 容器左右留白(随断点) |
| `--section-y` | `--section-y-*` | `96px / 68px / 48px` | 区块纵向节奏(随断点) |
| `--sidebar-w` | `.app` 列宽 | `248px`(桌面)/ `80px`(平板) | 侧栏宽 |
| `--bottombar-h` | `.main` padding | `72px` | 移动底 tab 预留高 |

---

## 五、路由与守卫约定

> 沿用现有 react-router v7 + lazy(代码分割);一期把路由按**最终形态**配好,受保护页先以**占位组件**顶着(承概要一期"空壳"定位)。
> **架构变更(二期)**:原 react-activation keep-alive **已移除**。来龙去脉:导航 / portal commit 时的 `insertBefore` 白屏最初被误诊为 react-activation 0.13.4 与 React 19.2 不兼容,**移除后白屏仍复现**——**真凶是浏览器翻译扩展改 DOM**(破坏 React 19 的 fiber↔DOM 对应,禁用扩展实测不再崩、已确认),以 `body translate="no"`(挡翻译扩展,覆盖 `#root` 内 navigate 与 body 上 portal 弹层两条路径)+ 全局 `ErrorBoundary`(崩则刷新恢复、不白屏)加固;react-activation 仅被报错栈"在场"冤枉(非真凶),但它确是未适配 React 19 的库,**保留移除**(顺带清隐患)。页面状态保持改由 **store** 承担、滚动位置靠 **sessionStorage**(`scroll` 实时存)恢复。

### 5.1 路由表组织
- 维持现有 `<Routes>` 组件式 + `lazy()` 代码分割(`router/index.tsx`);**不再用 `<AliveScope>` / react-activation keep-alive**——首页"返回保持"靠 store(`useHomeStore` 的 `posts/page/currentTag` 全局不丢)+ sessionStorage 滚动恢复(`scroll` 事件实时存当前位置、返回 `scrollTo`;不在卸载时存,避免 DOM 已拆致 scrollY 被截断)。
- 路由依附于 Sidebar 导航结构:主导航 4 项(首页 `/`、攻略助手 `/chat`、发帖、我的 `/mine`)对应一级路由;二级页(详情 `/post/:id`、搜索 `/search`、登录 `/login`)为页面内入口/独立路由。
- **App Shell 包裹范围**:业务页经 `MainLayout`（= App Shell:Sidebar + main + 内容容器）渲染；`/login`(auth)走**独立布局**,不进 App Shell。

### 5.2 守卫(needsLogin)统一写法
- **改为路由级包裹**(取代现有 `App.tsx` 的 `<Routes>` 外 useEffect 兜底):受保护路由用统一守卫组件(如 `<RequireAuth>`)包裹其 element,未登录重定向 `/login`。
- **受保护清单形态**:集中声明(数组或路由 meta),一期按最终形态配 —— 覆盖 `/chat`、发帖页、`/mine`;清理废弃项:删 `needsLogin` 中无对应页面的 `/order`,删废弃路由 `/rag`、`/git`(它们本不在 `needsLogin` 内,是遗留无保护路由)。
- 现状 `needsLogin = ['/mine','/order','/chat']` → 目标语义:`['/mine','/chat', 发帖页路径]`,以路由级守卫落地。

### 5.3 占位组件约定
- 一期受保护页(发帖/详情/`/mine`/登录注册由二期、`/chat` 由三期填真)先以**占位组件**存在:能渲染、能被守卫拦截、能验证三断点布局,但无真实业务功能。保护的是已配好的占位路由,而非已完成页面。

---

## 六、全局交互与反馈约定

### 6.1 交互态统一表现(Neo-Brutalism 物理感)
- **hover**:位移 `translate(-1px,-1px)` ~ `(-2px,-2px)` + 硬阴影放大(`--shadow-md`→更大 / 转主色 `--shadow-hover`)。
- **active**:下沉 `translate(2px,2px)` + 阴影缩小(`--shadow-sm` 或更小),模拟"按下贴合"。
- **focus-visible**:`--focus-ring`(`0 0 0 4px` 主色 26% 透明)叠加在原硬阴影上;表单控件 focus 阴影转主色。
- 过渡用 `--motion-fast` + `--ease-standard`。

### 6.2 状态驱动(决议 C)
- 选中/激活/点赞等**一律 `data-state`** 驱动样式(`[data-state="active"]` / `[data-state="liked"]`),**不用** `.active`/`.on`/`.liked` class。各组件取值见第三章。
- 行为钩子(原型的 `data-like`/`data-tag` 等)在 React 中由 props/事件替代,不保留 DOM data 钩子。

### 6.3 反馈机制
- **统一用 toast / Dialog**(shadcn 体系),**不用**原型演示用的原生 `alert/confirm`。
- 本章定全局约定;具体 toast/Dialog 组件落地(选型、空/载/错态视觉)留功能设计与四期(承概要 11.6 反馈系统待办)。

---

## 七、复用与扩展规范

落实概要"复用优先"原则,前端可执行规则(优先级从高到低):
1. **复用**:能用现有全局组件(第三章)直接满足 → 直接用,不包装。
2. **扩展**:差一点 → 按第三章判定加 `variant` / `prop` / 透传 `className`(经 `cn()`);**改造现有组件而非另建**(尤其已挂钩现有实现的组件)。
3. **新建**:现有结构性无法承载时才新建;新建组件归位(全局 → `components/ui/` 或 `components/`,页面级 → 随页面)。
4. **回填**:新建/改契约后,**回填本文档**(第三章组件表 + 对照速查),保持本文件为**单一事实来源**;严禁同一组件出现两套不一致契约。
5. **token 纪律**:颜色/间距/阴影/圆角/字体一律引用第二章 token,**禁止内联硬编码**(决议 A/B/D/F);新增视觉值先进 token 再引用。

---

## 八、待定项与边界清单

### 8.1 本文件待定项(依赖后续设计/不阻塞一期骨架)
- **暗色模式**:本轮**不定义**暗色 Neo-Brutalism token 值(承概要 11.6)。**孤儿值处置(明确)**:四期把浅色 `@theme`/`:root` 覆写为 Neo-Brutalism 后,现有 `src/App.css` 的 `.dark` 块旧 oklch 值即与新设计语言**不匹配(成为孤儿值)**;**本项目在定义暗色 token 之前,暗色一律视为"未启用"——保留 `.dark` 机制与代码结构,但不暴露任何暗色切换入口**(不渲染主题切换控件)。即"保留机制 ≠ 暗色可用";待专门定义暗色 token 后再启用。
- **确切数值微调**:实心硬阴影三档偏移量(2/4/6 与 hover 放大)、行高新增档位确切值 —— 命名已定死,数值在视觉落地可微调。
- **Inter 引入方式**:self-host vs CDN(承概要 11.6 资源待办)。
- **预设头像**:Avatar 是否支持预设选择(承概要 11.5 头像 + 11.6 待办),影响 Avatar 是否加变体;暂不在契约内固化。

### 8.2 留给功能设计文档(不写入本文件)
- **页面**:首页/搜索结果/帖子详情/攻略助手/发帖/我的(及我的文章·点赞·编辑资料)/登录注册 —— 各页信息架构属功能设计。
- **页面级组件**:下拉刷新 ptr、密码强度条 + 显隐切换、分段控件 seg、文章正文 article、评论项/回复框 comment、聊天气泡 bubble + 会话项 session-item、发帖编辑器 editor + 实时预览、资料头 profile-hero + 数据墙 + 功能入口 entry、头像选择器 avatar-pick、文章行 prow、搜索摘要 + 关键词高亮。
- **各期接口与数据**:评论/点赞/上传/发帖/游戏/AI 等接口契约,属各期功能设计。

---

> 决议落实对照:A(阴影三档 2.3-6)· B(行高扩档 2.4)· C(data-state 三/六)· D(类型色+渐变 2.3-3/4)· E(Inter+删4xl 2.4)· F(间距补档 2.4)· G(登录/搜索页归功能设计 八)· H/I/J/K(交互/筛选/降级/主导航在交互与组件契约中承接)。
