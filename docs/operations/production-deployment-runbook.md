# Black-box 生产部署运行手册

## 1. 文档边界

本文承接 `docs/design/07-production-deployment.md` 与 `docs/plans/07-production-deployment-implementation-plan.md`。命令出现不代表授权；ECS连接、主机写入、migration、每个seed、embedding、真实AI预检、DNS、Vercel Production、cleanup apply、备份下载和资源释放均按实施计划单独确认。

文档只记录 `FRONTEND_HOST`、`API_HOST`、`RELEASE_SHA` 等受控参数，不记录真实公网IP、出口IP、私钥路径、密码、token、连接串或AI key。

## 2. SSH/DIRECT 握手

每次SSH、SCP、SFTP、rsync-over-SSH或重连前，先向用户申请当次S授权。只有用户明确回复“已确认 SSH 直连规则生效，TUN 保持开启，可以连接”后才可连接。连接失败立即暂停并核对本地专属DIRECT规则，不自动关闭TUN，不修改安全组、密钥或sshd。每组远程操作结束后关闭连接并通知用户“本轮 SSH 操作完成，连接已关闭”。

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

首次证书签发使用Certbot standalone，签发期间Nginx不引用尚不存在的证书。证书存在后才以`API_HOST`渲染`black-box.conf.template`并运行`nginx -t`。安全组只开放22、80、443；3000只绑定宿主loopback，5432不发布。

验证顺序：HTTPS和证书链、HTTP到HTTPS跳转、精确CORS、上传6MB边界、真实客户端IP、按IP限流、`/uploads`、Chat的`x-vercel-ai-data-stream:v1`与`0:/8:/d:`。Nginx必须对Chat关闭buffer/cache/gzip，任何首token集中到响应末尾的现象都阻塞发布。

## 7. 分层验证

```bash
RELEASE_ENV_FILE=/srv/black-box/current/release.env \
COMPOSE_FILE=/srv/black-box/current/compose.yaml \
deploy/production/scripts/verify-stack.sh base
```

`base`只验证PostgreSQL readiness、Nest liveness、Prisma readiness与uploads权限，不调用AI。`authenticated-sse`需要单独AI授权和短期JWT，只验证data-stream头与完成标记，不输出token或响应正文。

## 8. 配对备份与恢复

运行`backup-pair.sh`前建立停写窗口，注入已审核`API_IMAGE_DIGEST`，并确认仓库外、uploads外的绝对备份目录。脚本先确认migrate/seed/embedding等写入型tools均未运行，再停止API；同名complete或`.incomplete`目录存在即拒绝。manifest必须记录release SHA、镜像digest、已应用migration、数据库与uploads归档绝对路径、大小和SHA-256。成功或失败后API都保持停止，等待人工核验和显式重启授权；失败目录保留`.incomplete`，不得声称完整备份。

恢复只在隔离Compose project、隔离数据库目录、隔离uploads目录和非生产端口演练。数据库与uploads必须来自同一manifest；禁止只恢复一侧。恢复演练通过前，备份不能作为唯一发布回滚依据。

## 9. 发布、回滚与下线

Production切流前记录后端image/archive digest、基础镜像index与linux/amd64 manifest、migration状态、配对备份SHA、Vercel source SHA/deployment ID/immutable URL/alias及双方回滚目标。前后端source SHA不一致即阻塞。

应用回滚使用上一已验收镜像和上一Vercel deployment；涉及数据语义的回滚先停写并恢复匹配的数据库/uploads备份。最终下线按“停写、最终配对备份、本地下载与可读验证、DNS/Vercel处理、释放ECS及独立磁盘/快照/EIP、撤销凭据、24/72小时账单复核”逐项授权，不因停止ECS就声称费用已终止。
