# F6.1 资源只读诊断报告

> 日期：2026-07-22
> 状态：独立只读诊断完成；完整F6.1仍暂停
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 原始值

| 项目 | 原始值 |
| --- | ---: |
| `/proc/meminfo` `SwapTotal` | `2097148 kB` |
| `/proc/meminfo` `SwapFree` | `2096112 kB` |
| `/proc/meminfo` `MemAvailable` | `1121840 kB` |
| `/srv/black-box`文件系统可用 | `31664963584 bytes` |
| `vm.swappiness` | `10` |
| `/swapfile`底层文件 | `2147483648 bytes` |
| `swapon --show --bytes` SIZE | `2147479552 bytes` |
| `swapon --show --bytes` USED | `1060864 bytes` |
| 底层文件与swapon容量差 | `4096 bytes` |

## 2. 阈值结论

| 契约 | 结果 | 依据 |
| --- | --- | --- |
| Swap总量约2GiB | PASS | 底层文件精确2GiB；内核可用容量仅少一个4096-byte header页 |
| Swap可用至少1GiB | PASS | `2096112 kB`，约2GiB可用 |
| MemAvailable至少512MiB | PASS | `1121840 kB` |
| 磁盘可用至少10GiB | PASS | `31664963584 bytes` |
| swappiness精确为10 | PASS | 当前值`10` |

## 3. 首次门禁失败根因

- 完整门禁旧断言读取`swapon --show --bytes`的SIZE，并要求其大于等于`2147483648`。
- 当前有效SIZE为`2147479552`，比整数2GiB少`4096` bytes，因此旧字面断言FAIL。
- 底层`/swapfile`本身精确为`2147483648` bytes；差值是Swap header页，不是Swap容量丢失、未持久化或持续耗尽。
- 其余四项全部超过既定阈值。因此前次非零退出已精确定位到Swap严格字节断言，不是内存、磁盘或sysctl异常。

## 4. D3.6基线对照

- D3.3历史planning明确记录“底层文件精确2GiB、swapon报告少4096 bytes”，该语义与本次实测完全一致。
- `d3-reboot-validation-report.md`曾把`2147479552`写作`/swapfile`大小；按该字面数值比较，本次底层文件与swapon SIZE均各高4096 bytes。
- 上述报告行与D3.3原始语义及本次`stat`/`swapon`双值证据矛盾，应视为历史报告把有效Swap容量误标为底层文件大小，不能据此认定主机Swap发生写入漂移。
- 本轮只记录差异，不修改D3历史证据，也不自行放宽完整门禁断言。

## 5. 执行边界

- 单一SSH会话只读取资源值；未修改Swap、sysctl、服务、UFW或其他主机状态。
- 未读取生产数据库，未检查或创建新SHA路径，未进入F6.2。
- 会话正常关闭；下一步等待用户决定是否将完整门禁的Swap断言改为“底层文件精确2GiB且有效容量仅允许一个header页差值”。

## 6. 审计口径确认

- 用户已确认完整门禁必须同时核验：底层文件`2147483648` bytes、系统page size`4096` bytes、swapon SIZE=`2147479552` bytes，以及`SwapTotal * 1024`与swapon SIZE精确一致。
- SwapFree、MemAvailable、磁盘可用与swappiness继续使用原阈值，不采用模糊容量下限替代四层一致性检查。
- D3.6历史报告不重写；最终F6.1报告继续登记其把有效Swap容量误标为底层文件大小。

## 7. 安全组控制面证据

- 用户已在本次F6.1恢复前通过阿里云控制台人工确认：安全组仅存在当前批准管理来源到TCP 2222的入方向规则，没有其他入方向规则。
- 该证据属于实例外控制面人工确认，与实例内UFW核验独立记录；不得用任一方替代另一方。
