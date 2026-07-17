# P5.6 上传清理修复与 dry-run 报告

> 日期：2026-07-16  
> 环境：本机 `yue` 演示数据库与 `backend/backend/posts/uploads/`  
> 模式：dry-run；未执行 `--apply`，未删除数据库记录或磁盘文件。

## 1. 重复 filename 安全修复

`File.filename` 没有唯一约束。planner 已从“filename → 单条记录”改为“filename → 全部记录”：

- 任一同名记录 `postId != null`，整组标记 `referenced` 并保留。
- 全部同名记录均孤立时，只有整组文件删除全部成功后才逐条删除该组全部 File 记录。
- 任一文件删除失败时，不删除该组任何 File 记录；记录删除失败继续报告并最终非零退出。

TDD 新增两项：已引用+孤立同名组保持；多个孤立同名组在完整删图后清理全部记录。修复前稳定失败，修复后 cleanup 8/8、后端全量 9 suites/50 tests。

## 2. 只读数据库统计

| 项目 | 数值 |
|---|---:|
| Post | 14 |
| manifest 标题命中 | 14 |
| Avatar | 1 |
| File | 2 |
| 重复 filename 组 | 0 |

两条 File 均为孤立记录：

| File id | filename | postId |
|---:|---|---|
| 4 | `1782103038392-66476470` | `null` |
| 5 | `1782103091456-315696619` | `null` |

## 3. dry-run 分类

| 分类 | 文件数 |
|---|---:|
| control | 4 |
| missing | 0 |
| orphan | 40 |
| protected | 0 |
| referenced | 2 |
| symlink | 0 |
| unknown | 0 |
| unsafe-record | 0 |

仓库控制文件 `.gitignore`、根/头像/缩略图目录 `.gitkeep` 共 4 条，仅报告不删除。

## 4. 实际候选清单

以下 20 组均早于 24 小时保护窗。每个头像组包含 large/small 两条，共 36 个文件：

| # | 组 key | 候选路径 |
|---:|---|---|
| 1 | `avatar:1782110209630-39927670` | `avatar/resized/1782110209630-39927670-large.jpg`；`avatar/resized/1782110209630-39927670-small.jpg` |
| 2 | `avatar:1782110219731-909866547` | `avatar/resized/1782110219731-909866547-large.jpg`；`avatar/resized/1782110219731-909866547-small.jpg` |
| 3 | `avatar:1782110232454-370306103` | `avatar/resized/1782110232454-370306103-large.jpg`；`avatar/resized/1782110232454-370306103-small.jpg` |
| 4 | `avatar:1782110244453-299216149` | `avatar/resized/1782110244453-299216149-large.jpg`；`avatar/resized/1782110244453-299216149-small.jpg` |
| 5 | `avatar:1782110254945-794528109` | `avatar/resized/1782110254945-794528109-large.jpg`；`avatar/resized/1782110254945-794528109-small.jpg` |
| 6 | `avatar:1782110292200-111646367` | `avatar/resized/1782110292200-111646367-large.jpg`；`avatar/resized/1782110292200-111646367-small.jpg` |
| 7 | `avatar:1782110301298-868952994` | `avatar/resized/1782110301298-868952994-large.jpg`；`avatar/resized/1782110301298-868952994-small.jpg` |
| 8 | `avatar:1782110313344-376332359` | `avatar/resized/1782110313344-376332359-large.jpg`；`avatar/resized/1782110313344-376332359-small.jpg` |
| 9 | `avatar:1782110326227-154757333` | `avatar/resized/1782110326227-154757333-large.jpg`；`avatar/resized/1782110326227-154757333-small.jpg` |
| 10 | `avatar:1782110441599-90132989` | `avatar/resized/1782110441599-90132989-large.jpg`；`avatar/resized/1782110441599-90132989-small.jpg` |
| 11 | `avatar:1782110445784-579038101` | `avatar/resized/1782110445784-579038101-large.jpg`；`avatar/resized/1782110445784-579038101-small.jpg` |
| 12 | `avatar:1782110453941-151030737` | `avatar/resized/1782110453941-151030737-large.jpg`；`avatar/resized/1782110453941-151030737-small.jpg` |
| 13 | `avatar:1782110467244-738557108` | `avatar/resized/1782110467244-738557108-large.jpg`；`avatar/resized/1782110467244-738557108-small.jpg` |
| 14 | `avatar:1782110485963-487445462` | `avatar/resized/1782110485963-487445462-large.jpg`；`avatar/resized/1782110485963-487445462-small.jpg` |
| 15 | `avatar:1782110825243-720456657` | `avatar/resized/1782110825243-720456657-large.jpg`；`avatar/resized/1782110825243-720456657-small.jpg` |
| 16 | `avatar:1782110839849-675887038` | `avatar/resized/1782110839849-675887038-large.jpg`；`avatar/resized/1782110839849-675887038-small.jpg` |
| 17 | `avatar:1782112350541-198895215` | `avatar/resized/1782112350541-198895215-large.jpg`；`avatar/resized/1782112350541-198895215-small.jpg` |
| 18 | `avatar:1782112355255-314801808` | `avatar/resized/1782112355255-314801808-large.jpg`；`avatar/resized/1782112355255-314801808-small.jpg` |
| 19 | `post:1782103038392-66476470` / File 4 | `1782103038392-66476470.jpg`；`resized/1782103038392-66476470-thumbnail.jpg` |
| 20 | `post:1782103091456-315696619` / File 5 | `1782103091456-315696619.jpg`；`resized/1782103091456-315696619-thumbnail.jpg` |

## 5. 明确保留清单

当前数据库引用的头像组保持不动：

- `avatar/resized/1782369612437-498202641-large.jpg`
- `avatar/resized/1782369612437-498202641-small.jpg`

## 6. 无写入证据与剩余门禁

- 修复后真实 dry-run exit 0。
- dry-run 前后 46 个 uploads 文件的相对路径、size、mtime 与 SHA-256 比较：差异 0。
- dry-run 后数据库仍为 Avatar 1、File 2。
- 未执行 cleanup apply。

cleanup apply 前仍需同一维护点的数据库与 uploads 备份文件、SHA-256 和用户独立授权。

当前数据库 14 帖全部命中旧 manifest。新 seed 完成后预计 35 帖；连续运行两次 `seed:demo:full` 将分别对 35 帖执行 `--all`，预计共 70 次 embedding 调用。真实 seed/full 仍需备份门禁。
