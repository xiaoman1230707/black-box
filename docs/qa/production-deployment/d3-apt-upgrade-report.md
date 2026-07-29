# D3.3 门禁B软件包更新报告

> 日期：2026-07-19
> 状态：D3.3已人工验收通过并正式关闭；未重启，Swap重启持久性留D3.6

## 授权与范围

- 用户独立授权：仅对安装前报告确认的58个包执行一次普通`apt-get upgrade`。
- 明确禁止：`dist-upgrade`、`full-upgrade`、`autoremove`、release upgrade、额外软件安装、解除hold、重启和D3.4。
- `cloud-init`、`intel-microcode`两个hold保持不变。
- OpenSSH更新期间保留用户的原deploy会话；agent不接触sudo密码。

## 首次停止与修正

- 首次脚本在写入前输出`D3_APT_UPGRADE_COMPLETE=false`，未运行实际upgrade。
- 只读复核证明APT仍为58升级、0新增、0删除、1保留，版本与下载量未漂移。
- 根因是比较器只对实际包名使用`LC_ALL=C sort`，预期清单保持人工顺序；连字符与句点的C序差异导致6项纯顺序误报。
- 用户明确允许第二次执行后，仅将预期包名同样经过`sort -u`；修正版本地/远端SHA-256一致，`bash -n`通过。首次失败证据继续保留。

## 实际更新

- 成功证据目录：`/root/black-box-d3-apt-20260719T123751Z`；目录为root私有，仅记录受控路径，不复制内容或secret到仓库。首次写入前停止的证据另保留于`/root/black-box-d3-apt-20260719T123245Z`。
- 写入前精确断言通过：58升级、0新增、0删除、1保留；包名及已装/候选版本与批准报告一致；无内核镜像、模块、GRUB、shim或其他引导链候选。
- 唯一写入命令为`apt-get -y -o Dpkg::Options::=--force-confold upgrade`；现有配置一律保留，不选择覆盖。
- APT history记录事务从20:37:56至20:38:40，更新集合为批准的58包。
- 脚本终态：`D3_APT_UPGRADE_COMPLETE=true`、`D3_APT_REBOOT_REQUIRED=false`。
- `dpkg --audit`为空；58包均达到批准的目标版本；升级后模拟为0升级、0新增、0删除、1保留，保留项为hold中的`cloud-init`。

## OpenSSH与新会话

- `openssh-client`、`openssh-server`、`openssh-sftp-server`均从`1:8.9p1-3ubuntu0.15`升级至`1:8.9p1-3ubuntu0.16`。
- 脚本在root上下文完成SSH配置SHA-256不变、`sshd -t`、root/deploy双上下文`sshd -T -C`及hardening最终值断言后才输出成功标记。
- agent随后建立全新、显式deploy身份的SSH会话成功，确认身份与home正确；证明升级后公钥登录可用。
- 首次独立复核命令中的两处`$(systemctl ...)`被本地PowerShell提前展开，服务值为空；其余远端检查已完成且无写入。随后改用无命令替换的只读命令补采，`ssh.service`与`chrony.service`均为active/enabled。
- 所有agent新建的SSH连接均已关闭；用户可在收到本报告后关闭原保留deploy会话。

## 系统终态

- hold：`cloud-init`、`intel-microcode`，无变化。
- `dpkg --audit`：空。
- `systemctl --failed`：0项。
- 时间：`NTPSynchronized=yes`，chrony active/enabled，时区保持既有配置。
- Swap：`/swapfile`仍启用，运行时`vm.swappiness=10`；未执行重启，重启持久性仍留D3.6。
- reboot marker：false；本批不重启。
- 剩余普通upgrade：0；仅`cloud-init`因hold保留。

## 回滚与停止口径

- 包更新已成功，不执行自动降级。若后续发现回归，必须独立评审受影响包及恢复来源，不能复用本批授权。
- 原SSH hardening配置未改变；不得恢复root SSH或放宽认证。
- 用户已确认D3.3整体验收通过；本批正式关闭，不因进入D3.4而补做重启。

## 临时脚本收口

- 删除前远端`/home/deploy/d3-apt-upgrade.sh`的最终SHA-256为`2D3095BCBBC5BA72528C94E888990C28DE30AC67ECA8BA49EEC222D836C51D52`，owner/group为`deploy:deploy`，mode为`0700`，大小10,356 bytes。
- 远端SHA与本地审计副本完全一致；对同SHA本地副本扫描private key、常见云访问key、AI/JWT/数据库/演示密码赋值等敏感模式，命中0。
- 证据回填后按用户明确授权删除该远端精确路径，并验证`D3_REMOTE_SCRIPT_REMOVED=true`；root私有APT证据目录保留。
- 删除后本机`ssh/scp/sftp`进程数0，已建立到22端口的连接数0；全部SSH连接关闭。
