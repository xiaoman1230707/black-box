# D4.6 / DB-4 `seed-demo` 施工方案与只读预检

> 状态：方案与生产只读预检已人工验收通过；唯一`seed-demo`已执行并通过自动核验，当前待DB-4用户人工验收
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 范围与停点

本门禁只规划全新作品展示生产库的演示数据初始化。DB-4 必须与 embedding、AI preflight、cleanup、restore、migration 和 B3 分离；本轮不运行 `seed-demo`，不写数据库或 uploads。

B2 `post-DB3 / pre-demo` 已完成远端与仓库外本地副本验证并获用户人工验收，是 DB-4 唯一批准的前置配对恢复点。若 DB-4 失败，不自动恢复 B2、不清库、不重跑；恢复必须取得新的 DB/R 授权。

## 2. 真实入口与最小权限

- 编译后入口：`node dist/src/scripts/seed-demo-posts.js`。
- Compose service：`seed-demo`，仅使用 `database.env` 与 `demo-seed.env`。
- 网络：仅加入内部 `db_net`，不加入外网网络，不具备 AI/embedding 出站能力。
- 文件系统：只读根文件系统和 `/tmp` tmpfs；唯一业务写 mount 为生产 uploads。
- 运行策略：`profiles: [tools]`、`restart: "no"`、无端口、`--rm --no-deps -T`；不得随常驻 `up` 自动执行。
- `demo-seed.env` 仅包含 `DEMO_USER_PASSWORD`；校验只输出存在性和强度 PASS/FAIL，不输出值、长度或片段。

取得独立 DB + uploads 写入授权后，唯一允许调用一次的命令为：

```text
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T seed-demo
```

执行前独立记录 Docker event 游标；执行后独立取得退出码、有限 stdout 摘要、one-off create/start/die/destroy 事件和只读终态，不把后续编排放入可能被 Compose 消耗的 stdin。

## 3. Manifest 与写入边界

### 3.1 固定演示集合

五名作者：星海攻略组、爱睡觉的旅人、夜之城电台、海拉鲁工坊、提瓦特观察员。

Manifest 固定包含 35 篇标题唯一的帖子，每个游戏 7 篇：黑神话：悟空、原神、艾尔登法环、塞尔达传说：王国之泪、赛博朋克2077。每个游戏都覆盖资讯、攻略、求助、评测、活动五类内容。

全局内容类型分布为：资讯 6、攻略 10、求助 5、评测 8、活动 6。作者帖子分布为：星海攻略组 10、爱睡觉的旅人 12、夜之城电台 4、海拉鲁工坊 5、提瓦特观察员 4。

### 3.2 定向替换语义

- 作者以唯一 `User.name` upsert；命中时只更新演示密码。
- 仅删除 manifest 中“作者 + 标题”精确匹配的旧演示帖子。
- File 仅按 10 个 fixture `originalname` 与 manifest 作者 ID 定向删除。
- 不扫描、删除或替换 manifest 之外的用户、帖子、评论、点赞、File 或媒体。
- 生产 pre-demo 基线要求除 5 Game、5 Tag 外其余业务表为空；若出现非 manifest 用户内容，视为数据漂移并停止。

### 3.3 数据库与文件边界

固定顺序：

1. 校验 manifest、5 Game、5 Tag、10 个 1600x900 JPEG fixture 和 uploads 可写契约。
2. 生成或复用批准的 10 张原图与 10 张 400x225 缩略图，并记录本次实际新建的精确路径。
3. 进入单个 Prisma transaction，定向替换 manifest 数据并创建帖子、标签关系、File、评论和点赞。
4. 任一步失败时，仅逆序删除本次新建文件；运行前已存在文件不得删除。
5. 补偿删除任一失败时，输出精确残留路径并以非零退出；不得声称完全回滚。

Prisma transaction 只保证数据库原子性，不能覆盖 uploads。文件先于 transaction 创建，因此“数据库已回滚但文件补偿失败”是必须显式报告的失败终态。

## 4. 写入前只读矩阵

正式调用前必须重新全部通过：

| 对象 | 必须成立的 pre-demo 状态 |
| --- | --- |
| 发布身份 | FIX SHA、API image ID、OCI revision 与已验收制品一致 |
| 服务 | API stopped；运行中 Compose service 精确只有原 db，running + healthy、OOM=false、restart=0 |
| migration | 3 total / 3 finished / 0 failed / 0 rolled-back / 0 pending |
| 目录数据 | Game=5、Tag=5，名称集合与批准值精确一致且唯一 |
| 演示目标表 | User/Post/PostTag/Comment/UserLikePost/File/Avatar 均为 0 |
| embedding | Post 为 0，非空 `titleEmbedding` 计数为 0；本批禁止任何 AI 调用 |
| uploads | 0 文件 / 0 字节；目录 `10001:10001 0750`，与镜像运行用户和 mount 契约一致 |
| B2 | 远端正式 B2 与仓库外本地副本四项大小/SHA、内部清单、dump/tar 和 manifest 均可读 |
| env | `demo-seed.env` 存在、`root:root 0600`，必需变量存在且强度通过；不输出值 |
| 镜像内容 | seed 入口、manifest、file helper、10 fixtures 齐全；fixture 尺寸/SHA 与 FIX 镜像契约一致 |
| Compose | seed-demo 仅获 database + demo seed env + uploads，只有 db_net，无外网、端口或其他 secret |
| 主机资源 | MemAvailable >= 512 MiB；SwapFree >= 1 GiB；磁盘可用 >= 10 GiB；无 failed unit |
| 容器 | 无 migrate/seed/embedding/cleanup/其他 one-off 或未知容器 |

任一项不成立即停止，不创建 tool、不调整权限、不清理数据、不放宽网络。

## 5. 成功验收矩阵

| 对象 | DB-4 成功终态 |
| --- | --- |
| migration | 3 条完成，状态不变 |
| Game / Tag | 5 / 5，批准集合与唯一性不变 |
| User | 5，姓名精确等于 manifest 作者集合 |
| Post | 35；标题唯一 35；作者+标题唯一 35；正文非空；每游戏 7 篇 |
| PostTag | 35；每帖精确 1 个标签；五类内容均覆盖，分布为 6/10/5/8/6 |
| Comment | 13 |
| UserLikePost | 31，联合唯一性成立 |
| File | 10；每条对应一张 manifest 原图，1600x900，metadata 标识 phase4 seed/imageKey |
| Avatar | 0 |
| embedding | 35 篇全部为 null；非空计数 0 |
| uploads | 20 文件、404899 bytes：10 张 1600x900 原图 + 10 张 400x225 缩略图 |
| 媒体一致性 | 20 个固定相对路径逐项核对尺寸、大小和 SHA-256；File 原图与对应缩略图一一存在 |
| tool | 唯一 seed-demo one-off exit 0 并销毁；无其他 tool 残留 |
| 服务 | API 继续 stopped；原 db running + healthy、OOM=false、restart=0 |
| 网络/主机 | 不新增监听，无异常 Swap 增长、OOM、137 或 failed unit |

生产验收使用 FIX 镜像在 F5 隔离 source 已生成并核对的 20 个媒体 SHA 作为预期字节基线；任一文件不同即停止，不以“图片可打开”替代逐文件一致性。

## 6. 失败停止与恢复

- 正式 Compose 命令最多调用一次；非零、超时、容器异常、数据矩阵或媒体矩阵不符均立即停止。
- 保留 tool 日志、Docker event、数据库只读快照、uploads 精确清单和补偿报告；不自动删除 one-off 之外的现场。
- 不自动重跑、补写、清表、模糊删除文件或 restore B2。
- 若数据库 transaction 失败且文件补偿成功，仍需人工验收失败现场后决定是否重试或恢复。
- 若补偿失败，精确残留路径是下一次 R/DB 决策的输入；禁止通配符清理。
- 若数据库提交成功但验收矩阵不符，保持 API 停止并等待新决策，不自动恢复。
- B3 只可在 DB-4 成功并获用户人工验收后另立授权创建；本门禁不包含 B3。

## 7. 本轮允许与禁止

本轮允许：方案、源码/镜像契约核对、生产只读查询、B2 正式与本地副本复核、已获准远端 deploy 导出副本的精确清理、文档回填。

本轮禁止：运行 `seed-demo`、创建 seed one-off、数据库/uploads 写入、migration、embedding、AI preflight、cleanup、restore、B3、API 启动、Nginx/证书/DNS/Vercel/网络变更、Git 暂存或提交。

## 8. 生产只读预检实测

### 8.1 B2关闭与传输接缝清理

- 仓库外本地B2副本再次通过四项固定大小/SHA、内部清单、98行dump清单和空uploads tar验证。
- 远端正式B2四项与批准记录一致；deploy导出四项与正式B2逐字节一致后，严格按四个固定路径分别删除，再以`rmdir`删除空目录。未使用通配符或递归删除。
- 清理后deploy导出目录不存在；正式B2继续存在且未修改。本地成功副本与历史失败目录均保留。

### 8.2 身份、服务与数据库

- FIX API image ID、amd64、`10001:10001`、`/app`及容器OCI revision匹配；PostgreSQL镜像ID匹配固定digest。
- 生产API为FIX镜像停止现场，`exit 0`、OOM=false、restart=0；原db容器ID不变，running + healthy、OOM=false、restart=0。
- 运行中Compose service精确只有`db`；终态容器集合只有既有`api|False`和`db|False`，无tool、one-off或未知容器。
- 只读事务返回：migration `3/3/0/0`；Game=5、Tag=5且批准集合精确匹配、无重复；User/Post/PostTag/Comment/UserLikePost/File/Avatar全部为0；embedding非空计数0。
- uploads为`10001:10001 0750`，无文件；`du`仅反映空目录自身块占用，不计为业务媒体。

### 8.3 env、Compose与镜像内容

- `demo-seed.env`为`root:root 0600`；`DEMO_USER_PASSWORD`精确出现一次并通过不回显的最低长度检查。强密钥/占位值完整校验已在D4.2执行，本批文件身份未变。
- 带tools profile的Compose静态解析通过；源码和已验收bundle共同锁定seed-demo只使用database/demo-seed env、uploads与`db_net`，无egress、端口或其他secret。
- 以FIX镜像运行5个无网络、只读、`--rm`审计容器：三个编译模块存在；10个fixture的大小和SHA与F4/F5固定基线全部一致。F4已锁定其格式为JPEG、尺寸为1600x900；本批相同镜像ID证明该字节契约未变。
- 审计容器全部销毁，没有转化为seed tool，也未挂载生产数据库或uploads。

### 8.4 资源与安全终态

- `MemAvailable=1110532 kB`，高于512 MiB。
- `SwapFree=2093796 kB`，高于1 GiB。
- `/srv/black-box`文件系统可用`30792122368 bytes`，高于10 GiB。
- Docker/containerd active，Nginx inactive；failed units为0，80/443/3000/5432无监听。
- 首次Docker格式化采集和一次终态SSH会话分别因引号口径、瞬时超时未形成完整证据，均为只读且未改变服务器；随后以离散命令有限补采通过。压缩脚本stdin执行在本地安全门禁被拒绝，未到达ECS。
- 收尾`sudo -K`退出0，负向`sudo -n true`退出1；本机面向`black-box-ecs`的SSH/SFTP/SCP进程为0。

## 9. 10个fixture固定输入

| fixture | bytes | SHA-256 |
| --- | ---: | --- |
| black-myth-boss.jpg | 48790 | `2840cab6e6c5734ca84b77aa59a010e9d5bee8e343d208f97274e516a907f007` |
| black-myth-temple.jpg | 47497 | `27cc4084353922710e8cbaff157397489e0dae4c0f837b475d9d64f47c2a1237` |
| cyberpunk-dogtown.jpg | 53393 | `d00baa8ce7910a4aa0fe812e1719ff8e0a8b720aa3dec488e138f2105f78e8f9` |
| cyberpunk-night-city.jpg | 46908 | `f0ed86bbfef20779f273c5d0c5563a718ed3bdbee9f2b5f4c437b8066eb1f857` |
| elden-malenia.jpg | 50012 | `0042b0e59b7637cc3d74e3bd5bec0b62ed537a1389c6a690dd8ce2bd7045c3b2` |
| elden-shadow.jpg | 38882 | `faeac6dd34a49c0eaf7808d9d6e44a2bfaf16a4634d1177b43cb2005081fcf05` |
| genshin-event.jpg | 59010 | `3a5609190bee6668a8faa5f5fe575bf64481d726b7e29b2dfbaf5f4b8ca88784` |
| genshin-fontaine.jpg | 63157 | `7532632e7a89eaa0236cdf52cebb2ee0435e636c5adc105e4b063f6512a02a92` |
| zelda-sky-island.jpg | 41942 | `1fca67e43ad44211234a4bc86565a7fc061546258d689483ce12dc1bfbff8077` |
| zelda-ultrahand.jpg | 45502 | `977e02a6d5a60f89b92ef2fb6347f36ccfc257e23d20938c98df66b5a3ca61a3` |

## 10. 当前门禁

用户已独立授权并完成唯一一次`seed-demo`数据库+uploads写入，且已人工验收通过；执行证据见`docs/qa/production-deployment/d4-db4-seed-demo-report.md`。B3、embedding、AI与其他生产动作仍分别禁止，D4.7-A仅进入AI-1方案与无费用只读预检。

## 11. 20个预期输出媒体

下表是相同FIX镜像在F5隔离source中生成并逐文件验证的字节基线。正式DB-4必须生成相同相对路径、尺寸、大小和SHA。

| 相对路径 | 尺寸 | bytes | SHA-256 |
| --- | --- | ---: | --- |
| `phase4-black-myth-boss.jpg` | 1600x900 | 34312 | `3bc146a12b3443226e9606239101e1a3ff4f84866ef810333a9a329d213ab786` |
| `phase4-black-myth-temple.jpg` | 1600x900 | 33362 | `5a56b38252a2fd7d2c2d1a811d80039bec856e37ecba3cb4eda71863f06f142f` |
| `phase4-cyberpunk-dogtown.jpg` | 1600x900 | 37286 | `8c49ba209d326f79e22d515a8d2e5b80a7f816c90405367f40f652632ca99871` |
| `phase4-cyberpunk-night-city.jpg` | 1600x900 | 33948 | `d1e88a7e9aaeac97caaf56d7ed1e6a924ab7d45c40ee12ac1575d827400b4a50` |
| `phase4-elden-malenia.jpg` | 1600x900 | 34952 | `e8ee44f34636ba23b4c60fb2a13633c8bf5dcc70cb822545f7e7f72f5bfc33e3` |
| `phase4-elden-shadow.jpg` | 1600x900 | 27804 | `de0a2ee875b9336cfde428d90ba9525aebd6531ef6556702e0fdced625a576c3` |
| `phase4-genshin-event.jpg` | 1600x900 | 42141 | `893b6f8f7e9af929b8f3d2ad56499a685dcd31f0b9aa3598d36d33be1efa0490` |
| `phase4-genshin-fontaine.jpg` | 1600x900 | 44471 | `499fe65a061dfbbb571670657c5bad65b3759c0aae831b8e48152ceec8388c26` |
| `phase4-zelda-sky-island.jpg` | 1600x900 | 28685 | `bb424ccc19451cb40053e57c549d33d7f12aec94c5ca18f51859aa70620b8051` |
| `phase4-zelda-ultrahand.jpg` | 1600x900 | 31225 | `1c9bc661fa511ef7a37660211911e62131488f9fe603a71ed56acffa5e163592` |
| `resized/phase4-black-myth-boss-thumbnail.jpg` | 400x225 | 5466 | `b906f92a32964913c89905bbb2e7cc914eca6b2e8064e3b30d56934c3271d52c` |
| `resized/phase4-black-myth-temple-thumbnail.jpg` | 400x225 | 5461 | `18993932d9fcadab67b9158c14ff93e1b74b53265011758db5712b373245e544` |
| `resized/phase4-cyberpunk-dogtown-thumbnail.jpg` | 400x225 | 6545 | `e1e2bf635a493a4ddb918274fa6c6cdb80ec53ebc6f80853c0de9076fefe55f2` |
| `resized/phase4-cyberpunk-night-city-thumbnail.jpg` | 400x225 | 5827 | `025cd3cb10dceb0c16ad0263af749b38589f30e079754610b945e30d1d7e6139` |
| `resized/phase4-elden-malenia-thumbnail.jpg` | 400x225 | 5432 | `42c2bbb3d5d3009b21ede369a732e7d3c288c6c4eedb30b5075f861794bb2717` |
| `resized/phase4-elden-shadow-thumbnail.jpg` | 400x225 | 4632 | `f01b641b13b9202ef403389a409b34758a11c75f54a46c66f3c11f21b6435a7c` |
| `resized/phase4-genshin-event-thumbnail.jpg` | 400x225 | 6565 | `dbbb4f560f7ba7999ffaa4bd0d557eaf315212d7f0bb3902108f68681ec29869` |
| `resized/phase4-genshin-fontaine-thumbnail.jpg` | 400x225 | 6740 | `aa23451621eb8ec9730b5f737227fdd47a2f017429e73abc556d19db4138e4b2` |
| `resized/phase4-zelda-sky-island-thumbnail.jpg` | 400x225 | 4726 | `de24f947523dbcb762e3add81f8b7efef71a9ad6efc963e3fe10cc06cdf3e56c` |
| `resized/phase4-zelda-ultrahand-thumbnail.jpg` | 400x225 | 5319 | `3a31035474e4036041f2d5bd34d96908f4435e4e021373535c9c89288a725450` |
