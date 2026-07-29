# F4本地发布制品重建停止与恢复报告

> 日期：2026-07-22
> 状态：历史暂停证据；两次环境夹具问题均已按独立授权恢复，F4最终结果见`f4-local-artifact-rebuild-report.md`

## 1. 固定身份与隔离现场

- `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`。
- 已在仓库外创建全新detached worktree，HEAD精确等于固定SHA，初始Git状态clean。
- 主工作树暂存区保持为空；AGENTS与`CLAUDE.md`保护哈希未变化。
- Docker Desktop仅为本地F4验证启动，未修改全局配置。

## 2. 已通过的前置项

- 后端与前端依赖均按各自lockfile完成`pnpm install --frozen-lockfile`，未修改package或lockfile。
- 唯一临时linux/amd64 build-stage测试镜像构建成功；该镜像明确不是正式候选，也没有正式release revision。
- Dockerfile build阶段的后端build成功。
- 无网络容器内`prisma generate`成功。
- Sharp 0.35.1以`linux-x64`原生模块实际加载成功。

## 3. 停止原因

第一次Jest命令使用`pnpm test -- --runInBand`，Jest 30把`--runInBand`解释为文件模式，结果为`No tests found`；没有suite或断言执行。保留该命令构造失败记录后，改用`pnpm exec jest --runInBand`执行权威门禁。

权威门禁结果：

- 18 suites被发现；17 suites通过，1 suite在加载阶段失败。
- 80个已执行tests全部通过；失败suite未执行其断言，因此没有达到要求的18 suites / 82 tests。
- 唯一失败为`src/ai/ai.controller.spec.ts`加载时触发运行环境校验。
- 本批注入的隔离测试`TOKEN_SECRET`虽然长度足够，但包含环境校验器禁止的常见弱占位词，因而被拒绝。
- 该结果是测试夹具环境值不符合生产校验契约，不是Windows Application Control、Sharp加载、业务断言或数据库连接失败。

根据F4“任一测试门禁失败立即停止”的约束，本批未自动换值重跑。

## 4. 未执行与保留现场

- 未执行前端unit/build/Playwright、差分lint、D1完整部署脚本复验。
- 未构建正式linux/amd64候选镜像，未生成正式archive、build manifest、deployment bundle或`SHA256SUMS`。
- 未进入两轮正式镜像SIGTERM测试。
- 未进入F5、未连接ECS、未访问AI、未写数据库、未提交Git。
- 仓库外detached worktree、唯一临时测试镜像及本地证据目录保留，等待独立恢复授权；未执行Docker prune。

## 5. 恢复边界

恢复时只需在同一临时测试镜像中，以不包含弱占位词且满足强度校验的随机测试`TOKEN_SECRET`重新执行一次完整Linux Jest。不得重建临时镜像、不得修改环境校验器或测试断言。只有恢复到18 suites / 82 tests后，才可继续F4剩余门禁。

## 6. Linux Jest恢复结果

- 经独立恢复授权，复用同一临时linux/amd64镜像，只在当前进程中生成并注入一次48字节密码学随机值的hex编码。
- 随机值未回显、未落盘、未写入QA或Git。
- 唯一重跑结果为18 suites / 82 tests全部通过；`demo-seed-files.spec.ts`明确执行并通过。
- Sharp 0.35.1随后再次以`linux-x64`实际加载成功。
- 原17/18结果保留为测试夹具密钥不符合既有强校验的首次失败，不表述为首次全量通过。

## 7. 后续已通过门禁

- 前端Vitest：16 files / 53 tests通过。
- 前端build：2460 modules transformed，成功。
- Playwright列表：9 files / 51 tests；全量51 passed。
- AI preflight离线测试：8 passed。
- build-image路径测试：2 passed。
- Compose最小权限策略：7 service policies passed。
- Git object/直接archive LF契约：3 shell files通过。

## 8. 第二次停止原因

Backup fixture通过未限定实现名的`bash`启动时，本机解析到Windows内置WSL launcher。WSL执行期间脚本收敛PATH后，`backup-pair.test.sh`第143行无法找到Node，因而在manifest断言阶段以非零退出；没有得到要求的8项fixture完整结果。

只读定位确认：

- 当前默认`bash`为Windows System32的WSL入口。
- 本机Git for Windows的`bin/bash.exe`与`usr/bin/bash.exe`均存在。
- 失败发生在测试执行环境选择，不是backup生产脚本安全断言失败。

按失败即停契约，没有自动切换Git Bash重跑。后端lint、前端lint、正式镜像、正式SIGTERM及制品生成均未继续。

## 9. 第二次恢复边界

恢复时应在同一detached worktree明确使用Git for Windows Bash，仅重跑一次Backup 8项fixture及尚未执行的Shell语法门禁；不得修改脚本、测试或系统WSL配置。若仍不能得到8 passed，立即停止。通过后才可继续lint和正式候选制品步骤。
