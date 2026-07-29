# F6.2 Docker容器漂移只读诊断报告

> 状态：容器身份已明确；根因是F6.2前置审计口径错误，不是F6.1后的生产容器漂移；等待恢复决策

## 1. 诊断范围与停止记录

本批只执行Docker容器`inspect`及只读时间线采集，不执行任何Docker/Compose写命令，也不连接数据库或读取secret。

- 第一次采集确认容器总数为2，但因远端Docker模板不支持`trimPrefix`而停止。
- 用户再次授权后，第二次采集完整取得两个容器的身份与状态；随后Docker events模板中的`.ID`字段不兼容而停止，daemon journal未执行。
- 两次失败原始证据均保留；没有自动发起第三次连接。events与daemon journal的操作者级时间线因此记为“未取得”，不作推断。

## 2. 完整容器清单

### 2.1 旧候选API

- 完整容器ID：`ef39a5a08a0d0a39f6500c4259f4c066e46c482e031a5eb1fe1f223316020a7b`。
- 名称：`black-box-api-1`。
- 创建时间：`2026-07-22T04:44:40.136346924Z`。
- 镜像：旧候选`black-box-api:6e182d477da82a74a0a447bfc7e1f1d77aa4faed`；镜像ID为`sha256:642f6ffee0a488046876df3f056234e9136c36df34efbc8347c30acc1559e2f9`。
- Compose标签：project=`black-box`，service=`api`，oneoff=`False`，container-number=`1`。
- 状态：`exited`，停止态health=`unhealthy`，exit code=`137`，OOMKilled=`false`，RestartCount=`0`。
- 启动时间：`2026-07-22T04:52:41.967558906Z`；停止时间：`2026-07-22T04:53:52.395161556Z`。

该身份和时间与D4.4已登记的旧候选API停止超时、exit 137、非OOM、保留现场完全一致。它在F6.1之前已经存在且停止，不是F6.1之后新增或重新运行的容器，也不是one-off tool或migrate残留。

### 2.2 生产数据库

- 完整容器ID：`0ee1bc4ca2870deaa8ac35bce336e2e994010436c84af3b6bd31f42040ad3958`。
- 名称：`black-box-db-1`。
- 创建时间：`2026-07-22T03:49:41.635347639Z`。
- 镜像：固定PostgreSQL 16 digest；镜像ID为`sha256:92620daddcd947f8d5ab5ba66e848702fe443d87fed30c4cea8e389fd78dfc55`。
- Compose标签：project=`black-box`，service=`db`，oneoff=`False`，container-number=`1`。
- 状态：`running`、`healthy`，exit code=`0`，OOMKilled=`false`，RestartCount=`0`。
- 启动时间：`2026-07-22T03:49:41.733366189Z`，没有停止时间。

它仍是D4/F6.1中同一个生产db容器，身份、运行状态、健康状态、OOM与restart均未漂移。

## 3. 与F6.1终态对照

F6.1的实际契约是：

- **运行中的服务仅为db**；
- db healthy；
- `migrate --rm`残留为0；
- API未运行。

当前证据仍全部满足该契约。F6.2前置脚本额外使用`docker ps -a`并断言“全部容器对象总数必须为1”，把已知且按要求保留的D4.4旧API停止现场错误视为漂移。因此根因是F6.2新增了未经设计支持的严格总数断言，而不是生产状态变化。

## 4. 恢复建议

无需清理旧API容器，也不应把它当作异常生产进程。F6.2恢复时应将前置门禁收敛为：

1. 运行中Compose service精确为`db`；
2. db完整容器ID仍为本报告记录值，且healthy、OOM=false、restart=0；
3. 唯一额外容器必须精确为本报告记录的旧候选API，保持exited 137、OOM=false、restart=0、oneoff=False；
4. 不存在migrate或其他tool、其他project及未知容器；
5. F6.2不得启动、删除或改变上述两个既有容器。

该修正是审计口径纠正，不是容器清理或生产状态修改。恢复上传仍需用户明确决定。
