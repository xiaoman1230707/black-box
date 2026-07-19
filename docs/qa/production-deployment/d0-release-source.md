# D0 发布来源与 O2 暂存审计

> 日期：2026-07-19
> 状态：D0 已关闭，O2 已经用户授权独立提交；等待 D1 施工方案门禁

## 1. 工作树基线

- 分支：`main`
- 基线 HEAD：`96f92457900f24b8bdcefce16779a1265d586bce`
- Node：`v24.18.0`
- pnpm：`11.9.0`
- Docker Client：`29.4.3`；用户级 Docker 配置读取出现 Access denied，D0 未绕过权限、未调用 daemon/buildx。
- O2、用户 `CLAUDE.md` 改动和生产部署文档在工作树中并存；本次仅暂存 O2 白名单。

## 2. 自动验证

| 门禁 | 结果 |
| --- | --- |
| 前端 unit | 16 files / 53 passed |
| 前端 build | 成功，2460 modules transformed；使用进程级测试值显式注入 `VITE_API_BASE_URL` |
| Playwright 清单 | 9 files / 51 tests |
| Playwright 全量 | 51 passed |
| 前端 O2 定向 lint | 0 errors / 0 warnings |
| 前端全量 lint | 3 errors / 0 warnings，仅既有 `ui/badge.tsx` 与 `utils/index.ts` |
| 后端 Jest | 17 suites / 74 passed |
| 后端 build | 成功 |
| 后端 O2 新增文件 lint | 0 errors / 0 warnings |
| 后端 O2 历史触及文件 lint | 278 errors / 0 warnings，与既有基线一致；未执行 `--fix` |
| staged diff check | 通过 |

## 3. 保护证据

- `protected-files-d0-before.sha256` 与 `protected-files-d0-after.sha256` 各 191 项，逐行比较差异为 0。
- `CLAUDE.md` 包含于保护集合，前后 SHA-256 一致；文件仍为工作树改动，未进入暂存区。
- 暂存区不包含 07 设计、生产部署实施计划、production planning 或本 D0 QA。
- 未读取、复制或记录 `CLAUDE.md` 内容。

## 4. 暂存边界

暂存内容仅包括 O2 的后端 JWT 只读列表接口与测试、前端个人内容 API/页面/Mine 入口与测试、O2 设计/实施/QA/planning 证据和既有 O2 截图。精确文件清单以 `git diff --cached --name-only` 为准。

## 5. O2 提交结果

- 用户在 staged diff 人工验收后独立授权提交。
- Commit message：`feat(personal): add personal post lists`
- 完整 `O2_SHA`：`7fef3bec831e047c4834f3d4765e930e9a7680eb`
- `git show --stat --oneline HEAD`：75 files changed，4123 insertions，49 deletions。
- `git show --name-only HEAD` 与提交前已审查的75个暂存文件一致。
- 提交后 `CLAUDE.md` 仍为未暂存用户改动，SHA-256 与D0保护基线一致。
- 07设计、生产部署实施计划、production planning与D0 QA仍留在工作树，均未误入O2提交。
- 未执行push，也未重新暂存其他文件。

## 6. 远程与外部状态

D0 未建立任何 SSH/SCP/SFTP/rsync-over-SSH 连接，未连接 ECS，未操作 Docker 云端、Vercel、DNS、数据库、AI 或付费资源。当前停在D0关闭及D1施工方案门禁。
