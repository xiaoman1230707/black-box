# F3完整回归停止报告

> 状态：暂停，未完成F3，不具备暂存或commit条件
> 日期：2026-07-22
> 停止点：后端全量Jest

## 1. 已执行顺序

1. 使用不可连接的进程级数据库URL、密码学随机JWT和`.invalid`外部服务地址构造非敏感测试环境；未创建env文件，未连接数据库或AI。
2. `prisma generate`成功。
3. 启动后端全量Jest；该门禁失败后立即停止。

## 2. 失败结果

```text
Test Suites: 1 failed, 17 passed, 18 total
Tests:       80 passed, 80 total
```

唯一失败suite：`src/scripts/demo-seed-files.spec.ts`。失败发生在suite加载阶段，两个既有fixture断言尚未执行：

```text
Could not load the "sharp" module using the win32-x64 runtime
ERR_DLOPEN_FAILED: An Application Control policy has blocked this file.
```

被系统策略阻止的是已安装Sharp包中的win32-x64原生模块。其余17个suite与80个已加载断言全部通过，包括F1新增Prisma生命周期测试。

## 3. 客观判断

- 错误由Windows Application Control在原生模块加载阶段返回，不是Jest断言失败。
- Prisma generate已成功，故不是Prisma生成物缺失。
- 未修改package/lockfile，不能通过重装、换版本或跳过suite规避门禁。
- 依照“任何门禁失败立即停止”，本轮不自行修改系统策略、依赖、测试或发布基线。

## 4. 未执行项

- 后端build与lint。
- F1两轮容器SIGTERM。
- backup fixture与D1部署脚本门禁。
- 前端unit、build及9 files/51 Playwright。
- 两端全量lint、最终差分审查与两组暂存。

## 5. 保护终态

- AGENTS、`CLAUDE.md`、后端package/lockfile哈希与F3开始前一致。
- Prisma schema/migrations、前端源码和既有e2e无diff。
- 暂存区为空；没有commit、候选SHA、Docker或ECS/生产操作。
- F1/F2差异保持原样，F3暂停，F4未授权。

## 6. Linux替代门禁首次执行记录

用户随后批准不修改Windows Application Control，改用隔离linux/amd64 Docker作为权威替代门禁。当前Dockerfile build stage已成功构建唯一临时测试镜像：

```text
image: black-box-api-f3-test:20260722
identity: sha256:4ed252e4b53f8250476409c4d497f56a7cbe3df23ddd846372da2e92e84b55cf
platform: linux/amd64
```

首次测试容器尚未进入Sharp加载或Jest：PowerShell到容器shell的嵌套引号使`node -e`没有收到脚本参数，Node输出`-e requires an argument`并以9退出。该记录是测试命令构造失败，不是Linux suite或产品断言失败，也不提供任何通过证据。

依照失败即停约束，没有自动改写命令重试。失败容器由`--rm`精确清理，临时镜像保留；后续F3门禁和两组暂存均未执行。
