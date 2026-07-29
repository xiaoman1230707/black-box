# D3.4 安装证据关闭记录

> 日期：2026-07-20
> 状态：已人工验收通过；本地证据闭环完成；远端临时证据待按已授权范围清理

## 1. 远端证据元数据

- 安装脚本：`/home/deploy/d3-software-install.sh`，`deploy:deploy`、`0700`、9,534 bytes，SHA-256 为 `8603F81699CB29903DA48FF2380CEB8A554F96C3F7FBDFC86809DE83D72E0CBD`。
- root 证据目录：`/root/black-box-d3-software-20260720T031451Z`，`root:root`、`0700`；包含 34 个 `0600/root:root` 文件，总文件大小 146,177 bytes。
- 导出目录：`/home/deploy/d3-preflight-export-20260720T031451Z-v4`。来源校验仅记录 `SSH_SOURCE_MATCH_TRUSTED_IPV4=true`，未记录实际地址。

## 2. 本地保全与完整性

- 完整原始导出保存在仓库外：`C:\Users\15593\Black-box-backups\d3-host-evidence-20260720T031451Z`。
- 共 7 个文件、56,200 bytes；复制后逐文件 SHA-256 与下载源一致。
- `export-files.sha256` 6/6 通过；`d3.4-export.sha256` 2/2 通过；归档内 `d3.4-files.sha256` 34/34 通过。
- `d3.4-root-evidence.tar.gz` 可解压，大小 29,842 bytes，SHA-256 为 `ACCEDA0BCD05AF4A3F5C708AC30534B4D80B0EC52B101001A3956A289ADD5EEB`。
- `d3.5-preflight.txt` 大小 7,927 bytes，SHA-256 为 `C838731906BEDB10D0B3AD0FE253480903CA2A6694769302D4FC7C9714E854D5`。

## 3. 安全扫描与仓库边界

- 对解压后的 40 个文本文件执行 secret 模式扫描：0 个文件命中 private key、数据库连接串、JWT/AI key、seed 密码或带凭据 URL。
- 9 个原始安装证据文件包含软件或网络输出中的 IPv4 字面量，因此完整原始证据只保存在仓库外，不复制到 Git 工作树。
- 本文与 D3.5 QA 仅保留脱敏结论、大小和 SHA-256，不记录公网 IP、可信管理 IP、私钥路径、密码或 secret 值。

## 4. 清理边界

本地证据闭环后，只删除本轮 D3.4 安装脚本、安装 root 证据、临时导出脚本及 v1～v4 导出目录。不得删除 Docker/PGDG APT source、keyring、已安装软件、系统日志、SSH/Nginx/Docker 配置或 D3.3 以前的正式证据。清理完成后须验证目标路径不存在并确认 SSH 连接归零。
