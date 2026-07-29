# F4新SHA本地发布制品重建报告

> 日期：2026-07-22
> 状态：已完成，用户人工验收通过
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 隔离与发布身份

- 使用仓库外全新detached worktree，HEAD精确等于`FIX_RELEASE_SHA`，终态Git status clean。
- 没有复制当前脏工作树内容；主工作树HEAD保持同一SHA，Git index始终为空。
- AGENTS与`CLAUDE.md`保护哈希保持既定值，其他历史工作树内容未被清理、stash、覆盖或提交。
- 新旧候选使用独立worktree、镜像tag、artifact目录与审计目录；没有覆盖或清理旧制品。

## 2. 完整回归

### 2.1 后端权威门禁

- 后端依赖按lockfile安装，宿主与容器Prisma Client均显式generate；package/lockfile无变化。
- Windows Application Control历史限制没有修改或放宽；后端权威Jest继续在linux/amd64临时build-stage镜像执行。
- 首次权威运行因测试夹具`TOKEN_SECRET`包含弱占位词，结果为17/18 suites、80个已执行tests通过；该失败原样保留在停止报告中。
- 经独立恢复授权，在同一临时镜像中仅通过当前进程注入一次48字节密码学随机hex值；密钥未回显、落盘或写入证据。
- 恢复结果：18 suites / 82 tests全部通过，`demo-seed-files.spec.ts`明确执行并通过。
- Sharp 0.35.1实际加载`linux-x64`，后端build通过。
- F1触及TypeScript文件lint为0 errors / 0 warnings。
- 后端全量lint为825 errors / 6 warnings，低于批准基线833/6；不表述为全仓lint通过。

### 2.2 前端门禁

- Vitest：16 files / 53 tests passed。
- Build：2460 modules transformed，成功。
- Playwright列表：9 files / 51 tests；全量51 passed。
- 全量lint：3 errors / 0 warnings，等于批准历史基线；没有新增债务。

### 2.3 部署脚本门禁

- AI preflight mock：8 passed。
- build-image路径：2 passed。
- Compose最小权限：7 service policies passed。
- Backup安全fixture：8 passed。
- Git object LF：3 shell files passed。
- Shell、MJS与PowerShell语法检查通过。

Backup fixture首次由未限定的`bash`解析到WSL，因PATH中无Node而停止；恢复时明确使用Git for Windows Bash，未修改脚本、测试或系统配置。该环境差异保留在停止报告中。

## 3. 正式镜像

- 正式镜像仅构建一次，tag绑定完整`FIX_RELEASE_SHA`。
- Image ID：`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`。
- 平台：linux/amd64；OCI revision精确等于`FIX_RELEASE_SHA`。
- 运行身份：`10001:10001`；工作目录：`/app`。
- 入口：`node dist/src/main.js`；Node内建fetch healthcheck存在。
- OpenSSL、Prisma Client、bcrypt与Sharp均在无网络容器中实际加载。
- Prisma内容：3个migration目录及独立`migration_lock.toml`。
- 初始化内容：4个编译脚本、10个图片fixture。
- image history敏感模式扫描0命中。

临时build-stage测试镜像与正式镜像身份不同；临时镜像没有重新tag为正式候选。

## 4. SIGTERM生命周期

正式镜像连续执行两轮：

| 轮次 | 耗时 | Exit | Signals | OOM | Restart | DB | 停止后HTTP |
| --- | ---: | ---: | --- | --- | ---: | --- | --- |
| 1 | 252ms | 0 | 15 | false | 0 | healthy | 不可达 |
| 2 | 225ms | 0 | 15 | false | 0 | healthy | 不可达 |

两轮均未出现signal 9、exit 137、OOM或自动重启。

## 5. 发布制品

| 文件 | 大小（bytes） | SHA-256 |
| --- | ---: | --- |
| API image archive | 205705216 | `1f3c31bdf3432c3def27c04e437013bbd2a30210650577ffdfcdd75b90409b47` |
| build manifest | 783 | `9cd65a00882e081ca05687a126515ac9298e7ae85b00306751641671b4a8f3b0` |
| deployment bundle | 17547 | `7bf774495ddf02428f8cdef02903b555b748c733ce50a16aa700566bbee92561` |
| `SHA256SUMS` | 407 | `49f61e01dd6614fb09b1296dcae01f7685dd680434d4424dd430a2763a09e2a6` |

- deployment bundle直接由`git archive <FIX_RELEASE_SHA> deploy/production`生成，没有复制checkout内容。
- bundle文件集合为20个跟踪文件，0 symlink，0额外/缺失文件。
- 3份Shell与Git blob逐字节一致，CR字节为0，`bash -n`全部通过。
- `SHA256SUMS`无BOM、CR字节为0；Linux兼容`sha256sum -c`对archive、build manifest与bundle全部输出OK。
- bundle不含真实env文件、私钥、key、生产域名、非占位数据库凭据或非预期公网IPv4。
- env example中的公共供应商示例地址、`.invalid`域名与明确数据库占位值不属于真实部署凭据。

## 6. 终态与边界

- F4容器、网络以及3000/3108/3109/4173/5173监听均为0。
- 正式镜像、临时测试镜像、四项制品、detached worktree和审计目录保留供人工验收；未执行Docker prune。
- `git diff --check`通过，仅有既存换行提示；worktree clean，主仓库index为空。
- 未进入F5，未创建隔离数据库、运行migration/seed、调用AI、连接ECS或提交Git。

## 7. 人工验收门禁

- 核对固定SHA、正式image ID、archive与bundle哈希。
- 核对18/82、16/53、9/51及两轮SIGTERM证据。
- 核对停止报告保留两次真实环境夹具失败，没有改写为首次全量通过。
- 确认F4仅关闭本地发布制品链，不自动授权F5或任何生产操作。

用户已于2026-07-22确认上述证据并通过F4人工验收。F5随后获得独立授权；该授权不追溯扩大F4范围。
