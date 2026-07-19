# O2.0 范围冻结与基线证据

> 日期：2026-07-18
> 批次：四期后个人内容 O2
> 状态：O2.0 已执行，待用户确认；未进入 O2.1

## 1. 工作树与工具

| 项目 | 基线 |
|---|---|
| HEAD | `96f92457900f24b8bdcefce16779a1265d586bce` |
| 分支 | `main` |
| Node | `v24.18.0` |
| pnpm | `11.9.0` |
| 3000 | 无监听 |
| 5173 | 无监听 |

O2.0 开始前 `git status --short`：

```text
 M .planning/.active_plan
 M CLAUDE.md
?? .planning/post-phase4-personal-content/
?? docs/design/06-post-phase4-personal-content.md
?? docs/plans/06-post-phase4-personal-content-implementation-plan.md
```

现有改动归属：

- 用户历史改动：`CLAUDE.md`，当前相对 HEAD 为 35 insertions / 2 deletions；O2 不触碰。
- O2 设计与规划：`.planning/.active_plan`、`.planning/post-phase4-personal-content/`、06 设计与实施计划。
- O2.0 新增证据：本目录、受保护文件哈希和 `docs/qa/phase4/screenshots/o2-before/`。
- O2 预计产品文件：尚未修改，`frontend/black_box/src`、`backend/backend/posts/src`、Prisma、package/lock、原型、`AGENTS.md` 均无本轮状态命中。

未读取或记录 `.env`、数据库连接串、JWT、AI key 或账号密码。

## 2. 受保护文件 SHA-256

- 清单：`docs/qa/post-phase4-personal-content/protected-files-before.sha256`
- 文件数：65
- `CLAUDE.md`：已包含
- `.env` 命中：0
- 范围：用户文件、AGENTS、原型、依赖/lock、配置、O2 禁改页面/组件/store、后端 schema/users/ai/auth。

O2.4 必须用同一算法与路径集合生成 after 清单并逐项比较。若用户在 O2 执行期间主动修改受保护文件，必须先确认所有权并如实登记，不能把差异归为 O2。

## 3. 前端自动基线

### 3.1 Vitest

命令：`pnpm test:unit`

结果：

```text
Test Files  13 passed (13)
Tests       39 passed (39)
```

### 3.2 Build

命令：

```powershell
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm build
```

结果：成功，Vite `2455 modules transformed`。

### 3.3 Lint

命令：`pnpm lint`

结果：批准的历史基线 `3 errors / 0 warnings`，无新增路径：

- `src/components/ui/badge.tsx`：1 条 `react-refresh/only-export-components`。
- `src/utils/index.ts`：2 条 `@typescript-eslint/no-explicit-any`。

全量 lint 按预期以非零状态退出；这不是“全仓 lint 通过”。O2 后续新增/修改文件仍须定向 `0 errors / 0 warnings`，且不得清理上述范围外历史债。

### 3.4 Playwright

命令：

```powershell
pnpm exec playwright test --list
pnpm e2e
```

结果：

```text
Total: 46 tests in 8 files
46 passed (10.7s)
```

现有 spec：`ai-chat`、`app-shell-ux`、`auth-guard`、`auth`、`compose`、`game-filter`、`home`、`social`。O2 人工验收通过前保持 8/46，不新增或修改 e2e。

## 4. 后端自动基线

### 4.1 Jest

命令：`pnpm test -- --runInBand`

结果：

```text
Test Suites: 15 passed, 15 total
Tests:       64 passed, 64 total
```

### 4.2 Build

命令：`pnpm build`

结果：Nest build 成功。

### 4.3 无写入 ESLint 扫描

命令：

```powershell
pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
```

结果：历史基线 `881 errors / 7 warnings`，其中 845 errors 可被 `--fix` 处理。主要为 Prettier/换行与既有 unsafe/unused 规则债。

没有运行自带 `--fix` 的 `pnpm lint`，因此未格式化或改写后端历史文件。O2 后端新增文件必须定向 0/0，修改文件不得新增问题；全仓 lint 债独立处理。

## 5. 接口与引用基线

- `PostsController` 当前 `@Get(':id')` 位于 tags 后；尚无 mine/liked 静态路由。
- `PostsService.findAll()` 当前内联公共帖子查询与映射。
- Prisma 已有 `UserLikePost`、复合主键和 `user_like_posts` 映射。
- 前端已存在 `RequireAuth`、`PostItem`、`PageState`、`InfiniteScroll`、`BackToTop`。
- `frontend/black_box/src` 与 `backend/backend/posts/src` 对 `mine/posts`、`mine/likes`、`posts/mine`、`posts/liked` 的产品命中为 0。

因此 O2 尚未被部分实现，不存在重复接口或路由冲突。

## 6. 视觉基线

命令：

```powershell
$env:VITE_API_BASE_URL='http://localhost:3000/api'
pnpm visual:capture -- --stage=o2-before --base-url=http://localhost:5173
```

结果：`28/28`，脚本自行启动并关闭临时 Vite：

| 视口 | 页面数 |
|---|---:|
| 1440×1000 | 7 |
| 900×1000 | 7 |
| 390×844 | 7 |
| 320×740 | 7 |

页面为 Home、Search、PostDetail、Compose、Chat、Mine、Login，输出目录为 `docs/qa/phase4/screenshots/o2-before/`。

Mine 四视口人工抽查：

- 当前只有账户摘要、头像上传与退出，没有“我的发布”“我的收藏”入口，符合实施前事实。
- 1440 为 248px 展开 Sidebar，900 为 80px 图标栏，390/320 为 72px 移动底栏。
- 未见页面整体横向溢出、遮挡或底栏冲突。
- 320px 下长用户名自然换行，卡片边界完整。

O2 尚不存在的 MyPosts/MyLikes 页面未伪造截图；实现后由 O2.4 专项脚本捕获。

## 7. 环境读取异常记录

沙箱内首次读取 pnpm 模块出现两类环境错误：

1. `pnpm test:unit` 读取 Vitest CLI 时返回 Windows `EPERM open`。
2. 前端 build 在沙箱内无法解析多项已安装包类型。

相同命令在受限沙箱外重新运行后分别得到 13/39 与 build 成功，证明不是产品代码或依赖缺失。未修改权限、node_modules、依赖或 lockfile。

## 8. O2.0 门禁结论

- 工作树、工具版本、测试、lint、接口引用与视觉基线均已冻结。
- 受保护文件清单完整包含 `CLAUDE.md`，且不包含 `.env`。
- 前后端测试与 build 成立；前后端历史 lint 债已如实记录且未被修改。
- Playwright 保持 8 files / 46 passed；截图 28/28。
- 截图与 Playwright 临时服务结束后，3000/5173 均无监听。
- O2.0 未修改产品代码、既有测试、依赖、配置、数据库、原型或用户 `CLAUDE.md` 改动。

当前停在 O2.0 用户确认门禁；未进入 O2.1，未提交 Git，未开启第五期。
