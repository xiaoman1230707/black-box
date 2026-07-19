# 第四期维护说明

## 1. 安全原则

- 维护命令只由人工在确认环境后运行，不挂到应用启动或请求链路。
- 执行任何删除、演示 seed 或全量 embedding 前，先备份数据库和 `uploads/`。
- cleanup 默认 dry-run；`--apply` 与真实 seed/full 均是独立人工门禁。
- 不在日志、报告或命令历史中输出数据库密码、JWT secret 或 AI key。

## 2. 备份与恢复

在维护窗口创建带时间戳的独立目录。数据库使用与 PostgreSQL 版本匹配的 `pg_dump` 自定义格式；`uploads/` 使用能保留目录层级的归档工具。示意命令中的路径和连接串必须替换为部署环境安全值：

```powershell
pg_dump --format=custom --file .\backups\black-box-before-maintenance.dump $env:DATABASE_URL
tar -czf .\backups\black-box-uploads-before-maintenance.tar.gz -C . uploads
```

备份完成后记录文件大小和 SHA-256，并在副本数据库/临时目录演练恢复。恢复时先停止应用写入：

```powershell
pg_restore --clean --if-exists --dbname $env:DATABASE_URL .\backups\black-box-before-maintenance.dump
tar -xzf .\backups\black-box-uploads-before-maintenance.tar.gz -C .
```

数据库与文件必须来自同一维护点。Prisma transaction 不能回滚文件系统，代码回滚也不能代替备份恢复。

## 3. 上传文件清理

从 `backend/backend/posts/` 运行：

```powershell
pnpm maintenance:uploads
pnpm maintenance:uploads -- --protect-hours=48
```

dry-run 报告 referenced、orphan、protected、missing、symlink、unknown、unsafe-record 和 control 分类，不修改数据库或磁盘。审核路径、保护期、备份和报告后，才可另行授权：

```powershell
pnpm maintenance:uploads -- --apply --backup-confirmed --protect-hours=24
```

安全边界：只扫描当前项目 `uploads/`；不跟随 symlink/junction；只识别已知头像/帖子派生组；控制文件和未知文件不删除；DB 有记录但磁盘缺失只报告。apply 单文件失败会继续处理并最终非零，不能把部分成功描述成完整成功。恢复使用维护前同一时点的 DB 与 uploads 备份。

## 4. 演示 seed

默认只在开发或专用演示数据库执行，已有生产数据库禁止运行。`seed:demo` 需要 `DATABASE_URL` 与 `DEMO_USER_PASSWORD`，不需要 AI key：

```powershell
pnpm seed:demo
```

manifest 固定 5 名演示作者、35 帖、评论/点赞/viewCount 与 10 张图片。清理键严格为“manifest 作者+标题”和“演示作者+fixture originalname”，不会删除演示作者名下未列入 manifest 的帖子。game/tag 按名字查真实 ID。

图片先从仓库 fixture 生成确定性原图/thumbnail：运行前已存在的输出只复用、不覆盖；仅本次新建路径进入补偿集合。随后数据库写入位于 interactive Prisma transaction。失败时数据库回滚并删除本次新图片；补偿失败会逐项报告残留并非零退出，此时必须人工核对并从备份恢复，不能声称完全回滚。

### 4.1 全新作品展示生产库的窄例外

仅当生产库是本次首次部署创建、尚无用户数据、尚未开放写入且已有空库/空 uploads 恢复点时，允许按生产部署门禁逐项执行一次：

1. `node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma`
2. `node dist/src/scripts/seed-games.js`
3. `node dist/src/scripts/rebuild-tags.js`
4. `node dist/src/scripts/seed-demo-posts.js`
5. `node dist/src/scripts/backfill-embeddings.js`

每一步都需要独立数据库写入授权；第4步另需文件写入授权，第5步另需外部AI费用授权。任一步非零立即停止，不自动重试或继续下一步。embedding 对全新库只补 null，不带 `--all`。该例外不适用于已有生产库、恢复后的生产库或已开放写入的数据库，也不得挂入 Compose 默认启动、容器入口或自动发布流程。

## 5. Embedding 回填与组合命令

补缺或换模型全量重建：

```powershell
pnpm embedding:backfill
pnpm embedding:backfill -- --all
```

该命令需要 OpenAI-compatible key/base URL，使用 `text-embedding-3-small` 默认模型，会产生外部调用和费用。单帖失败允许继续，让其保持 null 供重跑；只要有一条失败，最终退出码即非零。

完整演示初始化：

```powershell
pnpm seed:demo:full
```

组合命令严格先 seed、后 `--all` 回填；任一步失败即停止/非零。首次与第二次执行前后分别记录演示作者、帖子、评论、点赞、File 数量；两次应一致，35 帖正文非空、10 张图及缩略图存在、所有标题 embedding 非 null。随后人工抽验 Home、Search、Chat 引用和 PostDetail。真实执行仍需单独授权，因为它会写数据库、文件并调用外部服务。

## 6. 维护后检查

1. 对比维护前后 DB 计数、uploads 文件清单与 checksum。
2. 启动后端并验证 Home/PostDetail 图片 URL 使用 `PUBLIC_BASE_URL`。
3. 验证 Search 可命中演示标题、Chat 引用可点击、评论/点赞计数稳定。
4. 发现异常立即停止写入，保留失败日志和残留路径，从同一维护点备份恢复。
