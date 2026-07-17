# O1 实施前基线

> 日期：2026-07-17  
> 阶段：O1.0 范围冻结与行为/视觉基线  
> 状态：自动证据完成，等待用户确认后进入 O1.1

## 1. 工作树与运行环境

- HEAD：`f29ea940dfb7f4492a09119303c3cf78864f7e2b`
- 分支：`main`
- Node：`v24.18.0`
- pnpm：`11.9.0`
- 工作树在 O1 开始前已有前三期、第四期的大量未提交业务改动和生成目录；O1 不取得这些改动的所有权，不执行 reset、checkout、clean、stash 或格式化。
- 现有 3000、5173 Node 服务均保留；基线探测结果为 `/api` 200、Vite 首页 200、`/src/App.css` 200，不终止用户已有进程。
- 未读取或记录 `.env`、数据库连接串、JWT、AI key 或演示用户密码。

### 现有改动分类

| 类别 | 代表路径 | O1 口径 |
|---|---|---|
| 历史业务改动 | `backend/backend/posts/src/`、`frontend/black_box/src/`、Prisma、package/lock | 保留，不归 O1；禁改范围以哈希清单复核 |
| 历史生成/QA 目录 | `dist/`、`test-results/`、`docs/qa/phase4/` | 不清理；O1 只新增指定 stage 截图 |
| O1 预计产品文件 | `MainLayout.tsx`、`Topbar.tsx`、`Chat.tsx`、`MarkdownRenderer.tsx` | O1.1～O1.3 才允许按计划修改 |
| O1 当前文档/QA | `docs/design/05-*`、`docs/plans/05-*`、`.planning/post-phase4-*`、本目录 | O1.0 已创建或更新 |

## 2. 受保护文件证据

- 清单：`docs/qa/post-phase4-ux-optimization/protected-files-before.sha256`
- 条目：110
- 覆盖：Home、Search、SearchBar、Sidebar、router、`useChatBot`、`useChatStore`、Markdown 安全策略、前后端 package/lock、全部后端 `src`、Prisma 与只读原型。
- 清单仅记录 SHA-256 和仓库相对路径。O1.4 必须使用同一算法生成 after 清单并要求 `Compare-Object` 无输出；不得重新生成 before 掩盖差异。

## 3. 自动行为基线

| 检查 | 结果 |
|---|---|
| `pnpm test:unit` | 12 files / 29 passed |
| `pnpm build` | 成功，2456 modules transformed |
| `pnpm lint` | 批准基线 3 errors / 0 warnings |
| lint 允许项 | `ui/badge.tsx` 1 条；`utils/index.ts` 2 条 |
| `playwright test --list` | 7 files / 41 tests |
| `pnpm e2e` | 41 passed，5.9s |

受限执行环境直接读取 pnpm 硬链接文件时出现 `EPERM`，与此前 Vite 字体读取现象同类；在获准的非沙箱命令环境中 unit/build/lint/Playwright 均正常完成。这是执行环境访问差异，不是产品测试失败。

## 4. 结构基线

- `Topbar` 只有两个代码位置：组件定义，以及 `MainLayout` 的 import/render；没有第二消费者。
- `SearchBar` 当前由 Home、Search、Topbar 三处组合。
- Chat 当前 user/assistant 都使用 `whitespace-pre-wrap` 纯文本；assistant annotation 在正文后独立渲染。
- `MarkdownRenderer` 已存在且只提供 article 正文排版，尚无 chat variant。

## 5. 视觉基线

- 目录：`docs/qa/phase4/screenshots/o1-before/`
- 数量：28/28。
- 视口：1440×1000、900×1000、390×844、320×740；每档均含 Home、Search、PostDetail、Compose、Chat、Mine、Login。
- 人工抽查：首页桌面和移动均清楚出现 Shell 搜索框 + Home 页面搜索框；Chat 桌面和移动均保留全局搜索顶栏，消息区高度按旧 Topbar 计算。
- Login 继续是独立布局控制样本。
- 截图脚本真实输出根固定为 `docs/qa/phase4/screenshots/{stage}`，实施计划已据实修正，未复制或移动截图制造第二份基线。

## 6. O1.0 门禁结论

- 自动基线、28 张截图、结构证据和受保护文件清单均已形成。
- 没有修改产品代码、既有测试、依赖、配置、数据库或原型。
- 按实施计划停在 O1.0 用户确认门禁；确认前不进入 O1.1。
