# D4.5-B / DB-3 `rebuild-tags`执行报告

> 状态：已实施并于2026-07-23人工验收通过
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 执行边界

- 正式 Compose `rebuild-tags` 命令实际调用 **1 次**，未自动重跑。
- 命令通过独立 SSH 调用执行，没有把后续编排放入会被 Compose 消耗的 stdin。
- 本批未执行 migration、seed-games、seed-demo、embedding、AI、cleanup、restore 或 B2。
- API 在执行前后均保持停止；原 PostgreSQL 容器保持 running + healthy。

## 2. 唯一写入结果

- 开始时间：`2026-07-23T05:26:59Z`。
- 结束时间：`2026-07-23T05:27:04Z`。
- 退出码：`0`。
- stdout 报告生成五条标签：`资讯`、`攻略`、`求助`、`评测`、`活动`。
- Docker 历史事件证明只有一个 `project=black-box`、`service=rebuild-tags`、`oneoff=True` 的容器，事件链为 `create → attach → start → die(exitCode=0) → destroy`。

事件查询第一次使用了当前 Docker event 对象不支持的 `.ID` 模板字段并只读失败；未发生任何远端写入。保留该证据后改用 `.Actor.ID` 查询同一固定历史窗口，完整事件链通过。该问题属于审计脚本字段口径，不是 tool 或数据库失败。

## 3. 写后数据矩阵

| 对象 | 终态 |
| --- | --- |
| migration | `3 total / 3 finished / 0 rolled-back / 0 unfinished` |
| Game | 5 条，批准集合及描述不变，名称唯一 |
| Tag | 精确 5 条：资讯、攻略、求助、评测、活动；名称唯一 |
| PostTag | 0 |
| Post / User / Comment / UserLikePost / Avatar / File | 全部 0 |
| uploads | 0 文件 / 0 字节 |
| pre-DB2 恢复点 | 远端既有文件与 SHA 未变化 |

## 4. 服务、资源与主机终态

- API：停止。
- db：原容器 running + healthy，`OOM=false`、`restart=0`。
- tool：无 one-off 或其他工具容器残留。
- 受保护端口：80、443、3000、5432 无监听。
- failed units：0。
- `MemAvailable=1112784 kB`，`SwapFree=2094564 kB`，磁盘可用 `30828490752 bytes`。

## 5. 当前停点

DB-3 已实施并完成人工验收。用户随后独立授权创建B2 `post-DB3 / pre-demo`配对恢复点；该授权不包含`seed-demo`或其他后续生产写入。
