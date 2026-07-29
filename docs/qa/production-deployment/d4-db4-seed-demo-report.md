# D4.6 / DB-4 `seed-demo` 执行报告

> 状态：已实施并人工验收通过
> 固定发布身份：`FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 执行边界

- 用户已人工验收通过DB-4方案与只读预检，并独立授权一次数据库+uploads写入。
- 正式Compose `seed-demo`命令实际调用 **1次**；一旦事件出现create/start后没有再次调用。
- 未执行migration、seed-games、rebuild-tags、embedding、AI preflight、cleanup、restore或B3。
- API在执行前后均保持停止；原PostgreSQL容器持续running + healthy。

## 2. 写入前门禁

- FIX API与PostgreSQL镜像身份无漂移；API stopped，运行中Compose service精确只有db。
- migration为`3/3/0/0`；Game=5、Tag=5；User/Post/PostTag/Comment/UserLikePost/File/Avatar和embedding均为0。
- uploads为`10001:10001 0750`且无文件；远端正式B2和仓库外本地B2副本均通过固定大小/SHA与归档可读性复核。
- `demo-seed.env`为`root:root 0600`，变量唯一并通过不回显的最低强度校验；tools profile Compose静态解析通过。
- FIX镜像中的seed入口、manifest、file helper和10个fixture重新核对通过；fixture SHA与批准基线一致。
- 写入前资源：`MemAvailable=1108692 kB`、`SwapFree=2093796 kB`、磁盘可用`30792065024 bytes`，均高于门禁；failed units和受保护端口监听为0。
- 首次综合SSH在认证banner阶段超时，未建立远端会话、未创建one-off或写入；按获批规则有限重试后完整前置门禁通过。

## 3. 唯一正式调用

唯一命令：

```text
sudo -n docker compose \
  --env-file /etc/black-box/release.env \
  -f /srv/black-box/compose/72350a77acf59ad179b9a89b19544c162033e0ae/compose.yaml \
  --profile tools run --rm --no-deps -T seed-demo
```

- 事件游标：`2026-07-23T07:35:36Z`。
- 命令退出码：`0`。
- stdout摘要：用户5、帖子35、评论13、点赞31、图片10；定向替换旧帖子0、旧File记录0；title embedding保持为空。
- 唯一one-off身份：`project=black-box`、`service=seed-demo`、`oneoff=True`、FIX镜像与OCI revision匹配。
- Docker事件链：`create → attach → start → die(exitCode=0) → destroy`，执行时长约1秒。
- 首次事件查询的结束时间仍在未来，查询等待至本地工具超时；该操作只读。使用已结束的固定UTC窗口补采同一事件链后通过，没有第二次seed调用。

## 4. 数据库终态

| 对象 | 实测结果 |
| --- | --- |
| migration | `3 total / 3 finished / 0 rolled-back / 0 unfinished` |
| Game / Tag | 5 / 5，批准集合不变 |
| User | 5 |
| Post | 35；distinct title=35；distinct(author,title)=35；空正文=0 |
| Post按游戏 | 5个游戏各7篇 |
| PostTag | 35；每帖最小/最大均为1；异常帖子0 |
| Tag分布 | 资讯6、攻略10、求助5、评测8、活动6 |
| 作者分布 | 星海攻略组10、爱睡觉的旅人12、夜之城电台4、海拉鲁工坊5、提瓦特观察员4 |
| Comment | 13 |
| UserLikePost | 31；联合重复0 |
| File | 10；10条均为1600x900 JPEG，filename/originalname各自唯一 |
| Avatar | 0 |
| titleEmbedding | 非空计数0 |

## 5. uploads终态

- 文件数：20。
- 总大小：404899 bytes。
- 10张原图均为JPEG 1600x900；10张缩略图均为JPEG 400x225。
- 20个相对路径、单文件大小和SHA-256逐项等于`d4-db4-seed-demo-plan.md`第11节固定基线，无缺失或额外文件。
- 脚本未报告补偿或残留路径；本次是正常提交终态。

## 6. 服务、资源与恢复点

- 终态容器集合仍只有既有FIX API停止现场和原db；无seed-demo或其他one-off残留。
- API：exited 0、OOM=false、restart=0，继续停止。
- db：running + healthy、OOM=false、restart=0，镜像身份不变。
- B2 database/uploads SHA在写后复核仍与pre-demo批准值一致；B2未修改。
- 写后资源：`MemAvailable=1117980 kB`、`SwapFree=2093540 kB`、磁盘可用`30791340032 bytes`。
- 80/443/3000/5432无监听，failed units为0。
- 写后终态SSH首次在认证banner阶段超时，未执行远端命令；有限重试后只读终态通过，没有重复任何写入。
- 收尾`sudo -K`退出0，负向`sudo -n true`退出1；本机面向ECS的SSH/SFTP/SCP进程为0。

## 7. 当前门禁

DB-4已唯一执行并人工验收通过。终态为5 User、35 Post、35 PostTag、13 Comment、31 Like、10 File、20媒体、0 embedding；B2有效，API继续停止，db保持healthy。该验收不自动授权B3、AI preflight、embedding、API启动或其他生产写入。
