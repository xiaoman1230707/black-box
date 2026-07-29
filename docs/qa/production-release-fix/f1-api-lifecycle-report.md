# F1 API生命周期TDD与最小修复报告

> 状态：已实施并于2026-07-22通过用户人工验收
> 日期：2026-07-22
> 范围：仅API优雅停止、Prisma销毁钩子及对应测试；F2与生产操作未执行

## 1. 保护基线

- HEAD仍为旧候选`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`；该候选对应已迁移生产库，但不再具备发布资格。
- 生产三条migration、B0/B1、旧镜像与旧release未触碰；未连接ECS，未执行数据库、seed、AI、Nginx、DNS或Vercel操作。
- 暂存区为空，未提交Git。
- `CLAUDE.md` SHA-256保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。
- `package.json` SHA-256保持`64D20A7267B0953220ACB046BDFA8FC7BC140A28A12EFFE308A343B6A06D8DB5`；`pnpm-lock.yaml` SHA-256保持`4F493739DBBE284871262C3A002C874A8D932EF9A06ABFA17CAB660D2FEE92F4`。

## 2. TDD证据

### 2.1 Prisma RED

先新增可控Promise单测，再运行聚焦Jest。旧实现稳定失败：

```text
TypeError: service.onModuleDestroy is not a function
```

测试将`$disconnect()`替换为未完成Promise，并证明销毁Promise在显式resolve前不会完成，因此不仅检查调用次数，也锁定了await语义。

### 2.2 最小实现

- `main.ts`增加Nest官方：`app.enableShutdownHooks(['SIGTERM', 'SIGINT'], { useProcessExit: true })`。
- `PrismaService`实现`OnModuleDestroy`，其方法仅执行`await this.$disconnect()`。
- 未增加业务`process.on`、直接`process.exit`、超时强杀、重复`app.close()`，未修改Dockerfile或Compose。

### 2.3 Prisma GREEN

```text
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

## 3. 容器生命周期证据

### 3.1 旧候选RED

- 正式测试对旧候选在10秒停止窗口内失败，首要断言为`shutdown took 10217.9458ms`。
- 既有两轮根因证据继续作为完整RED：两轮均记录signal 15后signal 9、exit 137、`OOM=false`、restart 0。
- 按要求不重复无意义旧候选诊断。

### 3.2 新临时镜像GREEN

仅为F1验证构建一次linux/amd64临时镜像；revision使用测试哨兵，不冒充正式候选。连续两轮结果：

| 轮次 | 停止耗时 | Exit | Signal | SIGKILL | OOM | Restart | DB | 停止后HTTP |
| --- | ---: | ---: | --- | --- | --- | ---: | --- | --- |
| 1 | 219ms | 0 | 15 | 无 | false | 0 | healthy | 不可达 |
| 2 | 210ms | 0 | 15 | 无 | false | 0 | healthy | 不可达 |

测试终态：

```text
tests 1
pass 1
fail 0
```

测试未发布宿主端口，AI地址使用不可连接占位且未调用AI；数据库和API使用唯一前缀，finally精确删除容器、网络和临时uploads。临时镜像保留供人工审查，Docker Desktop已停止。

## 4. 聚焦门禁

| 门禁 | 结果 |
| --- | --- |
| Prisma聚焦Jest | 1 suite / 1 test passed |
| 触及TS文件ESLint | 0 errors / 0 warnings |
| `api-shutdown.test.mjs`语法检查 | 通过 |
| 后端build | 通过 |
| 禁止实现扫描 | 生产改动无业务signal handler、直接exit、强杀、重复close或Docker停止配置变更 |

沙箱内首次build因Windows对pnpm junction目标读取返回EPERM而失败；未修改依赖或lockfile。同一`pnpm build`在正常宿主权限下成功，故记录为执行环境限制，不是编译或依赖回归。

## 5. 文件边界

F1运行代码与测试差异仅为：

- `backend/backend/posts/src/main.ts`
- `backend/backend/posts/src/prisma/prisma.service.ts`
- `backend/backend/posts/src/prisma/prisma.service.spec.ts`
- `deploy/production/scripts/api-shutdown.test.mjs`

其余本次变化仅为08设计、实施计划、QA与planning状态回填。未修改依赖、lockfile、Prisma schema/migration、前端、既有e2e、AGENTS或`CLAUDE.md`。

## 6. 门禁结论

F1自动验证满足设计契约，并已通过用户人工验收。该结论只关闭F1，不构成新发布候选，也不授权F3、暂存或提交Git。
