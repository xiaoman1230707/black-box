# P5.6 cleanup apply 执行报告

> 日期：2026-07-16  
> 授权范围：仅执行一次既定 24 小时保护窗 cleanup apply。  
> 本报告记录 cleanup apply 当时状态；后续备份 B 与双轮 seed/full 见 `p5-backup-b.md`、`p5-seed-full.md`。

## 1. 执行命令

```powershell
pnpm maintenance:uploads -- --apply --backup-confirmed --protect-hours=24
```

命令仅执行一次，退出码 0，没有 `FAILED` 项。执行前 planner 与获批候选一致：control 4、orphan 40、referenced 2，其余分类 0。

## 2. 删除结果

- 删除 18 个孤立头像组，共 36 个文件。
- 删除 2 个孤立帖子图片组，共 4 个文件。
- 删除孤立 File 记录 4、5。
- 保留数据库引用头像组 `1782369612437-498202641` 的 large/small 两个文件。
- 保留 4 个仓库控制文件。

## 3. 执行后 dry-run

无参数 dry-run 退出 0：

| 分类 | 数量 |
|---|---:|
| control | 4 |
| missing | 0 |
| orphan | 0 |
| protected | 0 |
| referenced | 2 |
| symlink | 0 |
| unknown | 0 |
| unsafe-record | 0 |

## 4. 数据库与磁盘核对

| 项目 | 执行后 |
|---|---:|
| Post | 14 |
| Avatar | 1 |
| File | 0 |
| File id 4/5 命中 | 0 |
| uploads 文件总数 | 6 |

uploads 剩余清单：

- `.gitignore`
- `.gitkeep`
- `avatar/resized/.gitkeep`
- `avatar/resized/1782369612437-498202641-large.jpg`
- `avatar/resized/1782369612437-498202641-small.jpg`
- `resized/.gitkeep`

## 5. 恢复点复核

apply 后备份 A 两份 SHA-256 再次核对不变：

- DB dump：`6BC32045A57F7BCA7B94E73D852BF3E32FA4457A6B85B99EFC614D1CB7E1022C`
- uploads tar.gz：`E768D1EBB57C5248D581348145E098AA704DDC18BE96F8BB8EE879B0D31CD7CA`

3000/5173 监听为 0。cleanup 结果随后已通过用户人工验收；备份 B 与双轮 `seed:demo:full` 已按独立门禁完成，后续证据见对应 QA 报告。
