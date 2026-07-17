# 第四期 P4：Markdown、安全渲染、反馈与状态 QA

## 状态

P4.1～P4.5 已实施，并于 2026-07-16 通过用户人工验收。Markdown/XSS、统一状态与反馈、Dialog 焦点及删除成功后刷新失败的一致性阻塞均已关闭；允许进入 P5 施工方案阶段。

## 实现边界

- `Post.content` 仍提交 `trim()` 后的 Markdown 源文本，不存 HTML，不改接口、DTO、schema 或 migration。
- Compose 与 PostDetail 只使用 `MarkdownRenderer`；Chat 保持纯文本。
- 产品根部只有 `main.tsx` 一个 Toaster；dev-only gallery 有独立验收 Toaster，不进入产品入口。
- Home/PostDetail 详情仍不伪造被数据层吞掉的精确错误；Search、Chat、comments 只呈现真实可观测 error。
- 只把既有 `social.spec.ts` 的原生 confirm 操作改为 AlertDialog 操作，仍为原 7 条且删除断言不变。

## 自动门禁

| 项目 | 结果 |
|---|---|
| P4 定向 lint | 0 errors / 0 warnings |
| 全量 lint | 4 errors / 0 warnings；仅 `api/config.ts` 1、`ui/badge.tsx` 1、`utils/index.ts` 2 |
| Vitest | 4 files / 14 passed |
| Production build | 2452 modules transformed，成功 |
| Playwright list | 7 files / 41 tests |
| Playwright full | 41 passed |
| P4 screenshots | `docs/qa/phase4/screenshots/p4/`，28/28 |
| 静态安全扫描 | `window.confirm/alert`、`dangerouslySetInnerHTML`、`rehype-raw` 均无命中 |

## Markdown 与 XSS

- 单测覆盖旧纯文本单换行、空行段落、GFM 表格/任务列表/删除线/code language、站内/外链属性。
- 危险样本覆盖 script、raw img/onerror、iframe、javascript/data URL、混合大小写、控制字符、反斜杠和协议相对 URL；危险节点、属性和 URL 均不进入输出。
- 图片只允许绝对 http/https，使用 lazy/async/no-referrer；失败用 React state 显示 token 占位。
- 一次性交互 QA 在真实 PostDetail DOM 中确认 table 可见、script/危险 href 不存在；Compose 1440 同屏双栏、320 分段预览均使用同一 content。

## Dialog、反馈与焦点

- Cancel 为初始焦点；取消或 Esc 后焦点返回原删除按钮。
- 删除失败保留评论与 Dialog；首轮实测发现 busy 结束后焦点落 body，已修正为恢复到 Dialog Cancel，复验焦点保持 Dialog 内。
- 删除成功后评论节点卸载，`finalFocus` 检查原按钮 `isConnected`；不存在时聚焦 `comments-heading[tabIndex=-1]`，实测通过。
- 同一删除失败动作只保留一个稳定 id toast；评论提交 busy、点赞回滚、Compose/Mine/Login 原业务时序保持。

## 四视口

- `visual:capture -- --stage=p4` 输出 Home、Search、PostDetail、Compose、Chat、Mine、Login × 1440/900/390/320，共 28 张。
- 抽查 Compose 1440 双栏、PostDetail Markdown，以及 320 Compose/PostDetail/Chat/Mine/Login；无页面横向溢出、底部导航遮挡或 P3 信息结构回归。
- 一次性交互 QA 额外确认 Compose 320 与 PostDetail 390 的 `scrollWidth-clientWidth=0`。

## 已处理问题

1. Vitest 默认加载产品 Vite config 时误收集 7 个 Playwright spec，并被 mock plugin 阻塞退出；新增独立 `vitest.config.ts`，只收集 `src/**/*.test.{ts,tsx}`。
2. 评论空态拆分标题/描述破坏既有稳定文案锚点；恢复为“还没有评论，来抢沙发吧”，原测试不改。
3. 删除失败后 disabled busy 按钮导致焦点落 body；失败结束后显式聚焦 Dialog Cancel。
4. 人工审查发现删除接口成功、随后评论刷新失败时旧评论树仍可能留在页面；现改为 DELETE 成功后先从本地评论树递归移除目标节点并同步 Home 计数，再以刷新结果校准。一次性 route-mock QA 强制刷新返回 500，确认旧评论消失、错误态出现且 Dialog 最终关闭。
5. 删除无用途且误挂到“登录后参与评论”按钮的 `deleteConfirmRef`；删除 Dialog 的初始/最终焦点仍分别由 `deleteCancelRef`、`deleteTriggerRef` 与 `commentsHeadingRef` 承担。

## 人工验收待走

- Compose 编辑/预览、长 Markdown、上传/提交成功与失败反馈。
- PostDetail 旧帖换行、GFM、外链/图片、评论 Dialog 三条焦点路径。
- Search/Home/Chat 状态壳、Mine Drawer→Loading→toast、Login 注册成功 toast。
- 1440、900、390、320 的 toast 底栏避让、Dialog 尺寸、局部代码/表格横滚与无双滚动。
