# D3.5 门禁 B：UFW SSH 单源放行实施报告

> 日期：2026-07-20
> 状态：已实现、已人工验收并完成现场清理
> 范围：仅启用 UFW 并保留唯一可信管理 IPv4 `/32` 到 `22/tcp`；未开放 80/443，未修改安全组、SSH、Docker 发布、镜像、数据库或 D4

## 1. 前置与地址安全

- 用户独立授权门禁 B 后，先以新 deploy 会话执行 `sudo -n true`，确认全局缓存可用才继续。
- 写入前确认 UFW 0.36.1 为 inactive、无 user rule，`IPV6=yes`，默认策略已是 deny incoming、allow outgoing、deny routed；Docker 容器为 0，监听仅 22、53。
- 真实管理地址由用户在保留的原 deploy 终端静默输入，并与该会话 `SSH_CONNECTION` 来源严格匹配。地址未进入仓库、脚本、命令行参数、环境变量、shell history 或 QA。
- 为避免 UFW CLI 把 source CIDR 放入 argv，固定 helper 从 stdin 读取地址并复用系统 `ufw.frontend`、parser、backend 与 `/run/ufw.lock`，地址最终只落入 UFW 实际规则。

## 2. 测试先行与施工

- 首次只读 parser 测试暴露直接调用 frontend 缺少官方入口 `gettext.install()`；测试在规则写入前失败，UFW 未变化。
- 对照 `/usr/sbin/ufw` 确认根因后补同一 gettext 初始化；使用 TEST-NET `/32` 的相同只读解析返回 `UFW_RULE_PARSE_OK=true`，再进入真实写入。
- root 脚本先生成脱敏前置证据与四个配置备份，再添加带固定 comment 的唯一 IPv4 SSH allow，最后执行 `ufw --force enable`。脚本返回 `D3_UFW_GATE_B_APPLY_COMPLETE=true`，原 deploy 会话保持开启。
- 固定回滚脚本不保存地址；若新会话失败，只会禁用 UFW 并从本批 root 证据恢复写入前配置，不会放宽到 `0.0.0.0/0`、修改 sshd、安全组或密钥。

## 3. 防锁死与终态

- 第二个全新 deploy 会话完成密钥登录，身份仍为 deploy/sudo 组，跨会话 `sudo -n` 成功。
- 独立 root 验证结果：UFW active；默认策略为 deny-in、allow-out、deny-routed；IPv4 SSH allow 为 1，IPv6 SSH allow 为 0；唯一规则目标为 `22/tcp`。
- 80、443、3000、3389、5432、2375、2376 均无监听；监听仍仅 22、53。Docker 29.6.2、日志驱动 `json-file`、容器/镜像 0，Docker/containerd active+enabled，failed units 为空。
- `IPV6=yes` 保留，但未创建 IPv6 SSH allow。阿里云安全组未修改；Compose 的 API loopback 与 PostgreSQL 不发布宿主端口契约未变化。
- 验证成功后 agent 执行 `sudo -K` 清除全局缓存；第二个会话自动关闭，用户随后关闭原会话。本机 SSH/SCP/SFTP 进程和已建立 22 端口连接均为 0。

## 4. 证据完整性

- root 脱敏证据目录为固定本批时间戳目录；远端暂保留到人工验收后再申请精确清理。
- 脱敏证据归档已保存到仓库外 `C:\Users\15593\Black-box-backups\d3-ufw-gate-b-20260720T075037Z`，归档 SHA-256 为 `009646C83DF655A4090F44A6556F68732FF9DA3FCD670A91CF941E55D2E587F7`。
- 归档包含 20 个文件；内部 manifest 为 19/19 通过。文本扫描的 secret 命中为 0，真实 IPv4 命中为 0；归档中规则来源显示为 `<ipv4>`。
- 远端交互、root、回滚、验证和内存 helper 脚本暂保留供审查，均不包含真实管理地址。

## 5. 当前门禁

门禁 B 已获用户人工验收并正式关闭。仓库外证据保留不变；远端 root evidence、导出归档、运行 marker 和五个固定脚本在路径、SHA、20 个文件集合及 19/19 manifest 通过后按精确路径删除，未使用通配符扩大清理。独立复核确认正式 UFW 规则、sudoers drop-in、Docker 配置、持久目录与系统日志不变，UFW 仍 active且唯一 SSH rule仍在，监听仍仅22、53。80/443、安全组、重启、镜像上传和 D4 均未执行。
