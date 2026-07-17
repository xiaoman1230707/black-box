# 第四期 P0：范围冻结与行为/视觉基线

## 目标
执行 `docs/plans/04-phase4-implementation-plan.md` 的 P0.1～P0.5，建立可复现的工作树、41 条 Playwright 行为、7 页四视口截图和静态残留基线；不进入 P1。

## 阶段
- [completed] 1. 恢复会话、读取执行 skill、复核 P0 计划与白名单
- [completed] 2. 修正组件类型、环境校验 profile、seed 事务/文件补偿三项计划勘误
- [completed] 3. P0.1 冻结 Git、工具链和受保护业务树指纹
- [completed] 4. P0.2 核对并运行 41 条 Playwright 行为基线
- [completed] 5. P0.3 生成并抽查 7 页 × 4 视口截图
- [completed] 6. P0.4 建立静态残留台账
- [completed] 7. P0.5 复核证据、更新计划 checkbox，并于 2026-07-14 获用户人工确认

## 白名单
- `docs/plans/04-phase4-implementation-plan.md`
- `.planning/`
- `docs/qa/phase4/`
- `frontend/black_box/scripts/capture-phase4-screenshots.mjs`
- `frontend/black_box/package.json`（仅增加 `visual:capture`）

## 禁止项
- 不修改业务源码、运行配置、依赖、lockfile、schema/migration、既有测试或原型。
- 不执行 reset、checkout、clean、stash、删除或覆盖既有未提交改动。
- 不读取或记录 `.env` 值；不调用真实 AI；不进入 P1；不提交 Git。

## 错误记录
| 时间 | 问题 | 处理 |
|---|---|---|
| 2026-07-14 | `update_plan` 返回值不含预期 `plan` 字段，展示脚本读取失败 | 重新调用并不读取返回结构；未产生文件改动 |
| 2026-07-14 | 初次计算受保护树指纹使用当前 PowerShell/.NET 不支持的 `Path.GetRelativePath` | 改为基于工作区绝对前缀截取相对路径；首次命令未写文件 |
| 2026-07-14 | 沙箱内 pnpm 无权访问用户级 store，`--list` 首次报 Playwright shim 不可用 | 核对 `.bin`/lock 后，经授权在沙箱外运行同一命令；列表和 41 条全量均通过，未安装依赖 |
| 2026-07-14 | 首个 confirm/alert 复合正则含未启用 PCRE2 的负向断言，错误得到 0 | 改用明确的 `window\.(confirm|alert)` 正则，确认 PostDetail 有 1 个 confirm |
| 2026-07-14 | 首次 PNG 像素抽样的 PowerShell 数组表达式类型错误 | 改为显式整数坐标；命令只读，截图未改变 |
| 2026-07-14 | 首次 P0.5 组合复核命令的 `foreach` 缺少空格，PowerShell 解析失败 | 修正语法后重新完整执行；失败命令未运行任何子步骤、未写文件 |
| 2026-07-14 | 首次最终机械校验命令再次出现 PowerShell `foreach` 空格解析错误 | 修正后整套校验退出 0；失败命令在解析阶段终止、未执行子步骤 |
