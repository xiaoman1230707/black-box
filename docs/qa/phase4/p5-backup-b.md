# P5 cleanup 后备份 B 证据

> 日期：2026-07-16  
> 用途：`seed:demo:full` 前恢复点。  
> 状态：备份与归档可读性校验通过；尚未执行 seed、embedding 或 P6。

## 停写与数据基线

- Backup ID：`backup-B-20260716-174727`
- 备份目录：`C:\Users\15593\Black-box-backups\backup-B-20260716-174727`
- 目录位于仓库外。
- 备份前后 3000/5173 监听均为 0。
- 数据库基线：Post 14、Avatar 1、File 0。
- uploads 基线：4 个仓库控制文件和 2 个被引用头像文件，共 6 个文件。

## 数据库 dump

- 文件：`yue-after-cleanup-before-seed.dump`
- PostgreSQL custom dump。
- 大小：133135 bytes。
- mtime UTC：`2026-07-16T09:47:27.2363976Z`。
- SHA-256：`F901DA0A5552DF1D29423AA821BD0B7DB1A8487AE85E217BBEB54A9AE5F3CB3A`。
- `pg_restore --list`：退出 0，共 98 行、83 个非注释目录项。

## uploads 归档

- 文件：`uploads-after-cleanup-before-seed.tar.gz`
- 大小：27764 bytes。
- mtime UTC：`2026-07-16T09:47:27.2503990Z`。
- SHA-256：`D6EC377E2B63F02C25090AC8C7A9D02D88BD15FC41FD5F8CC01BD3FF2B56F7B3`。
- `tar -tzf`：退出 0，共 10 个目录/文件项；其中实际文件为 4 个控制文件和引用头像 large/small。

## 执行说明

首次 `pg_dump` 直接消费 Prisma URL 时，PostgreSQL 18 拒绝其 `schema` 查询参数，命令在 dump 前失败且未访问或修改数据库。重试只在传给 `pg_dump` 的内存副本中移除 `schema`，没有修改 `.env`。首次失败目录经核对仅含一个 0 字节 dump，已删除；仓库外当前只保留一个有效 backup B 目录。

两份成功备份的 SHA-256 已独立重算一致，`pg_restore --list` 与 `tar -tzf` 均复验通过。未配置隔离恢复目标，因此未执行副本 restore。

## 下一门禁

备份 B 已满足申请真实 `seed:demo:full` 的恢复点条件。两次 full、embedding 外部费用和页面数据抽验仍需独立授权；未授权前不得执行。
