# 四期后个人内容批次 O2 设计与实施计划

## 目标

以 `docs/design/06-post-phase4-personal-content.md` 为已确认设计，形成可按检查点执行的 O2.0～O2.5 实施计划；当前只写计划，不修改业务代码，也不自动开启第五期。

## 范围约束

- 本轮只修改 O2 设计状态、实施计划与 `.planning/post-phase4-personal-content/`。
- 不修改业务代码、测试、依赖、配置、数据库、原型、`AGENTS.md` 或 `CLAUDE.md`。
- 实施计划保持后端只读、前端共享列表、Mine 入口、人工验收、验收后 Playwright 五个责任边界。
- 不提交 Git。

## 设计阶段

- [complete] 1. 核对权威文档与 O1 终态
- [complete] 2. 核对 Mine、路由、共享组件与前端数据契约
- [complete] 3. 核对 Posts/Users/Likes/Prisma 的真实查询能力
- [complete] 4. 实测并记录 unit/Jest/Playwright 基线
- [complete] 5. 比较方案并完成 O2 权威详细设计
- [complete] 6. 自审范围、占位词、一致性与文件引用
- [complete] 7. 用户确认 06 设计

## 实施计划阶段

- [complete] 1. 将 06 设计标记为“已确认，尚未实施”
- [complete] 2. 核对真实测试工具、lint 门禁、接口与组件契约
- [complete] 3. 编写 `docs/plans/06-post-phase4-personal-content-implementation-plan.md`
- [complete] 4. 自审 O2.0～O2.5 依赖、文件矩阵、命令和检查点
- [complete] 5. 用户确认 O2 实施计划

## O2.0 执行阶段

- [complete] 1. 冻结工作树、工具版本与受保护文件哈希
- [complete] 2. 运行前端 unit/build/lint 与 8 files / 46 Playwright
- [complete] 3. 运行后端 15 suites / 64 Jest、build 与无写入 lint 基线
- [complete] 4. 冻结接口/引用并生成七页四视口 28 张截图
- [complete] 5. 回填 QA、计划与进度
- [complete] 6. 用户确认 O2.0 基线

## O2.1 执行阶段

- [complete] 1. RED：新增 service/controller 测试并确认因功能缺失失败
- [complete] 2. GREEN：实现分页 DTO、共享映射与 mine/liked 静态路由
- [complete] 3. REFACTOR：保持公共列表语义并消除重复
- [complete] 4. 运行 Jest、build、差分 lint 与受保护范围核对
- [complete] 5. 回填证据
- [complete] 6. 用户确认 O2.1

## O2.2 执行阶段

- [complete] 1. RED：新增 API、分页纯逻辑与 SSR 状态测试并确认因功能缺失失败
- [complete] 2. GREEN：实现类型、API、共享列表、薄页面与受保护路由
- [complete] 3. REFACTOR：复核去重、竞态、重复请求与错误状态边界
- [complete] 4. 运行 unit、定向 lint、build、8 files / 46 Playwright 与禁改范围核对
- [complete] 5. 回填 O2.2 QA 与 planning
- [complete] 6. 用户确认 O2.2

## O2.3 执行阶段

- [complete] 1. RED：新增 Mine 入口聚焦测试并确认因入口缺失失败
- [complete] 2. GREEN：仅在 Mine 增加两个语义 Link 入口
- [complete] 3. REFACTOR：复核头像 Drawer、Loading、反馈与退出控制流未变
- [complete] 4. 运行定向/全量 unit、build、差分 lint、8 files / 46 Playwright
- [complete] 5. 回填 O2.3 QA 与 planning
- [complete] 6. 用户确认 O2.3

## O2.4 执行阶段

- [complete] 1. 运行前后端全量自动矩阵与现有 8 files / 46 Playwright
- [complete] 2. 生成 Mine/MyPosts/MyLikes 四视口默认态与专项状态截图
- [complete] 3. 串验入口、分页、详情、取消点赞一致性、守卫与回归链路
- [complete] 4. 生成并复核 65 个受保护文件 after SHA-256
- [complete] 5. 回填“已实施，待人工验收”
- [complete] 6. 用户人工确认 O2.4 后才进入 O2.5

## O2.5 执行阶段

- [complete] 1. 新增独立 `personal-content.spec.ts` 五条稳定行为用例
- [complete] 2. 运行增量与全量 Playwright，达到 9 files / 51 passed
- [complete] 3. 运行前后端最终 unit/Jest、build、差分 lint 与补丁门禁
- [complete] 4. 复核 65 个受保护文件 SHA-256，尤其 `CLAUDE.md`
- [complete] 5. 回填 foundation、06 设计、QA 与 planning 终态并关闭 O2

## 实施计划固定结构

- O2.0：范围冻结、`CLAUDE.md`/禁改文件 SHA-256 与自动基线。
- O2.1：后端两条 JWT 只读接口、共享分页映射与 Jest。
- O2.2：前端专用 API、共享列表、薄页面、路由与 Vitest。
- O2.3：Mine 两个真实入口及现有头像/退出回归。
- O2.4：全量回归、四视口截图、人工串验与用户验收门禁。
- O2.5：用户人工确认后新增 5 条 Playwright，终态 9 files / 51 passed。

## 当前完成条件

- 06 设计状态为“已实现、已人工验收通过”，O2.0～O2.5 全部完成。
- 前端终态为 16 files / 53 unit、9 files / 51 Playwright；后端终态为 17 suites / 74 Jest，前后端 build 成功。
- O2 新增/修改文件满足差分 lint 门禁；前端全量仅保留已登记历史 3 errors / 0 warnings。
- 65 个受保护文件 SHA-256 为 0 mismatch，`CLAUDE.md` 用户改动未被编辑或覆盖。
- O2 已关闭；未提交 Git，未自动进入第五期。

## 错误记录

| 错误 | 处理 |
|---|---|
| PowerShell 默认输出曾把 UTF-8 中文显示为乱码 | 后续读取显式使用 `Get-Content -Encoding utf8`；文件本身编码正常 |
