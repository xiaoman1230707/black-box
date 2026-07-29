# Black-box 生产部署运行手册

## 1. 文档边界

本文承接 `docs/design/07-production-deployment.md` 与 `docs/plans/07-production-deployment-implementation-plan.md`。当前系统已完成生产发布与真实链路验收；本手册用于短期作品展示环境的日常操作。命令出现不代表授权；数据库写入、AI费用、DNS/Vercel切流、cleanup apply、恢复和资源释放仍按实施计划独立确认。

文档只记录 `FRONTEND_HOST`、`API_HOST`、`RELEASE_SHA` 等受控参数，不记录真实公网IP、出口IP、私钥路径、密码、token、连接串或AI key。

## 2. SSH/DIRECT 管理入口

- 本机统一使用受控Host alias `black-box-ecs`，解析为`deploy`用户和TCP `2222`；TUN保持开启并使用已人工验证的专属DIRECT路径。
- UFW与云安全组只允许当前批准的管理出口IPv4 `/32`访问TCP `2222`。宿主兼容监听22不代表公网开放22。
- 出口变化或连接失败时先停止操作，核对DIRECT策略组出口、UFW和安全组是否仍一致；不得自动放宽为`0.0.0.0/0`，不得修改密钥、root登录或密码认证。
- `deploy`不加入`docker`组；获批的特权操作使用已建立的sudo timestamp，agent不得读取、记录或传递密码，也不得引入`NOPASSWD`。
- 远程批次结束后关闭SSH/SFTP/SCP连接。连接能力不替代数据库、AI、DNS、Vercel、备份恢复或资源释放授权。

## 3. 本地发布制品

前置条件：工作树干净、HEAD等于已审核`RELEASE_SHA`、`CLAUDE.md`未进入提交、Docker Desktop使用linux容器并支持`linux/amd64`。

```powershell
$releaseDir = Join-Path $env:USERPROFILE 'Black-box-releases'
deploy/production/scripts/build-image.ps1 `
  -ReleaseSha $env:RELEASE_SHA `
  -OutputDir $releaseDir
```

归档、SHA-256和manifest必须放在仓库外。构建后复核架构`amd64`、用户`10001:10001`、`/app`、OCI revision、Node healthcheck、四个编译脚本、完整migration和10个demo fixture。制品不一致不得上传。

Vercel构建也必须来自同一`RELEASE_SHA`。Production注入`VITE_API_BASE_URL=https://API_HOST/api`；Preview固定`https://api.invalid/api`，不得访问生产API。

## 4. ECS目录与secret

以下路径是固定部署契约：

- `/srv/black-box/postgres`：PostgreSQL bind mount。
- `/srv/black-box/uploads`：上传文件bind mount，归UID/GID 10001写入。
- `/srv/black-box/releases`：镜像归档和非敏感release文件。
- `/srv/black-box/backups`：服务器端配对备份。
- `/etc/black-box/runtime.env`、`database.env`、`demo-seed.env`、`embedding.env`、`ai-preflight.env`、`postgres.env`：`root:root 0600`，仅由用户按服务职责注入真实值。常驻API不持有`DEMO_USER_PASSWORD`；一次性工具不得复用完整runtime env。

`release.env`只含镜像、SHA、绝对持久目录和loopback端口，不含secret。任何校验只用`docker compose config --quiet`；禁止输出展开配置、`docker inspect`环境数组或shell tracing。

## 5. Compose启动与数据库初始化

默认`up`只允许常驻db/api；所有一次性任务都必须显式指定`--profile tools`并逐项授权。首次初始化顺序固定：

1. 启动`db`并通过`pg_isready`。
2. 独立授权并运行`migrate`。
3. 通过`migrate status`，再启动`api`并用`GET /api/posts?page=1&limit=1`验证Prisma readiness。
4. 确认仍为空库、未开放写入，独立授权`seed-games`。
5. 核对5个游戏，独立授权`rebuild-tags`。
6. 创建seed前数据库/uploads配对备份，独立授权`seed-demo`。
7. 完成AI地区、协议和1536维预检后，独立授权`embedding-backfill`，不带`--all`。

任一步失败立即停止。不得运行`migrate dev`、`db push`、`seed:demo:full`或把一次性服务加入默认`up`。已有生产库禁止执行上述seed序列。

## 6. Nginx、证书与边缘验证

首次证书签发使用Certbot standalone，签发期间Nginx不引用尚不存在的证书。证书存在后才以`API_HOST`渲染`black-box.conf.template`并运行`nginx -t`。公网仅开放80/443；管理入口仅为批准来源到2222。3000只绑定宿主loopback，5432不发布。

验证顺序：HTTPS和证书链、HTTP到HTTPS跳转、精确CORS、上传6MB边界、真实客户端IP、按IP限流、`/uploads`、Chat的`x-vercel-ai-data-stream:v1`与`0:/8:/d:`。Nginx必须对Chat关闭buffer/cache/gzip，任何首token集中到响应末尾的现象都阻塞发布。

## 7. 分层验证

```bash
export RELEASE_SHA='<audited-release-sha>'
export RELEASE_ENV_FILE=/etc/black-box/release.env
export COMPOSE_FILE=/srv/black-box/compose/${RELEASE_SHA}/compose.yaml
/srv/black-box/compose/${RELEASE_SHA}/scripts/verify-stack.sh base
```

`base`只验证PostgreSQL readiness、Nest liveness、Prisma readiness与uploads权限，不调用AI。`authenticated-sse`需要单独AI授权和短期JWT，只验证data-stream头与完成标记，不输出token或响应正文。

## 8. 配对备份与恢复

运行`backup-pair.sh`前建立停写窗口，注入已审核`API_IMAGE_DIGEST`，并确认仓库外、uploads外的绝对备份目录。脚本先确认migrate/seed/embedding等写入型tools均未运行，再停止API；同名complete或`.incomplete`目录存在即拒绝。manifest必须记录release SHA、镜像digest、已应用migration、数据库与uploads归档绝对路径、大小和SHA-256。成功或失败后API都保持停止，等待人工核验和显式重启授权；失败目录保留`.incomplete`，不得声称完整备份。

恢复只在隔离Compose project、隔离数据库目录、隔离uploads目录和非生产端口演练。数据库与uploads必须来自同一manifest；禁止只恢复一侧。恢复演练通过前，备份不能作为唯一发布回滚依据。

## 9. 发布与回滚

Production切流前记录后端image/archive digest、基础镜像index与linux/amd64 manifest、migration状态、配对备份SHA、Vercel source SHA/deployment ID/immutable URL/alias及双方回滚目标。前后端source SHA不一致即阻塞。

应用回滚使用上一已验收镜像和上一Vercel deployment；涉及数据语义的回滚先停写并恢复匹配的数据库/uploads备份。禁止覆盖旧release、旧镜像或历史恢复点来制造回滚目标。

## 10. 日常启动、停止与日志

```bash
export RELEASE_SHA='<audited-release-sha>'
export COMPOSE_FILE=/srv/black-box/compose/${RELEASE_SHA}/compose.yaml
export RELEASE_ENV_FILE=/etc/black-box/release.env

# 查看常驻服务，不展开env
sudo docker compose --env-file "$RELEASE_ENV_FILE" -f "$COMPOSE_FILE" ps

# 启动常驻db与api；不得带tools profile
sudo docker compose --env-file "$RELEASE_ENV_FILE" -f "$COMPOSE_FILE" up -d db api

# 紧急停写：只停止api，保留db
sudo docker compose --env-file "$RELEASE_ENV_FILE" -f "$COMPOSE_FILE" stop -t 10 api

# 恢复api
sudo docker compose --env-file "$RELEASE_ENV_FILE" -f "$COMPOSE_FILE" up -d api
```

每次启动后分别核对：db `healthy`、API `healthy`、`GET /api` liveness、`GET /api/posts?page=1&limit=1` Prisma readiness、宿主仅`127.0.0.1:3000`监听。日志仅按服务和时间窗口读取，输出前脱敏；不得导出容器env。Docker使用`json-file`，单文件10MiB、最多3份；宿主journal与Nginx日志同时受磁盘阈值约束。

## 11. 证书、告警与费用

- Certbot使用standalone续期钩子临时停止/恢复Nginx。每次配置变更先运行`nginx -t`；周期性执行`certbot renew --dry-run`，并在证书剩余30天与14天时告警。
- 监控阈值：CPU连续5分钟不低于80%；内存不低于85%；根磁盘70%预警、85%严重；API liveness、Prisma readiness或db readiness连续两次失败告警；Nginx 5xx在5分钟窗口出现即人工核查。
- 云监控基础CPU/网络指标可直接使用；精确内存和文件系统指标依赖CloudMonitor主机监控agent。agent、告警联系人和规则均须在阿里云控制台核验，不能用UFW或本机脚本替代控制面证据。
- 费用按控制台真实账单为准。试用估算仅用于提醒：额度达到50%、75%、90%时人工核对；同时清点ECS、系统盘/数据盘、快照、EIP、公网出流量、域名、Vercel、AI供应商和可选异机备份存储。
- 责任：用户持有云账号、联系人、账单、DNS、Vercel与供应商凭据；执行agent按获批批次采集技术证据，不保存secret；验收方确认告警可达和费用资源清单。

## 12. 故障处置

- **API不可用：** 先核对db，再核对API容器身份、health、exit/OOM/restart和最近日志；不得先重启数据库。API可优雅停止后只重启同一已审核release。
- **AI不可用：** 保留普通业务；Search必须有限失败并可重试，Chat检索可降级为无引用对话。不得自动更换模型、供应商、endpoint或降低1536维校验。
- **上传异常：** 先停止API，核对uploads owner/mode、空间与数据库File引用；不得手工删除。`maintenance:uploads`先执行dry-run，apply仍需独立授权和配对备份。
- **数据库异常：** 立即停API与写工具，保存容器/日志/目录现场；不得自动重跑migration、seed、restore或清库。恢复必须使用同一manifest的database与uploads并先在隔离环境演练。
- **磁盘或内存越线：** 停止seed、embedding、压缩等重任务；不得用prune、模糊删除或新增付费资源临时掩盖问题。
- **管理出口变化：** 保持现有会话或Workbench防锁死，先新增新来源精确`/32`并验证新会话，再删除旧规则；云安全组与UFW最终均只保留一个批准来源到2222。

## 13. Secret轮换

数据库密码、JWT secret、DeepSeek key、embedding key由用户在交互终端或云控制台注入，禁止经聊天、日志、Git或展开Compose输出传递。轮换顺序为：建立配对恢复点、更新对应最小env、重启唯一消费服务、执行有限健康验证、撤销旧凭据。数据库密码轮换还需同步PostgreSQL角色和database env，属于独立数据库写入批次。

## 14. 最终下线书面演练

1. 宣布停写窗口，停止API和所有tools，保留db。
2. 创建最终database/uploads配对备份；完成远端SHA、dump/tar可读性、manifest和仓库外本地副本验证。
3. 记录最终release pair、数据库计数、uploads清单、证书和DNS现状。
4. 先移除或停用Vercel Production别名与前端DNS，再移除API DNS；保留回滚窗口时不得提前释放恢复点。
5. 分别授权并释放ECS、独立云盘、快照、EIP和可选备份存储；停止实例不等于释放资源。
6. 撤销SSH key、云端访问凭据、Vercel/GitHub集成和AI key；保留本地恢复资料的访问控制。
7. 在24小时和72小时后分别复核账单与资源列表，确认无持续计费项后才关闭运维记录。

本批只演练和记录上述步骤，不实际下线或释放任何资源。
