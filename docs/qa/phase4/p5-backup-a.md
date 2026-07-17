# P5 维护前备份 A 证据

> 用途：cleanup apply 前恢复点。  
> 状态：备份与归档可读性校验通过；尚未执行 cleanup apply、seed 或 embedding。

## 停写窗口

- Backup ID：`backup-A-20260716-171200`
- 开始：`2026-07-16T09:12:00.8380801Z`
- 结束：`2026-07-16T09:12:04.7234233Z`
- 窗口前后 3000/5173 应用监听：0
- 备份目录位于仓库外：是

## 数据库 dump

- 绝对路径：`C:\Users\15593\Black-box-backups\backup-A-20260716-171200\yue-before-cleanup.dump`
- 格式：PostgreSQL custom dump
- 大小：133256 bytes
- mtime UTC：`2026-07-16T09:12:03.2697482Z`
- SHA-256：`6BC32045A57F7BCA7B94E73D852BF3E32FA4457A6B85B99EFC614D1CB7E1022C`
- `pg_restore --list`：通过，98 条目录项
- 目录清单：同一备份目录内 `database-contents.txt`

## uploads 归档

- 绝对路径：`C:\Users\15593\Black-box-backups\backup-A-20260716-171200\uploads-before-cleanup.tar.gz`
- 大小：645428 bytes
- mtime UTC：`2026-07-16T09:12:04.5966182Z`
- SHA-256：`E768D1EBB57C5248D581348145E098AA704DDC18BE96F8BB8EE879B0D31CD7CA`
- `tar -tzf`：通过，50 条目录项
- 目录清单：同一备份目录内 `uploads-contents.txt`

## 独立复核

备份完成后重新计算两份 SHA-256，结果与首次记录一致；再次执行 `pg_restore --list` 与 `tar -tzf`，目录项仍分别为 98/50。备份目录内 `backup-manifest.txt` 的 SHA-256 为：

`18F070A0E5934F2A1195184881CD8121E04A7B5FC099F38AB125CF5B56243E38`

本轮没有配置或授权隔离数据库恢复目标，因此未执行副本数据库恢复演练；已完成要求的最低 custom dump 与 tar 归档可读性验证。文档和备份清单不包含数据库连接串、密码或 AI key。

## 下一门禁

- cleanup apply 仍需用户基于本报告和 `p5-cleanup-dry-run.md` 单独授权。
- cleanup 验收通过后才生成备份 B；备份 B 闭环后再申请两次 `seed:demo:full` 授权。
