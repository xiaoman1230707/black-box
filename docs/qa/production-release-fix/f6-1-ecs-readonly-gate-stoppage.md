# F6.1 ECS新鲜只读门禁首次停止报告

> 日期：2026-07-22
> 状态：已按异常即停契约暂停
> `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`

## 1. 本地连接门禁

- QA只读脚本通过`bash -n`；脚本不创建远端文件，只计划通过stdin执行。
- 沙箱身份无法读取用户SSH配置，显示默认用户和22；未用该结果连接。
- 用户权限上下文中，`black-box-ecs`严格解析为deploy、端口2222，Host已配置；没有记录Host值、IP或密钥路径。
- 本机未安装可用于控制面只读查询的阿里云CLI，因此安全组现状不能由实例内命令证明，仍需用户控制台证据。

## 2. 唯一SSH会话

- 使用BatchMode、IdentitiesOnly和有限连接超时成功建立唯一普通SSH会话。
- PowerShell将Base64文本经native pipeline发送时，远端解码报告`base64: invalid input`；脚本仍到达首个`sudo -n true`，随后明确返回需要密码。
- 该结果证明alias/2222/公钥链路可达，但不构成UFW、主机、旧资产或数据库门禁通过。

## 3. 停止边界

- 按“任何异常立即停止”要求，没有第二次连接、自动重试或切换传输方式。
- 未修改sudoers、SSH、UFW、安全组、Docker、Nginx、服务或系统参数。
- 未读取或修改生产数据库，未运行migration、seed、embedding、cleanup、restore或AI。
- 未创建新SHA release/compose/staging，未上传、导入镜像或进入F6.2。
- 会话结束后本机SSH/SFTP/SCP进程均为0；Git index为空，HEAD及AGENTS/`CLAUDE.md`保护哈希不变。

## 4. 恢复条件

1. 用户在自己的deploy终端执行`sudo -v`建立缓存，agent不得读取或采集密码。
2. 使用二进制安全的stdin传输，不重复当前PowerShell Base64文本管道。
3. 用户在阿里云控制台只读确认安全组仍仅允许批准管理来源访问2222；真实地址不得写入仓库。
4. 重新执行时仍只允许F6.1只读检查；任何断言失败立即停止，不自动修复或进入F6.2。

## 5. 原始stdin恢复执行结果

- 用户建立sudo缓存后，使用`cmd`原始文件重定向进行一次恢复执行；未再次使用PowerShell Base64文本管道。
- 已通过并有明确输出的检查：deploy身份、非交互sudo、sshd配置、当前SSH来源与UFW唯一2222规则一致、UFW默认策略、无IPv6 SSH规则、Docker/containerd active+enabled、Nginx inactive+disabled、failed units为0、无reboot marker。
- 随后命令以退出码1停止，停止点位于资源阈值断言组。该组依次检查2GiB Swap总量、至少1GiB Swap可用、至少512MiB MemAvailable、至少10GiB磁盘可用及`vm.swappiness=10`。
- 脚本仅在该组全部通过后输出各项数值，因此本次证据无法确认具体哪一项失败；不得猜测为内存、Swap、磁盘或sysctl中的任一项。
- 按失败即停约束，未进行第二次连接、未追加只读诊断、未修改任何远端文件、服务、网络或数据库，也未执行旧资产/B0/B1/Compose数据库及新SHA目标路径检查。

## 6. 恢复执行后的边界

- 本机SSH/SFTP/SCP进程为0，Git暂存区为空。
- `AGENTS.md` SHA-256仍为`DF5826C00A3360AA34ED667C73A01DCE90EA2E11091CA6210664706982CED17C`。
- `CLAUDE.md` SHA-256仍为`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`。
- F6.1仍未通过；F6.2上传未授权且未开始。
- 阿里云安全组属于实例外控制面，本次实例侧UFW通过不能替代用户当次控制台只读确认。
