# O1.4 完整回归与人工验收准备报告

> 状态：O1 已实现、已人工验收通过并完成行为锁定  
> 日期：2026-07-17  
> 范围：O1.0～O1.5；O1 已关闭，不自动进入第五期

## 1. 自动门禁

| 门禁 | 结果 |
|---|---|
| 前端 unit | 13 files / 39 passed |
| O1 定向 lint | 0 errors / 0 warnings |
| 前端全量 lint | 3 errors / 0 warnings；仅既有 `src/components/ui/badge.tsx` 1 条、`src/utils/index.ts` 2 条 |
| build | 成功，2455 modules transformed |
| Playwright 最终列表 | 8 files / 46 tests |
| Playwright 最终全量 | 46 passed |
| `Topbar` 静态引用 | 0 |
| `dangerouslySetInnerHTML` / `rehype-raw` | 0 |
| 受保护文件 SHA-256 | before 110 / after 110 / diff 0 |

全量 lint 沿用第四期批准的差分门禁，不表述为“全仓 lint 通过”；O1 未新增 lint 问题。

## 2. 截图证据

- 七页默认态：`docs/qa/phase4/screenshots/o1/`，7 页 × 4 视口，共 28/28 张。
- Chat Markdown 专项：`docs/qa/post-phase4-ux-optimization/screenshots/o1-chat/`，共 4/4 张。
- 视口：1440×1000、900×1000、390×844、320×740。

抽查结论：

- Home 只保留页面级 SearchBar；Search 只保留页内 SearchBar。
- PostDetail、Compose、Chat、Mine 无全局 Topbar、空壳或顶部占位；Login 独立布局不变。
- Chat 桌面和移动输入区完整，移动端避开 72px 底部导航；页面无横向溢出。
- assistant 的标题、段落、强调、列表、引用、链接、代码块和表格采用紧凑 Markdown 排版；citation chip 位于正文之后。
- user 的 `**用户原文** [链接](/post/1)` 保持源文本，不生成富文本节点。

## 3. Chat Markdown 专项

稳定 mock 使用既有 AI SDK v1 `8:` annotation、多段 `0:` 文本与 `d:` finish，不调用真实 AI，不修改产品协议。

- 四视口页面 `scrollWidth === clientWidth`。
- 宽表格与长代码分别在 table/pre 容器内部横向滚动，不撑宽消息区或页面。
- raw HTML、script、iframe、事件属性与危险 URL 均未进入可执行 DOM；XSS 标记未触发。
- 多个未闭合 Markdown 前缀由 `MarkdownRenderer` 单元测试验证不抛错，后续内容到达后可形成稳定结构。
- annotation title 继续由 React 文本转义，目标保持 `/post/:id`，未并入 Markdown 文本。

首次专项截图运行中，1440px 表格 fixture 宽度不足以证明局部滚动；经定位属于 QA 数据不够宽，不是产品缺陷。仅增强 fixture 的连续长 token 后重跑，四视口均通过。

## 4. 真实 AI 有限行为

使用既有验收账号经真实登录与 `/api/ai/chat` 链路执行一次移动视口检查，不记录 token、连接串或密钥。

- 本次结果：有限完成，约 6.9 秒。
- assistant 命中唯一 `MarkdownRenderer variant="chat"`，检测到 3 个标题/列表/代码等语义节点。
- 390px 页面宽度为 client 390 / scroll 390，无页面横向扩张。
- 若供应商或网络异常，仍以既有 55 秒客户端 timeout 和明确错误态作为允许的有限失败口径；O1 未修改该契约。

## 5. 受保护边界

`protected-files-before.sha256` 与 `protected-files-after.sha256` 均为 110 条，逐项比较无差异。Home、Search、SearchBar、useChatBot、useChatStore、Markdown policy、Sidebar、router 和后端协议文件均未被 O1 越界修改。

O1.4 人工验收前 Playwright 保持 7 files/41 tests 且既有用例未修改。人工验收通过后，O1.5 按计划新增 1 个 spec、5 条稳定行为锁定，既有 41 条不删除、不弱化。

## 6. 人工验收入口

建议按以下顺序复核：

1. Home 与 Search 的单一搜索框和 `/search?q=` 行为。
2. PostDetail、Compose、Chat、Mine 顶部自然上移，无全局搜索框残留。
3. Chat assistant Markdown 完成态、user 纯文本、citation chip 可点。
4. 390/320 下长代码、宽表格局部滚动，消息区与底部导航无冲突。
5. 切走 Chat 再返回保持、刷新可丢及真实 AI 有限完成/有限失败。

用户已于 2026-07-17 完成 O1.4 人工复验并明确通过，授权进入 O1.5 行为锁定与文档关闭。

## 7. 人工验收服务

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000/api`

最终复核时 3000 与 5173 均返回 HTTP 200。启动检查曾发现 5173 已有既存 Vite 进程，新增实例自动退到 5174；该额外 5174 实例已立即终止，未作为验收地址保留。

## 8. O1.5 行为锁定与最终门禁

- 新增 `e2e/app-shell-ux.spec.ts` 3 条：Home 单一搜索区与 q 编码、Search 单一页内搜索并消费 q、其余业务页无搜索区且 Login 独立。
- `e2e/ai-chat.spec.ts` 在原 3 条基础上新增 2 条：assistant Markdown 与 citation 共存、user Markdown 源字符保持纯文本。
- 增量矩阵：8/8 passed。首轮 Home 用例因可访问名称模糊匹配同时命中“清除搜索词”和“搜索”而失败，已仅将测试定位收紧为 `exact: true`，产品代码未改。
- Playwright 最终清单与全量：8 files / 46 passed。
- Unit：13 files / 39 passed。
- O1.5 测试文件定向 lint：0 errors / 0 warnings。
- 前端全量 lint：批准基线 3 errors / 0 warnings，仅既有 `ui/badge.tsx` 与 `utils/index.ts`。
- Build：成功，2455 modules transformed。

用户已完成人工验收，foundation 与 05 权威设计已回填最终事实。O1 至此关闭，不自动进入第五期。
