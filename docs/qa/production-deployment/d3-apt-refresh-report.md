# D3.3 门禁B APT刷新后安装前报告

> 日期：2026-07-19
> 状态：`apt-get update`与只读upgrade模拟已完成；实际upgrade尚未授权或执行

## 汇总

- hold：`cloud-init`、`intel-microcode`，与刷新前一致。
- 模拟：58 upgraded、0 newly installed、0 remove、1 not upgraded。
- 与原58包基线对比：新增0、移除0，包名集合完全一致。
- 下载量：49,125,108 bytes（46.85MiB），与原基线一致。
- 安装后磁盘变化：-6KiB（-0.01MiB），与原基线一致。
- 内核/引导链候选：0；`linux-libc-dev`是用户空间头文件，不是运行内核。
- 当前reboot marker：false。
- 根盘：总40,901,312KiB，已用5,403,680KiB，可用33,607,264KiB，使用率14%；增加的主要固定占用包含已验收的2GiB Swap文件。
- 实际upgrade、dist/full-upgrade、autoremove、安装、重启和D3.4均未执行。

## 完整候选清单

| 包 | 已安装版本 | 候选版本 | 下载bytes | 安装变化KiB |
|---|---:|---:|---:|---:|
| gzip | 1.10-4ubuntu4.1 | 1.10-4ubuntu4.2 | 96114 | 0 |
| ncurses-bin | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 184012 | 1 |
| libperl5.34 | 5.34.0-3ubuntu1.5 | 5.34.0-3ubuntu1.7 | 4817262 | 0 |
| perl | 5.34.0-3ubuntu1.5 | 5.34.0-3ubuntu1.7 | 231662 | 0 |
| perl-base | 5.34.0-3ubuntu1.5 | 5.34.0-3ubuntu1.7 | 1762684 | 0 |
| perl-modules-5.34 | 5.34.0-3ubuntu1.5 | 5.34.0-3ubuntu1.7 | 2976778 | 1 |
| tar | 1.34+dfsg-1ubuntu0.1.22.04.2 | 1.34+dfsg-1ubuntu0.1.22.04.5 | 298218 | 4 |
| ncurses-base | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 20122 | 1 |
| python3.10-dev | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 507880 | 0 |
| libpython3.10-dev | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 4765572 | 12 |
| libpython3.10 | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 1949732 | 0 |
| python3.10 | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 508498 | 1 |
| libpython3.10-stdlib | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 1850036 | 8 |
| python3.10-minimal | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 2254098 | -19 |
| libpython3.10-minimal | 3.10.12-1~22.04.15 | 3.10.12-1~22.04.16 | 816758 | 1 |
| libncurses6 | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 111272 | 0 |
| libncursesw6 | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 147456 | 0 |
| libtinfo6 | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 104560 | 1 |
| libsqlite3-0 | 3.37.2-2ubuntu0.5 | 3.37.2-2ubuntu0.6 | 641588 | 0 |
| ntfs-3g | 1:2021.8.22-3ubuntu1.3 | 1:2021.8.22-3ubuntu1.4 | 408404 | 0 |
| libntfs-3g89 | 1:2021.8.22-3ubuntu1.3 | 1:2021.8.22-3ubuntu1.4 | 162532 | 0 |
| openssh-sftp-server | 1:8.9p1-3ubuntu0.15 | 1:8.9p1-3ubuntu0.16 | 38850 | 0 |
| openssh-server | 1:8.9p1-3ubuntu0.15 | 1:8.9p1-3ubuntu0.16 | 435750 | 0 |
| openssh-client | 1:8.9p1-3ubuntu0.15 | 1:8.9p1-3ubuntu0.16 | 903878 | 4 |
| ca-certificates | 20240203~22.04.1 | 20260601~22.04.1 | 140666 | -54 |
| iproute2 | 5.15.0-1ubuntu2.1 | 5.15.0-1ubuntu2.2 | 1072048 | 0 |
| libxml2 | 2.9.13+dfsg-1ubuntu0.11 | 2.9.13+dfsg-1ubuntu0.12 | 764660 | 0 |
| tzdata | 2026a-0ubuntu0.22.04.1 | 2026b-0ubuntu0.22.04.1 | 347850 | 0 |
| ubuntu-pro-client-l10n | 37.2ubuntu~22.04 | 37.2ubuntu~22.04.1 | 1384 | -36 |
| ubuntu-pro-client | 37.2ubuntu~22.04 | 37.2ubuntu~22.04.1 | 237924 | 1 |
| ubuntu-advantage-tools | 37.2ubuntu~22.04 | 37.2ubuntu~22.04.1 | 10912 | 0 |
| vim | 2:8.2.3995-1ubuntu2.31 | 2:8.2.3995-1ubuntu2.34 | 1732198 | 1 |
| vim-tiny | 2:8.2.3995-1ubuntu2.31 | 2:8.2.3995-1ubuntu2.34 | 706982 | 1 |
| vim-runtime | 2:8.2.3995-1ubuntu2.31 | 2:8.2.3995-1ubuntu2.34 | 6831086 | 7 |
| xxd | 2:8.2.3995-1ubuntu2.31 | 2:8.2.3995-1ubuntu2.34 | 51586 | 1 |
| vim-common | 2:8.2.3995-1ubuntu2.31 | 2:8.2.3995-1ubuntu2.34 | 81490 | 1 |
| libnghttp2-14 | 1.43.0-1ubuntu0.3 | 1.43.0-1ubuntu0.4 | 76932 | 0 |
| ubuntu-release-upgrader-core | 1:22.04.20 | 1:22.04.21 | 26312 | 0 |
| python3-distupgrade | 1:22.04.20 | 1:22.04.21 | 106660 | 4 |
| wget | 1.21.2-2ubuntu1.1 | 1.21.2-2ubuntu1.3 | 338726 | 0 |
| cups-common | 2.4.1op1-1ubuntu4.20 | 2.4.1op1-1ubuntu4.21 | 254274 | 0 |
| cups-bsd | 2.4.1op1-1ubuntu4.20 | 2.4.1op1-1ubuntu4.21 | 36940 | 0 |
| cups-client | 2.4.1op1-1ubuntu4.20 | 2.4.1op1-1ubuntu4.21 | 126594 | 0 |
| libcups2 | 2.4.1op1-1ubuntu4.20 | 2.4.1op1-1ubuntu4.21 | 265558 | 0 |
| curl | 7.81.0-1ubuntu1.24 | 7.81.0-1ubuntu1.25 | 193650 | 0 |
| libcurl4 | 7.81.0-1ubuntu1.24 | 7.81.0-1ubuntu1.25 | 291466 | 0 |
| libcurl3-gnutls | 7.81.0-1ubuntu1.24 | 7.81.0-1ubuntu1.25 | 284452 | 0 |
| fwupd | 2.0.20-1ubuntu2~22.04.1 | 2.0.20-1ubuntu2~22.04.2 | 4330468 | -4 |
| libfwupd3 | 2.0.20-1ubuntu2~22.04.1 | 2.0.20-1ubuntu2~22.04.2 | 156098 | 0 |
| libidn12 | 1.38-4ubuntu1 | 1.38-4ubuntu1.1 | 60498 | 0 |
| libmysqlclient21 | 8.0.46-0ubuntu0.22.04.2 | 8.0.46-0ubuntu0.22.04.3 | 1335974 | 0 |
| ncurses-term | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 267494 | 1 |
| libncurses5 | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 106526 | 0 |
| libtinfo5 | 6.3-2ubuntu0.1 | 6.3-2ubuntu0.2 | 99990 | 1 |
| libnss3 | 2:3.98-0ubuntu0.22.04.3 | 2:3.98-0ubuntu0.22.04.4 | 1347044 | 0 |
| linux-libc-dev | 5.15.0-181.191 | 5.15.0-186.196 | 1360858 | 48 |
| python3-httplib2 | 0.20.2-2 | 0.20.2-2ubuntu0.1 | 33428 | 6 |
| python3-idna | 3.3-1ubuntu0.1 | 3.3-1ubuntu0.2 | 52664 | 1 |

## 放行结论

刷新后的候选集合满足“无内核/引导链升级、无包删除、两个hold不变”的安装前条件，但本报告不授权实际upgrade。下一步必须由用户单独授予门禁B实际软件更新E权限；写入前仍需再次短模拟，任何候选漂移即停止并重新评审。
