# D4.5-A2 / DB-2 `seed-games`执行报告

> 状态：已实施并人工验收通过
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 授权与编号

用户已人工验收D4.5-A1方案/只读预检，并独立授权D4.5-A2仅执行一次DB-2 `seed-games`。D4.5-B继续专指DB-3 `rebuild-tags`，本批没有授权或执行B。

## 2. 写入前门禁

- FIX API与原db是仅有两个容器，均running+healthy、OOM=false、restart=0；API镜像与OCI revision匹配FIX SHA。
- pre-DB2恢复点的内部SHA、database dump和uploads归档重新验证通过。
- migration为3 total / 3 finished / 0 rolled-back / 0 unfinished；九张业务表均为0。
- uploads为0文件、0字节；无migrate、seed、embedding或cleanup写工具运行。
- MemAvailable `1046688 kB`、SwapFree `2094564 kB`、磁盘可用`30828593152 bytes`，满足既定阈值。

## 3. API停止与唯一写入

API使用Compose 10秒停止窗口优雅退出：status=exited、exit=0、OOM=false、restart=0。停止后运行中的Compose服务精确只有原db，API不可执行。

随后只调用一次已审查命令：

```text
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T seed-games
```

Docker events仅存在一组service=`seed-games`、oneoff=True的create → attach → start → die → destroy；die事件`exitCode=0`，镜像及OCI revision匹配FIX候选。destroy后不存在seed-games或其他one-off容器，证明实际执行次数精确为1且tool已删除。

执行编排脚本通过SSH stdin运行；`docker compose run`消费了后续脚本输入，导致外层未打印原计划中的`SEED_GAMES_EXIT`及seed stdout。按“不得重跑”约束没有再次调用seed；改用独立只读诊断取得Docker exit事件、数据库结果和终态。该异常不改写为首次证据采集完整成功。

## 4. 写后数据矩阵

| 对象 | 结果 |
| --- | --- |
| migration | 3 total / 3 finished / 0 rolled-back / 0 unfinished |
| Game | 5 |
| Game名称重复组 | 0 |
| Game非空cover | 0 |
| User | 0 |
| Post | 0 |
| Comment | 0 |
| Tag | 0 |
| PostTag | 0 |
| UserLikePost | 0 |
| Avatar | 0 |
| File | 0 |
| uploads | 0文件 / 0字节 |

游戏名称与描述按UTF-8 Base64集合精确比对，结果对应：

1. 黑神话:悟空 — 国产 3A 动作角色扮演,取材西游
2. 原神 — 开放世界冒险 RPG
3. 艾尔登法环 — 魂系开放世界动作 RPG
4. 塞尔达传说:王国之泪 — 开放世界冒险解谜
5. 赛博朋克2077 — 未来都市开放世界 RPG

## 5. 生产终态

- API保持exited 0，未重启；宿主3000关闭。
- 原db保持running+healthy、OOM=false、restart=0。
- 容器总数2：停止的API与运行中的db；running one-off为0。
- 80、443、3000、5432均无监听；failed units为0。
- 写后MemAvailable `1104892 kB`、SwapFree `2094564 kB`、磁盘可用`30828556288 bytes`。
- 未执行migration、rebuild-tags、seed-demo、embedding、AI、cleanup或restore；DB-3执行状态为false。

## 6. 证据采集异常

- 唯一写入编排使用stdin脚本，Compose run消费后续输入，未留下seed stdout及外层变量形式的退出码；Docker die事件提供不可变`exitCode=0`，数据库结果提供业务完成证据。未重跑seed。
- 第一次写后资源补采的本地引号转义破坏远端`awk`和Docker format，只取得磁盘与failed units部分结果；无写入。
- 第二次简化命令在本地PowerShell解析阶段失败，SSH未建立。
- 第三次使用ASCII Base64只读脚本完整取得资源、one-off与db health；没有修改生产状态。

用户已人工验收通过D4.5-A2。API按授权保持停止；下一门禁为D4.5-B / DB-3 `rebuild-tags`方案与只读预检，验收通过仍不构成数据库写入授权。
