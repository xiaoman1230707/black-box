# F3完整回归与提交前审查报告

> 状态：完整自动门禁通过，进入两组暂存审查；commit与F4未授权
> 日期：2026-07-22

## 1. 后端权威门禁

Windows全量Jest仍保留原始失败：Application Control阻止Sharp win32-x64原生模块加载，结果为17/18 suites加载、80个已加载断言通过。未修改或放宽系统策略。

经用户批准，权威替代门禁改在从当前Docker context与既有Dockerfile build stage构建的隔离linux/amd64镜像执行：

- 临时镜像：`black-box-api-f3-test:20260722`
- 镜像身份：`sha256:4ed252e4b53f8250476409c4d497f56a7cbe3df23ddd846372da2e92e84b55cf`
- 镜像未设置正式release revision，不是候选制品。
- Sharp 0.35.1实际加载`@img/sharp-linux-x64`原生模块及对应linux-x64 libvips。
- 后端Jest：18 suites / 82 tests全部通过，`demo-seed-files.spec.ts`明确执行且通过。
- 后端build：通过。
- F1触及TS文件ESLint：0 errors / 0 warnings。

首次两次Linux探测命令分别因跨shell引号丢失而在Jest前退出，均保留为命令构造失败证据；最终使用Base64环境变量传递探测脚本，没有修改镜像、代码、依赖或测试。

## 2. API生命周期

使用F1保留的非正式运行时镜像连续执行两轮：

| 轮次 | 停止耗时 | Exit | Signals | OOM | Restart | DB | 停止后HTTP |
| --- | ---: | ---: | --- | --- | ---: | --- | --- |
| 1 | 217ms | 0 | 15 | false | 0 | healthy | 不可达 |
| 2 | 210ms | 0 | 15 | false | 0 | healthy | 不可达 |

没有signal 9、exit137或自动重启。

## 3. 部署脚本门禁

| 门禁 | 结果 |
| --- | --- |
| Backup边界fixture | 8 passed |
| AI preflight mock | 8 passed |
| build-image路径 | 2 passed |
| Compose最小权限 | 7 service policies passed |
| Git object LF契约 | HEAD中3个Shell通过 |
| 当前Shell换行 | 3个Shell，CRLF 0 |
| MJS/Bash/PowerShell语法 | 全部通过 |
| secret值扫描 | 0命中 |
| 非预期公网IPv4扫描 | 0命中 |
| 禁止部署模式扫描 | 0命中 |

本机PowerShell默认ExecutionPolicy首次阻止签入测试脚本启动；使用项目既有的一次性`-ExecutionPolicy Bypass -File`子进程运行，未修改系统策略。ShellCheck未安装，未新增依赖；Bash语法、8个fixture、LF和静态扫描承担Shell差分门禁。

## 4. 前端回归

| 门禁 | 结果 |
| --- | --- |
| Vitest | 16 files / 53 tests passed |
| Build | 2460 modules transformed，成功 |
| Playwright list | 9 files / 51 tests |
| Playwright | 51 passed |

Build仅在独立进程显式注入本地测试API URL；unit与Playwright未继承该变量。

## 5. Lint差分

- 后端全量只读ESLint：825 errors / 6 warnings，不高于批准基线833/6；减少来自F1触及文件格式收敛。不表述为全仓lint通过。
- 前端全量只读ESLint：3 errors / 0 warnings，保持批准基线3/0；仅位于历史`badge.tsx`和`utils/index.ts`。
- F1触及TypeScript文件：0 errors / 0 warnings。
- F2 Shell：语法、LF、fixture和补丁格式均通过。

## 6. 保护与资源终态

- `git diff --check`通过。
- AGENTS、`CLAUDE.md`、两端package/lockfile、Prisma schema/migrations、前端源码与既有e2e共112个受保护文件，聚合SHA-256前后均为`E18C1887E81BF7A34F454CDDE29B316AD8BCCA99DB3054D0B3F2E50BEDDBACCE`。
- F3临时容器和网络均为0；未执行Docker prune。
- 保留linux build-stage测试镜像与F1运行时验证镜像，均为非正式临时证据；Docker Desktop已停止。
- 未连接ECS、生产数据库、AI、Nginx、DNS或Vercel；未生成`FIX_RELEASE_SHA`。

## 7. 提交边界

仅允许以下两组进入提交前暂存审查：

1. `fix(runtime): shut down API gracefully`：`main.ts`、`prisma.service.ts`、`prisma.service.spec.ts`、`api-shutdown.test.mjs`。
2. `fix(deploy): preserve backup path boundaries`：`backup-pair.sh`、`backup-pair.test.sh`。

08设计、计划、QA、planning、既有生产部署记录及历史脏工作树必须保持未暂存。未经逐项授权不得commit。

### 7.1 第一组cached diff

建议message：`fix(runtime): shut down API gracefully`

```text
backend/backend/posts/src/main.ts
backend/backend/posts/src/prisma/prisma.service.spec.ts
backend/backend/posts/src/prisma/prisma.service.ts
deploy/production/scripts/api-shutdown.test.mjs

4 files changed, 279 insertions(+), 9 deletions(-)
```

- `git diff --cached --check`：通过。
- secret/private-key模式扫描：0命中。
- 受保护文档、planning、AGENTS、`CLAUDE.md`：0暂存。

### 7.2 第二组cached diff

建议message：`fix(deploy): preserve backup path boundaries`

```text
deploy/production/scripts/backup-pair.sh
deploy/production/scripts/backup-pair.test.sh

2 files changed, 122 insertions(+), 7 deletions(-)
```

- `git diff --cached --check`：通过。
- secret/private-key模式扫描：0命中。
- 受保护文档、planning、AGENTS、`CLAUDE.md`：0暂存。

单个Git index不能同时表达两个独立commit。两组已依次真实暂存并审查；终态重新暂存第一组4文件，第二组2文件保持未暂存。第一组获准提交后，第二组必须再次使用上述精确pathspec暂存并核对，不能使用宽泛`git add`。
