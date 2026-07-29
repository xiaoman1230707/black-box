# D4.7-A / AI-1 `ai-preflight` 执行报告

> 状态：已实施并人工验收通过
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`
> 安全边界：本文不记录key、真实endpoint、域名、公网IP、prompt、响应正文、向量或请求头

## 1. 授权与调用边界

- 用户已人工验收通过AI-1方案与无费用只读预检，并独立授权唯一一次正式`ai-preflight`。
- 正式Compose命令实际调用1次；one-off出现create/start后没有再次调用。
- 实际供应商请求为2次：DeepSeek最小流式chat 1次、302.AI最小embedding 1次。
- 未执行35帖embedding backfill、B3、数据库写入、API启动、cleanup、restore、Nginx、证书、DNS或Vercel。

## 2. 执行前门禁

- FIX Compose、`ai-preflight.mjs`、8项root-only env、供应商角色、模型和超时格式均通过身份检查。
- `ai-preflight`只接`ai-preflight.env`与egress网络；无DATABASE_URL、JWT、seed密码、uploads或db网络。
- API停止；运行中仅原db且healthy；无tools/one-off残留。
- DB-4保持5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、0 Avatar、0 embedding；20媒体共404899 bytes并逐项匹配固定SHA。
- 远端及仓库外本地B2均完整；主机资源高于既定阈值，failed units为0。
- 通用DNS/TLS通过；执行前供应商业务请求数为0。

事件游标记录为`2026-07-23T08:17:34Z`。同一游标命令中的Docker格式模板因引号错误未输出容器列表；该错误发生在正式one-off创建前，不执行Docker写入，容器身份由紧邻的完整前置门禁覆盖。

## 3. 唯一正式结果

| 检查 | 结果 |
| --- | --- |
| Compose命令调用次数 | 1 |
| 命令退出码 | 0 |
| DeepSeek请求 | 1次；流完整结束；`completed=true` |
| DeepSeek耗时 | 1578 ms |
| 302.AI embedding请求 | 1次；模型契约不变 |
| Embedding耗时 | 591 ms |
| Embedding维度 | 1536 |
| 有限值检查 | 全部为有限数 |
| 自动重试 | 0 |

stdout只包含上述完成状态、耗时、维度和有限值结果；未记录任何禁止字段。

## 4. Docker事件链

固定UTC窗口内只有一个`project=black-box / service=ai-preflight / oneoff=True`容器，镜像与OCI revision均属于FIX：

```text
create → attach → start → die(exitCode=0) → destroy
```

- 事件窗口没有第二个preflight容器。
- 没有signal 9、exit 137、OOM、restart或残留tool事件。
- 容器在成功退出后由`--rm`销毁。

首次events查询使用动态未来结束时间而等待至本地超时，仅为只读证据查询；改用固定UTC结束时间后取得同一完整事件链，没有重启preflight。

## 5. 执行后无漂移

- FIX、env和Compose最小权限继续PASS。
- API仍为stopped / exit 0；运行中仍精确只有原db，且running+healthy、OOM=false、restart=0；one-off残留0。
- 数据库仍为3 migration、5 Game、5 Tag、5 User、35 Post、35 PostTag、13 Comment、31 UserLikePost、10 File、0 Avatar、0 embedding。
- uploads仍为20个固定媒体、404899 bytes，逐文件路径、大小和SHA全部匹配。
- 远端B2固定四项SHA不变；仓库外本地副本再次通过四项SHA、内部清单、98行`pg_restore --list`和tar可读性。
- 写后资源为`MemAvailable=1089328 kB`、`SwapFree=2093028 kB`、磁盘可用`30791229440 bytes`、failed units=0。

## 6. 收尾与当前门禁

首次`sudo -K`连接超时且后续负向检查意外成功，证明该次清理未完成；没有据此修改sudoers。第二次幂等`sudo -K`退出0，随后`sudo -n true`退出1并提示需要认证，timestamp已明确清除。本机SSH/SFTP/SCP进程归零。

AI-1已实施并人工验收通过。该验收不自动授权D4.7-B、35帖embedding backfill、B3或其他生产动作；后续仍按独立门禁推进。
