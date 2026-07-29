# F6.1 完整只读门禁第二次停止报告

> 日期：2026-07-22
> 状态：按异常即停契约暂停
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 前置证据

- 用户已通过阿里云控制台人工确认：安全组仅存在当前批准管理来源到TCP 2222的入方向规则，没有其他入方向规则。
- 该控制面证据与实例内UFW检查独立记录；本次没有用UFW替代安全组结论。
- 新Swap审计脚本通过本地`bash -n`与补丁格式检查；原失败和资源诊断证据均保留。

## 2. 已通过检查

- deploy身份、`sudo -n`、sshd配置。
- 当前SSH来源匹配UFW唯一2222规则；UFW默认策略正确且无IPv6 SSH或其他批准外端口规则。
- Docker/containerd active+enabled，Nginx inactive+disabled，failed units为0，无reboot marker。
- Swap精确四层一致性：
  - `/swapfile=2147483648 bytes`；
  - page size=`4096 bytes`；
  - swapon SIZE=`2147479552 bytes`；
  - `SwapTotal=2097148 kB`，换算后与swapon SIZE一致。
- `SwapFree=2096112 kB`、`MemAvailable=1127604 kB`、磁盘可用`31664959488 bytes`、`vm.swappiness=10`，均满足阈值。
- TCP 2222监听存在；80/443/3000/5432/2375/2376无监听。
- 七个持久目录的存在性、权限及已知UID/GID契约通过。

## 3. 停止点与根因范围

- 脚本随后以deploy非特权身份执行`find /srv/black-box -maxdepth 3`，用于统计旧SHA并确认新SHA路径不存在。
- 正式权限使deploy不能遍历`uploads`、`postgres`和`backups`，`find`返回permission denied，脚本因`pipefail`以退出码1停止。
- 这是审计命令没有使用已验证`sudo -n`读取受保护目录的权限口径缺口；现有证据不能据此判定旧资产、新SHA目标、B0/B1或数据库发生漂移。
- 停止前未到达B0/B1可读性、Compose运行服务、镜像集合、`prisma migrate status`、migration计数、九表空计数或空分页检查。

## 4. 边界与终态

- 未修改任何远端文件、服务、UFW、sshd、安全组、Swap或sysctl。
- 未创建新SHA路径，未上传或导入镜像，未启动API，未运行migration/seed/restore/embedding/cleanup/AI。
- `prisma migrate status`尚未执行，因此本次没有创建一次性tools容器，也没有读取生产数据库。
- F6.1仍未通过；F6.2仍未授权、未开始。
- 后续若获恢复授权，应只把两处路径枚举改为`sudo -n find`或等价的精确只读检查，不放宽路径存在性断言。

## 5. 路径枚举恢复结果

- 用户随后授权本批完成前持续执行；两处路径枚举仅改为`sudo -n find`，本地语法和补丁检查通过。
- 恢复执行确认旧SHA路径5项、旧release/compose存在且新FIX SHA路径为0；因此此前路径枚举停止已关闭，未发现资产漂移。
- 脚本随后在B0/B1可读性组停止。历史证据确认B0/B1位于正式`root:root 0700`备份目录且已分别通过完整性验收；deploy直接`cd`无权限。
- 该停止仍属于只读审计身份与正式目录权限不匹配，未到达Compose、镜像或数据库检查。后续最小恢复只允许在`sudo -n bash`内执行原有SHA、dump清单和tar可读性断言，不改变备份内容。

## 6. B0/B1恢复与env存在性停止

- B0/B1通过`sudo -n`执行原有内部SHA、`pg_restore --list`和`tar -tzf`检查，二者均完整可读。
- 下一停止点位于Compose前置文件存在性检查；`/etc/black-box`按正式契约为`root:root 0700`，deploy无法用shell `[[ -f ]]`穿越该目录检查`release.env`。
- 该结果不代表env缺失，也未读取env内容。最小恢复只把compose与release env存在性断言改为`sudo -n test -f`；后续Compose命令本就通过`sudo -n docker`读取该文件。

## 7. env恢复与stdin消费观察

- `sudo -n test -f`恢复后，Compose前置、仅db运行、db healthy/OOM/restart、镜像集合及FIX镜像不存在检查均通过。
- 一次性`prisma migrate status`以退出码0完成，但`docker compose run`缺少`-T`，在SSH stdin脚本模式下消费了其后的脚本文本；SSH因此以最后一个已完成命令的0退出，未输出后续SQL计数或最终完成标记。
- 该结果不能宣告完整F6.1通过。为遵守`migrate status`只执行一次，后续不重跑该命令；仅以独立只读续段确认其`--rm`容器无残留并完成migration/业务表/空分页SQL核对。
- 主审计脚本补入`-T`仅用于修正未来stdin执行契约，不作为本次重跑依据。

## 8. 数据库续段stdin观察

- 独立续段先确认`migrate status`一次性容器残留为0、当前仅db运行。
- 首个`docker compose exec -T`只读migration计数查询以0返回，但Compose exec仍继承SSH脚本stdin并消费后续文本；因此没有形成完整SQL计数和最终标记。
- `-T`只禁用伪终端，不等同于关闭stdin。最小修正是在每次只读Compose exec后显式使用`</dev/null`；只读SQL允许重复核对，`prisma migrate status`仍不重跑。
