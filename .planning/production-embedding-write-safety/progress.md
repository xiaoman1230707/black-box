# 生产 embedding 写入安全修复进度

## 2026-07-23

- 已执行会话恢复并核对工作树；暂存区为空，历史脏工作树保持不变。
- 已读取07、08、D4.7-B、DB-4、B2、AI-1及F4/F5发布证据。
- 已审计`backfill-embeddings.ts`、`ai-timeout.ts`、`EmbeddingService`、`PostsService.create()`、Compose和SDK本地实现。
- 已确认两条持久化路径、两项安全缺口及当前生产零写入状态。
- 已形成`docs/design/09-production-embedding-write-safety.md`与`docs/plans/09-production-embedding-write-safety-implementation-plan.md`。
- 当前停在09设计与实施计划人工评审门禁；未修改运行代码、未连接ECS、未调用AI、未提交Git。

## E0

- 用户已人工确认09设计与实施计划，并授权连续执行E0～E2。
- HEAD、工作树、暂存区、工具版本、受保护哈希、两条写入面和生产35 null/0 non-null基线已冻结。
- 现有embedding/timeout聚焦测试为2 suites / 6 tests通过。
- 首次pnpm执行入口因受限store权限未启动测试；改用仓库现有Jest二进制通过，未修改依赖。

## E1～E2

- 先新增共享安全契约、runner与两条持久化路径测试；初始RED包括缺失模块、缺失custom fetch和非法向量未拒绝。
- 聚焦GREEN：4 suites / 23 tests通过；触及TS文件lint为0 errors / 0 warnings。
- Linux/amd64 build-stage成功完成Prisma generate与Nest build；Windows本地build因当前node_modules缺少已锁定模块而失败，未修改依赖或lockfile。
- 无外网容器矩阵最终5/5通过：body卡住、错误维度、非number、合法1536和部分成功。首次两轮失败证据分别保留为请求deadline竞态与mock encoding fixture问题。
- E2临时容器残留为0，两个唯一临时镜像已精确删除，未执行Docker prune。
- AGENTS、CLAUDE、package、lockfile与schema哈希均与E0一致；暂存区为空，未连接ECS、未调用AI、未写生产数据库。
- 当前停在E0～E2人工验收门禁；未进入E3，未生成新候选SHA。

## 2026-07-27 加速上线

- 用户要求以尽快上线为优先，并授权继续D4；安全、数据完整性和回滚门禁保持不降级。
- session catchup因本机无可用Python解释器未运行；已直接读取active plan、task、findings、progress和Git现场恢复上下文。
- 前端本地unit/build受Windows Application Control及当前node_modules缺失影响未启动；本批前端零改动，沿用最近人工验收的16 files/53 unit、9 files/51 Playwright基线。全量lint仍为批准的3 errors/0 warnings。
- 后端linux/amd64完整Jest最终21 suites/102 tests通过；首次运行仅因新增测试错误读取Docker context外Compose文件而失败，修正为部署级MJS测试后复用同一镜像通过。
- 部署门禁通过：AI mock 8/8、backup fixture 8/8、Compose policy 7项、build-image 2项、LF 3个Shell、embedding容器矩阵6/6、触及lint 0/0。
- 并行Git测试产生零字节`.git/index.lock`；确认无Git进程后精确删除并串行重跑LF通过，未改变index内容。
- 创建两个提交：`f6f86687c13fe34e2dd74db4746bbc1e25bf1c06`与`b6b3d93866e390eb2e37bd52649fa2628403b1b4`；后者为当前RELEASE_SHA。
- 从仓库外detached clean worktree只构建一次正式linux/amd64镜像；正式镜像通过embedding矩阵6/6与SIGTERM两轮exit 0。
- 正式archive、manifest、Git object bundle和LF SHA256SUMS已生成于仓库外，未混入当前脏工作树。
- 首次恢复ECS连接在SSH banner前超时；未上传、未修改远端、未执行AI或数据库写入。等待用户通过Workbench恢复管理来源/通道。

## 2026-07-27 E6～E7生产恢复

- 用户恢复SSH并建立sudo缓存；按用户要求未执行`sudo -K`。
- 新候选四项制品经单次默认SFTP上传，Linux原始SHA全部通过；bundle经路径、symlink、LF、`bash -n`与敏感扫描后原子提升。
- 新镜像唯一导入并核对ID、amd64、10001:10001、OCI revision、入口、healthcheck、3 migrations、4脚本、10 fixtures与共享安全模块。
- 非secret release指针原子切换；新镜像唯一执行只读`prisma migrate status`，3 migrations up to date；生产零写入门禁确认35 null、0 non-null、20媒体与B2不变。
- 用户独立授权后，无参数backfill唯一执行一次、exit 0；35/35均为1536维有限数，其他数据和媒体无漂移，one-off无残留。
- 用户独立授权B3；远端配对恢复点与仓库外本地retry1副本均通过SHA、dump、tar和manifest验证。
- 新API启动并healthy，仅绑定loopback；Nest liveness、真实Prisma分页、db health、B3与最终数据矩阵通过。D4技术门禁完成，待用户人工验收。
