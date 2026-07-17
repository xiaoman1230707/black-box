# 第四期实施主计划编写

## 目标
在不修改业务代码、配置、依赖、数据库、测试或原型的前提下，修正第四期文档的 3 处状态残留，并创建 `docs/plans/04-phase4-implementation-plan.md`，将已确认设计拆成可独立实施、评审和验收的 P0～P6 任务。

## 阶段
- [completed] 1. 恢复会话并核对附件、AGENTS、设计与调研记录
- [completed] 2. 定向核对真实文件、脚本、依赖与测试组织
- [completed] 3. 修正 3 处状态同步残留并检查文档一致性
- [completed] 4. 编写 P0～P6 实施主计划
- [completed] 5. 自审范围、路径、契约、命令、验收映射和占位词
- [completed] 6. 交付报告并停止，不进入 P0

## 边界
- 只允许修改设计/规划文档：`docs/design/04-phase4-visual-polish.md`、`docs/plans/04-phase4-implementation-plan.md` 和 `.planning/` 记录。
- 不修改业务代码、配置、依赖、数据库 schema/migration、测试或原型，不安装依赖。
- 不提交 Git，不执行 P0，不开始视觉迁移。
- 不回滚或覆盖工作树中前三期未提交修改。

## 错误记录
| 错误 | 处理 |
|---|---|
| 首次读取附件时 PowerShell 默认编码导致中文乱码 | 改用 `Get-Content -Encoding UTF8`，已获得完整要求 |
