# F6.1 ECS新鲜只读门禁报告

> 日期：2026-07-23
> 状态：已实施，用户人工验收通过
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 历史停止与恢复纪律

- 首次连接因PowerShell Base64文本管道和sudo缓存停止；未改写为通过。
- 第二阶段因旧Swap严格字节断言误拒绝正常header页差值停止；独立资源诊断后由用户拍板精确四层一致性口径。
- 完整恢复阶段依次暴露deploy无权遍历正式受保护目录、B0/B1与secret目录，以及Compose命令继承SSH stdin的问题；每次均保留停止证据，只做最小只读审计修正。
- `prisma migrate status`只执行一次并以0返回；因其首次执行消费后续stdin，数据库SQL核对使用独立续段完成，没有重跑status。

## 2. 独立控制面与SSH边界

- 用户当次通过阿里云控制台人工确认：安全组仅存在当前批准管理来源到TCP 2222的入方向规则，没有其他入方向规则。
- 实例内独立确认：当前SSH来源匹配UFW唯一2222规则，UFW默认deny-in/allow-out/deny-routed，无IPv6 SSH和批准外入站规则。
- deploy公钥会话、`sudo -n`和sshd hardening均通过；未修改sshd、UFW、安全组或代理规则。

## 3. 主机与资源

| 检查 | 结果 |
| --- | --- |
| Docker/containerd | active + enabled |
| Nginx | inactive + disabled |
| failed units | 0 |
| reboot marker | 不存在 |
| `/swapfile` | `2147483648 bytes` |
| page size | `4096 bytes` |
| swapon SIZE | `2147479552 bytes` |
| SwapTotal | `2097148 kB`，与有效容量一致 |
| SwapFree | `2096112 kB`，PASS |
| MemAvailable | 最终完整主机段采集`1120196 kB`，PASS |
| 磁盘可用 | 最终完整主机段采集`31602704384 bytes`，PASS |
| swappiness | `10` |

- D3.6历史报告把`2147479552`误标为底层文件大小；历史文件未重写，本报告明确其实际是有效Swap容量。
- TCP 2222监听正常；80/443/3000/5432/2375/2376无监听。
- 七个持久目录owner/mode及uploads/postgres UID/GID契约通过。

## 4. 旧资产与新SHA隔离

- 旧候选release/compose存在，旧SHA相关路径计数为5。
- B0与B1内部`SHA256SUMS`、`pg_restore --list`和`tar -tzf`全部通过。
- 当前只存在批准的旧API和PostgreSQL镜像；新FIX镜像尚未导入。
- 新FIX SHA的release、compose及staging目标路径计数为0；未创建、上传或覆盖任何目标。

## 5. Compose与生产数据库只读核对

- 检查前后均仅`db`服务运行；db healthy、OOM=false、restart=0，PostgreSQL镜像身份符合固定契约。
- 唯一一次`prisma migrate status`退出码0；一次性migrate容器由`--rm`清除，残留为0。
- `_prisma_migrations`：总计3、finished 3、pending 0、rolled-back 0。
- 9张业务表总行数0；只读`LIMIT 1 OFFSET 0`分页结果行数0；DB-2未执行。
- 终态仍仅db运行，migrate容器残留0；未启动API。

## 6. 禁止动作与终态

- 未运行`migrate deploy`、seed、restore、embedding、cleanup或AI。
- 未上传制品、导入镜像、创建新SHA目录或进入F6.2。
- 未修改Nginx、证书、DNS、Vercel、UFW、安全组、sshd、Swap、sysctl或生产数据。
- SSH会话均在命令结束后关闭；本地连接进程、Git暂存区和保护哈希在最终复核中单独确认。

## 7. 门禁结论

F6.1全部技术断言已取得完整通过输出。当前停在用户人工验收及F6.2制品上传独立写入授权门禁；本报告不构成F6.2授权。

用户已于2026-07-23人工确认F6.1通过，并独立授权仅执行F6.2制品上传、审计与镜像导入；该授权不追溯扩大F6.1，也不覆盖F6.3或API切换。
