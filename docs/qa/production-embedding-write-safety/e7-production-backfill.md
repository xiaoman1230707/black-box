# E7 生产 embedding backfill 执行报告

> 日期：2026-07-27
> 状态：已实施并通过自动门禁，待用户人工验收

## 身份与授权

- `RELEASE_SHA`：`b6b3d93866e390eb2e37bd52649fa2628403b1b4`。
- API镜像ID：`sha256:75cf2f0867b7982dc3f64133d6f37bc8cf6d7d14918a7814d0ce038f678bdaab`。
- 用户独立授权最多35次302.AI embedding调用与合法向量生产写入。
- 正式命令无参数执行一次；未使用`--all`，未调用Search、Chat、seed、migration、cleanup或restore。

## 执行结果

- 命令次数：1；退出码：0；自动重跑：0。
- 写入前：35条null、0条non-null。
- 写入后：0条null、35条non-null。
- 35条向量全部为数组、精确1536维，全部元素为有限number。
- 其余矩阵保持：5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、5 Game、5 Tag、3 migrations。
- uploads保持20个文件、404899 bytes；B2保持可读。
- 唯一one-off结束后无工具容器残留；API保持停止，原db running+healthy，无OOM或restart。

## 历史与证据纪律

- 首次正式命令已执行成功，但SSH stdin方式导致命令后的摘要脚本文本被Compose消费；没有重跑backfill。
- 随后使用独立只读审计确认35/35、向量矩阵、Docker事件、媒体和服务终态。
- root-only运行日志不进入Git；QA未记录标题、prompt、响应、向量、key、真实endpoint或请求头。
