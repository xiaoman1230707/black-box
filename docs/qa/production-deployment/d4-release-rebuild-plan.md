# D4 新候选制品链重建方案

> 日期：2026-07-21
> 状态：R0～R4已完成并经用户人工验收通过
> 旧失效候选：`38247ff057310e0f98125a0bbcafbfab2969877c`
> 待重建验证候选：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`

## 1. 目标与边界

本方案只负责从新commit重新建立可审计的发布制品链。新SHA当前仅证明发布源LF契约成立，不等于镜像、bundle、数据库恢复或ECS发布已经通过。完成所有本地门禁并经用户验收前，不恢复D4.1。

固定边界：

- 从仓库外、全新且不存在的detached worktree精确checkout新SHA；不得复制当前脏工作树文件。
- 保留旧D2 worktree、镜像、archive、数据库、uploads、备份及失败证据，不修改、不覆盖、不作为新候选输入。
- 保留ECS旧SHA release目录、失败staging和远端证据；新候选未来使用按新SHA隔离的release/compose路径与唯一staging nonce。
- 不使用旧API archive、旧build manifest、旧deployment bundle或旧`SHA256SUMS`拼装新候选。
- 本方案确认不授权Docker构建、数据库写入、AI调用、ECS连接、远端清理或D4.1。

## 2. R0：发布源与隔离基线

1. 复核HEAD精确等于新SHA，commit文件只含`.gitattributes`和LF契约测试，暂存区为空。
2. 记录`CLAUDE.md`及受保护文件SHA-256；当前用户改动不得stash、提交或复制进release worktree。
3. 在仓库外创建全新`REBUILD_ROOT`，至少拆分`release`、`artifacts`、`source`、`restore`、`backups`与`evidence`；每个路径创建前必须不存在。
4. 使用`git worktree add --detach <release> <新SHA>`；核对HEAD、clean status、lockfile和受保护文件。
5. 为source/restore选择未占用的两组loopback端口、独立Compose project、PostgreSQL、uploads与backup目录；不得复用旧D2名称、端口或bind mount。

失败停止：SHA、工作树清洁度、路径唯一性、端口或保护哈希任一不符即停止，不自动清理旧现场。

## 3. R1：必须重跑的 D1 发布门禁

以下D1门禁必须从新SHA重跑，因为它们直接约束发布源或构建输入：

- `line-ending-policy.test.ps1 -Treeish <新SHA>`：实际执行`git archive`并证明3个Shell的attributes、CRLF/bare CR、blob/bundle SHA一致。
- Compose policy 7项、AI preflight 8项、build-image路径2项、backup-pair 4项。
- bundle内JSON、PowerShell、Shell语法；Linux原生`bash -n`；entry清单、权限策略、symlink和secret/私钥/公网IPv4扫描。
- 后端`prisma generate → build → 17 suites/81`，前端16 files/53、build，Playwright 9 files/51。
- 前端lint不得高于3/0，后端lint不得高于833/6；只记录历史债，不借重建清理。
- package/lockfile、Prisma schema/migrations、既有e2e和业务源码相对新SHA不得产生修改。

D1的历史提交与证据不重写；新证据作为“新SHA重建复核”追加。失败返回发布源门禁，不连接ECS。

## 4. R2：新 SHA 镜像与本地制品

1. 从新release worktree执行一次`linux/amd64` Buildx构建，镜像tag和OCI revision均使用完整新SHA；不在2GiB ECS构建。
2. 运行现有`build-image.ps1`输出到全新artifacts目录；不得覆盖任何同名文件。
3. 核对镜像架构、ID/digest、非root `10001:10001`、`/app`、入口、healthcheck、Node与基础镜像digest。
4. 核对3个migration目录、4个初始化脚本、10个fixture及Prisma/OpenSSL/native module运行能力。
5. 导出新image archive与build manifest，记录绝对路径、大小和SHA-256；扫描secret和真实env。

旧镜像可以保留用于历史审计，但不得重新tag为新SHA或进入新manifest。出现OOM/137、持续Swap、磁盘越线或身份不一致立即停止，保留现场，不自动重建。

## 5. R3：必须重跑的 D2 source 链路

D2.0～D2.5全部重跑，原因是新镜像身份、Compose输入、备份和恢复证据都必须绑定同一新SHA：

1. 仅在source隔离库执行migration、seed-games、rebuild-tags、seed-demo；禁止embedding、AI preflight、Search与Chat。
2. 每步串行运行，记录退出码、容器资源、数据库计数、3条migration、媒体和sentinel；失败不自动重跑下一步。
3. 验证Nest liveness、PostgreSQL readiness及现有只读Prisma接口；PUBLIC_BASE_URL按source栈自身地址核对。
4. 生成source配对备份，manifest绑定新SHA、新image digest、migration清单、绝对路径、大小和SHA-256。
5. restore栈不得预跑migration/seed；直接恢复数据库与uploads，随后比较数据计数、migration、媒体SHA和sentinel，PUBLIC_BASE_URL按restore栈地址核对。
6. source与restore全程串行；结束后`compose down --remove-orphans`且不带`-v`，确认候选端口释放，保留全部现场供人工验收。

任一恢复差异使新候选保持“不合格”；不得用旧D2成功结果补齐新SHA证据。

## 6. R4：新 D4.0 本地发布制品

仅在新D1/D2人工验收后执行：

1. 从新SHA直接运行`git archive --format=tar.gz --output=<唯一.part> <新SHA> deploy/production`，通过后原子rename；不经过checkout/index export或中间源码目录。
2. 对bundle再次运行LF契约、Linux`bash -n`、文件/目录/symlink、Compose、secret与公网IPv4扫描。
3. 生成只包含新image archive、新build manifest和新bundle的transfer manifest。
4. `SHA256SUMS`必须以ASCII/UTF-8无BOM和LF写入；生成后检查CRLF为0，并在Linux兼容环境直接运行`sha256sum -c`，禁止运行时`sed`转码。
5. 证明image、manifest、bundle、SHA清单全部追溯至同一个新SHA；记录唯一文件名、大小和摘要。

完成后仍停在新的D4.0人工验收门禁。ECS主机新鲜只读基线与D4.1上传必须另行授权。

## 7. 旧 ECS 现场隔离与未来恢复条件

- 旧SHA release目录与失败staging保持只读保留；本地新制品不得使用旧路径或文件名。
- 远端清理是独立E授权，不能作为新候选重建的隐含步骤；未清理时通过SHA目录和唯一nonce隔离即可。
- 未来D4.1开始前必须同时满足：新D1通过、新D2通过、新D4.0本地制品通过、ECS新鲜只读门禁通过、代理出口未漂移、sudo门禁通过。
- 新D4.1只上传新SHA四项制品并逐项复算SHA；不得覆盖旧文件，不得从旧staging继续执行。
- 新bundle正式落地和镜像导入成功后，旧现场仍需用户另行决定保留期限与精确清理授权。

## 8. 计划完成条件

- 新SHA拥有完整且独立的D1、D2和D4.0证据链。
- Git blob、直接archive与Linux解包结果逐字节一致，所有Shell与SHA清单均为LF。
- 新镜像、数据库初始化、备份恢复和transfer manifest全部绑定新SHA。
- 旧候选与新候选无文件、目录、镜像tag、Compose project、数据库或备份混用。
- 用户人工确认后才可恢复D4.1；本方案本身不构成任何执行授权。

## 9. 实施状态

R0～R4已按新候选SHA完成本地隔离重建并经用户人工验收通过，详见`d4-release-rebuild-report.md`。source/restore已关闭且端口释放，镜像、archive、数据库、uploads、备份与D4.0制品现场保留。该结论只关闭新候选本地制品链，不授权ECS写入、真实AI、embedding、旧现场清理或D4.1。
