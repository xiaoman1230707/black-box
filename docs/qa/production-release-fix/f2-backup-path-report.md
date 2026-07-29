# F2 backup路径边界TDD与最小修复报告

> 状态：已实施并于2026-07-22通过用户人工验收
> 日期：2026-07-22
> 范围：仅`backup-pair.sh`仓库边界判断及对应fixture；F3与生产操作未执行

## 1. RED证据

测试先将生产脚本复制到ECS同构安装布局：

```text
<fixture>/srv/black-box/compose/<release-sha>/scripts/backup-pair.sh
<fixture>/srv/black-box/backups
```

旧实现从脚本位置向上三级推导`repo_root`，稳定失败：

```text
FAIL: installed sibling backup exited 2: BACKUP_ROOT must be outside the repository
```

这锁定了问题是安装路径被误当源码仓库，而不是备份内容、Docker或数据库失败。

## 2. 测试先行范围

在原有4个fixture基础上增加4个边界fixture：

1. ECS同构安装目录的sibling backups必须成功并生成manifest。
2. 真实Git工作树内部的backup必须exit 2，且Docker调用日志为空。
3. Git命令不可用时，祖先`.git`目录必须保守拒绝，且Docker调用日志为空。
4. Git命令不可用时，worktree式`.git`文件必须保守拒绝，且Docker调用日志为空。

原有uploads嵌套、同名incomplete目录、运行中写工具和恢复身份manifest fixture全部保留。

## 3. 最小实现

修改仅发生在旧`repo_root`推导与拒绝段：

1. `BACKUP_ROOT`继续使用`realpath -m`规范化。
2. 从规范化目标向上寻找最近的现有目录，不要求目标目录预先存在。
3. Git可用时，对该祖先执行`git rev-parse --is-inside-work-tree`；只有确认处于真实工作树内才按仓库边界拒绝。
4. Git不可用或无法确认时，逐级检查祖先中的`.git`目录或普通文件并保守拒绝。
5. 安装分组根没有Git工作树或Git标记时，不再因为脚本所在层级而拒绝sibling backups。

首轮GREEN尝试仍被真实Git fixture拦下：Windows Git返回盘符格式的`show-toplevel`，与Git Bash的POSIX规范路径无法直接比较。修正后不再比较跨平台根路径字符串，而是直接确认最近现有祖先是否位于工作树中；安全回退保持不变。

## 4. GREEN与静态门禁

```text
backup-pair tests passed: 8
```

| 门禁 | 结果 |
| --- | --- |
| `backup-pair.sh` Bash语法 | 通过 |
| `backup-pair.test.sh` Bash语法 | 通过 |
| 全部backup fixture | 8 passed |
| 两个Shell CRLF扫描 | 0命中，保持LF |
| `git diff --check`（F2文件） | 通过 |
| 安全契约定向扫描 | 绝对路径、uploads、重名、写工具、停API、incomplete、manifest/SHA均存在 |
| ShellCheck | 宿主未安装；未新增依赖，以Bash语法、fixture和静态扫描替代 |

## 5. 未弱化的既有保护

生产脚本差异显示下列代码未被删除或改写：

- 三个路径参数必须是绝对路径。
- `BACKUP_ROOT`等于或位于`UPLOADS_DIR`内部时拒绝。
- complete或incomplete目标重名时，在写备份前拒绝。
- migrate、games、tags、demo与embedding等写工具运行时拒绝。
- 先确认无写工具，再创建唯一incomplete，随后停止API并保持停写状态。
- 失败trap保留incomplete，并明确API是否已停止。
- database/uploads SHA、绝对路径、大小、release SHA、镜像digest和migration身份继续写入恢复manifest。

## 6. 保护与停止点

- F1运行代码与测试差异保持原样。
- `CLAUDE.md`、package/lockfile、schema/migration、前端和既有e2e未被F2修改。
- 未连接ECS，未操作生产备份、数据库或Docker，未暂存、提交或生成候选制品。
- F2已通过用户人工验收。该结论不构成新候选SHA，也不授权F4、commit或任何生产操作。
