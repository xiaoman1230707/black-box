# 第四期 P0 发现

## 已确认
- 当前分支为 `main`，HEAD 为 `f29ea940dfb7f4492a09119303c3cf78864f7e2b`。
- 工作树包含前三期大量 tracked/untracked 改动，P0 必须以受保护路径内容指纹证明业务代码前后不变，不能依赖干净 Git 状态。
- 前端现有 `package.json` scripts 为 `dev/build/lint/preview/e2e`；P0 只增加 `visual:capture`，不改变依赖和 lockfile。
- P0 截图必须复用现有 Playwright，不新增测试文件，不调用真实后端或 AI。
- P0 开始时工作树有 79 个状态项；受保护树 128 个文件，聚合 SHA-256 为 `b6fd1e703f9425f89d73369aab9b10eb3754c7e70eb4d826efe7c6f929f9678c`。

## 门禁结论
- P0 结束受保护树仍为 128 文件，SHA-256 与开始前一致；业务源码、测试、lockfile、schema/migration 和 prototype 无 P0 差异。
- 前端 package 的本轮允许差异仅为 `visual:capture`；截图 28/28，聚合 SHA-256 `b174901163f16301e51640ddb4e6e5bda1869e1721486f6ea419704e3d0f8b92`。
- 技术条件满足；用户已于 2026-07-14 人工确认 P0，P1 只允许先进入施工方案检查点，确认前不得实施。

## 工具链
- Node `v24.18.0`，pnpm `11.7.0`。

## 行为与视觉结果
- Playwright 列表为 7 个 spec、41 tests；全量 `41 passed (11.6s)`。
- 28 张截图全部生成并逐张抽查；桌面 248px、窄桌面 80px、移动底 tab、Login 独立布局均与当前契约一致。
- 静态主要命中：直接色阶 24、HEX/oklch 67、柔阴影 4、大圆角 8、渐变 6、inline style 4、confirm 1、localhost 14、class 状态三元 5。
