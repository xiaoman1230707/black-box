# D3.3 Swap、时间与系统更新只读预检

> 日期：2026-07-19
> 状态：Swap门禁A已人工验收通过并关闭；重启持久性留D3.6。门禁B已完成58包普通upgrade与新deploy会话复核，等待D3.3整体验收

## 连接与边界

- 用户先在关闭全部旧会话后的新deploy会话中人工复验登录与sudo，随后关闭连接；密码未交给agent。
- agent分别经独立S授权以deploy建立非特权会话；没有调用sudo，没有运行`apt update/upgrade`，没有修改系统配置。
- 首次主体采集为整理模拟结果使用了`mktemp`创建临时列表，并由trap在命令结束时删除。该文件未持久保留、未改变系统配置或数据，但违反了该次“不得创建远端文件”的严格只读口径，作为非持久边界偏差如实登记；后续两次补采均未创建远端文件。
- 第三次批量补采输出`D3_3_BULK_PRECHECK_COMPLETE=true`，所有采集连接均已关闭；不再存在待猜测的缺失项。

## Swap、fstab与sysctl

- 当前Swap条目为0、无`/swapfile`，总Swap为0。
- `/etc/fstab`校验通过，只有根分区与EFI分区有效条目，没有Swap条目。
- 当前`vm.swappiness=0`，唯一持久来源为`/etc/sysctl.d/99-apsara-sysctl.conf`首行的`vm.swappiness = 0`，不是符号链接。这与原D3.3目标值10冲突；Swap写入方案必须先备份该云厂商配置并定向修改唯一现有定义，不能另加同优先级/更低优先级文件形成双值来源。
- `vm.overcommit_memory=0`、`vm.dirty_ratio=30`，本批不调整。

## 时间同步

- NTP synchronized为yes，时区为Asia/Shanghai。
- chrony已enabled/active、stratum 3、leap status正常；systemd-timesyncd inactive。
- 已有单一有效时间服务，不安装或切换第二套NTP daemon。

## APT来源与索引

- 当前源均来自阿里云Ubuntu镜像域名；未发现带认证信息的APT URL。
- APT lists共49个文件，最新索引时间为`2026-07-19T10:08:23Z`。
- hold保持为`cloud-init`、`intel-microcode`；不得自动unhold。

## 升级模拟

- `apt-get -s -o Debug::NoLocking=1 upgrade`报告：58 upgraded、0 newly installed、0 remove、1 not upgraded；kept back为`cloud-init`。
- 58个升级包名称完整集合：`ca-certificates`, `cups-bsd`, `cups-client`, `cups-common`, `curl`, `fwupd`, `gzip`, `iproute2`, `libcups2`, `libcurl3-gnutls`, `libcurl4`, `libfwupd3`, `libidn12`, `libmysqlclient21`, `libncurses5`, `libncurses6`, `libncursesw6`, `libnghttp2-14`, `libnss3`, `libntfs-3g89`, `libperl5.34`, `libpython3.10`, `libpython3.10-dev`, `libpython3.10-minimal`, `libpython3.10-stdlib`, `libsqlite3-0`, `libtinfo5`, `libtinfo6`, `libxml2`, `linux-libc-dev`, `ncurses-base`, `ncurses-bin`, `ncurses-term`, `ntfs-3g`, `openssh-client`, `openssh-server`, `openssh-sftp-server`, `perl`, `perl-base`, `perl-modules-5.34`, `python3.10`, `python3.10-dev`, `python3.10-minimal`, `python3-distupgrade`, `python3-httplib2`, `python3-idna`, `tar`, `tzdata`, `ubuntu-advantage-tools`, `ubuntu-pro-client`, `ubuntu-pro-client-l10n`, `ubuntu-release-upgrader-core`, `vim`, `vim-common`, `vim-runtime`, `vim-tiny`, `wget`, `xxd`。
- 批量元数据查询完整解析58/58个包，候选元数据未知数为0；预计下载`49,125,108 bytes`（`46.85 MiB`），预计安装后磁盘变化约`-6 KiB`（`-0.01 MiB`）。
- 清单包含OpenSSH、ca-certificates、tzdata等运行基础包；关键候选包括OpenSSH `8.9p1-3ubuntu0.15 → 8.9p1-3ubuntu0.16`、ca-certificates `20240203~22.04.1 → 20260601~22.04.1`、tzdata `2026a → 2026b`。
- 含`linux-libc-dev 5.15.0-181.191 → 5.15.0-186.196`，但计划中的kernel image/modules/generic包数量为0；这是用户空间头文件，不是运行内核更新。
- 当前`/var/run/reboot-required`不存在，reboot包列表为空。根盘总量约39.0GiB、可用约34.1GiB、使用率9%，满足施工门禁。
- 服务敏感包为`ca-certificates`、`openssh-client`、`openssh-server`、`openssh-sftp-server`、`tzdata`；包更新必须保持现有deploy会话，并在升级后通过受控alias的新会话验证SSH。

## 独立门禁A：Swap写入方案

- 用户已明确授予Swap范围E授权；受控alias连接无需逐次S。连接后先复核无Swap、无`/swapfile`、fstab无Swap项、云厂商swappiness来源仍未漂移。
- 在唯一、root私有且不复用的备份目录保存`/etc/fstab`与`/etc/sysctl.d/99-apsara-sysctl.conf`，记录mode/owner与SHA-256。
- 创建2GiB`/swapfile`，设为`0600 root:root`，经`mkswap`后先`swapon`；验证`swapon --show --bytes`、`free`及权限。
- 重复项检查通过后，仅向fstab追加一行`/swapfile none swap sw 0 0`，并运行`findmnt --verify --verbose`。
- 不修改云厂商`99-apsara-sysctl.conf`；创建排序更后的项目独立`99-black-box-memory.conf`写入10，并用`sysctl --system`、来源顺序与`sysctl vm.swappiness`验证最终覆盖值。
- 任一步失败立即停止。回滚顺序为恢复fstab与sysctl备份、重新应用sysctl、在内存允许时`swapoff /swapfile`并仅删除本批创建的swapfile；若`swapoff`失败则保留现场，不声称回滚完成。

## 独立门禁B：软件包更新方案

- 仅在门禁A实施并人工验收后申请新的软件更新E授权；受控alias无需逐次S，两个E授权互不替代。
- 写入前先运行`apt-get update`，随后重新模拟`apt-get upgrade`并与本报告的58个包、候选版本、移除/新增数核对。任何集合或版本漂移立即停止并重新提交清单评审，不自动继续。
- 保持`cloud-init`与`intel-microcode`hold，不执行unhold、`dist-upgrade`、`full-upgrade`或release upgrade；只执行经复核的普通`apt-get upgrade`。
- 升级时保持已验证deploy会话。完成后验证`dpkg --audit`、hold、SSH active、`sshd -t`、root/deploy上下文有效值、failed units、监听及`/var/run/reboot-required`。
- OpenSSH升级后的全新deploy登录使用受控alias验证；新会话成功前不关闭原会话。若产生reboot marker，只登记并停在D3.6独立重启E门禁，不在D3.3重启。
- 包升级不自动降级；失败时保留APT历史和现场，停止D3.4。

当前未创建Swap、修改fstab/sysctl、更新APT索引、升级包、安装软件、重启或进入D3.4。门禁A虽已授权，但首次连接失败后已暂停，继续前需闭合下述alias用户问题。

## 门禁A首次执行停止证据

- SSH/DIRECT新口径同步后，首次本地命令因PowerShell提前解析远端shell语法而未建立连接、远端零动作；该写法未重复。
- 修正本地封装后的首次真实连接由`black-box-ecs` alias选择root用户；D3.2的`PermitRootLogin no`正确拒绝认证。该结果是SSH hardening正常生效的正向安全证据，不是产品或主机故障；命令未进入远端shell，也没有任何写入。
- 按“发生任何失败立即停止”约束，当时没有自动改用deploy重试。用户随后明确批准继续使用`ssh -l deploy black-box-ecs`；后续部署远程命令统一显式指定deploy，不修改或恢复root SSH。
- 显式deploy重试已成功进入远端shell并确认身份；紧接着的`sudo -n true`因新会话没有可用sudo凭据而失败，后续Swap现场检查和全部写入均未执行。agent未请求、接触或记录sudo密码，也未尝试`sudo -S`、修改sudoers或恢复root SSH。
- 继续门禁A需要用户提供不暴露密码且范围受控的提权执行接缝；该接缝本身若涉及sudoers或远端写入，必须单独明确授权。当前SSH命令已退出。

## 门禁A用户执行与独立复核

- 用户在自己的交互式deploy终端执行已审查脚本并返回`D3_SWAP_GATE_A_COMPLETE=true`及root私有备份目录；该完成标记只会在脚本内部备份、Swap/fstab/sysctl、云厂商文件哈希及终态断言全部通过后输出。
- agent随后以`ssh -l deploy black-box-ecs`执行独立只读复核：身份为deploy、fstab中规范`/swapfile`条目恰好1条，`findmnt --verify`为0 parse errors/0 errors（另有4条非阻塞warnings），并已读取到`/swapfile`owner为root。
- 复核命令的`stat -c`格式字符串被Windows SSH参数层拆分，远端`stat`把`mode=%a`误当文件名并按`set -e`停止；没有任何远端写入。文件mode/容量、项目sysctl、运行swappiness、swapon/free及APT历史等剩余只读断言尚未由agent独立闭环。
- 遵守失败即停，本轮未自动修正并重跑。Swap不回滚：用户脚本已报告完成，当前没有证据表明系统写入失败；保持现场等待一次明确允许的修正只读复核。
- 用户允许第二次纯只读复核。该次在停止前进一步断言`/swapfile`为`root:root`、mode`0600`、精确2GiB，项目`99-black-box-memory.conf`为`root:root`、mode`0644`、19 bytes；fstab唯一性与`findmnt`仍通过。
- Windows SSH参数层再次移除含空格文本比较所需的内层引号，远端`test`报`too many arguments`并按`set -e`停止。失败点位于项目sysctl文本比较，故运行时swappiness、swapon列表和free输出尚未由该次命令执行；无sudo或远端写入，未自动第三次复跑。

## 门禁A最终只读证据

- 用户明确允许第三次纯只读复核；改用多条无嵌套远端shell引号的独立SSH读取，所有连接均显式deploy身份且已关闭。
- 项目`99-black-box-memory.conf`内容为`vm.swappiness = 10`；云厂商`99-apsara-sysctl.conf`仍保留`vm.swappiness = 0`及其余原有内容，未被项目脚本修改。
- 运行时`vm.swappiness=10`，证明按字典序后加载的项目配置已覆盖云厂商默认值。
- `swapon`显示`/swapfile`类型file、可用容量`2,147,479,552 bytes`、used 0、priority -2；该值比2GiB文件少4096 bytes，正好是一个swap header页。此前已独立确认底层文件精确2,147,483,648 bytes、root:root、0600。
- `free -h`显示Swap总量2.0GiB、已用0B、可用2.0GiB；内存约1.6GiB，可用约1.1GiB。
- 最后一个本地PowerShell断言错误地要求`swapon`可用容量等于底层文件总字节数，因此在所有远端读取完成后报告`swap activation mismatch`。这是只读验收器口径错误，不是主机或Swap失败；没有远端写入，也未自动再次连接。

## 前后证据与回滚口径

- 前态：无Swap、无`/swapfile`、fstab无Swap条目、运行swappiness 0，唯一云厂商定义位于`99-apsara-sysctl.conf`。
- 备份：root私有目录`/root/black-box-d3-swap-20260719T120100Z`，用户脚本在完成标记前已校验备份和云厂商文件SHA-256；agent不具备读取该root目录的权限，未接触备份内容。
- 后态：fstab规范条目恰好1条；`findmnt --verify`为0 parse errors/0 errors；底层Swap文件root:root/0600/2GiB；项目sysctl root:root/0644；运行值10；Swap启用且未使用。
- 回滚只能在新的独立E授权下执行：恢复备份fstab，删除项目`99-black-box-memory.conf`并重载sysctl，在内存允许时`swapoff /swapfile`后删除本批创建的`/swapfile`。若`swapoff`失败则保留文件和现场并非零停止，不声称完整回滚；不得修改云厂商配置。
- 重启持久性仍留D3.6；本门禁没有运行APT update/upgrade、安装软件、重启或进入D3.4。

## 门禁A人工验收关闭

- 用户确认D3.3门禁A人工验收通过；运行态证据、备份与回滚口径均被接受。
- Swap重启持久性继续作为D3.6独立验收项，未因当前运行态通过而提前勾选。
- 门禁B后续已获独立实际upgrade授权并完成；dist/full-upgrade、autoremove、额外安装与重启均未执行。完整证据见`docs/qa/production-deployment/d3-apt-upgrade-report.md`。

## 门禁B首次执行停止

- agent以`ssh -l deploy black-box-ecs`成功登录并确认deploy身份；紧接着的`sudo -n true`要求密码，命令按`set -e`终止。
- 失败发生在`apt-get update`之前；APT索引、包、hold、系统配置和服务均未改变，也未执行upgrade、安装、autoremove或重启。
- agent不接触sudo密码、不使用`sudo -S`、不修改sudoers或root SSH。继续门禁B需由用户在自己的交互式deploy终端执行经审查的刷新/模拟脚本，或另行建立范围受控且不暴露密码的提权接缝。

## 门禁B刷新成功与报告生成诊断

- 用户交互式脚本中的`apt-get update`成功命中四个阿里云Jammy仓库并完成索引读取，但脚本随后无完成标记返回提示符；因此不把报告阶段视为完成。
- agent只读诊断确认刷新后的`apt-get -s upgrade`退出0，仍为58升级、0新增、0删除、1未升级；hold仍为`cloud-init`与`intel-microcode`。用户脚本留下两个root-owned部分报告，证明失败位于报告生成而非APT刷新/模拟本身。
- 为避免远端写文件和sudo，新增本地planning汇总器，只通过显式deploy SSH调用只读`apt-get -s`、`apt-cache show`、`apt-mark`与`df`。首次运行已完成模拟和包元数据读取，但PowerShell将不存在`/var/run/reboot-required`时`stat`的预期stderr提升为异常，在输出汇总前停止。
- 已把reboot探测修正为无stderr且返回0的只读`find`，但遵守失败即停未自动复跑。当前已知APT索引已刷新，实际upgrade/安装/autoremove/重启仍未执行；完整下载量、磁盘变化和差异报告等待一次明确允许的本地汇总器复跑。

## 门禁B刷新后最终报告

- 用户允许复跑修正后的本地只读汇总器；执行成功并输出`D3_APT_REFRESH_AUDIT=true`。
- 刷新后仍为58升级、0新增、0删除、1未升级；两个hold不变，当前无reboot marker，内核/引导链候选数0。
- 下载49,125,108 bytes（46.85MiB）、安装变化-6KiB（-0.01MiB）；相对原58包基线新增0、移除0，总量完全一致。
- 完整包名、已安装/候选版本、单包下载量和安装变化见`docs/qa/production-deployment/d3-apt-refresh-report.md`。
- 远端只读汇总阶段未再次执行`apt-get update`，未创建报告或修改系统；所有SSH连接结束。实际upgrade仍等待独立E授权。
