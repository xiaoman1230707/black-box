# D4.2 Secret、Compose策略与PostgreSQL权限报告

> 日期：2026-07-22
> 状态：已实施并人工验收通过
> 候选：`6e182d477da82a74a0a447bfc7e1f1d77aa4faed`
> 安全边界：本文只记录变量名、角色和PASS/FAIL，不记录真实域名、endpoint、连接串、key、密码或secret长度

## 1. Secret注入

- 用户在自己的deploy交互终端通过`root:root 0600`临时输入文件可见校对两枚外部服务key；agent未读取文件内容。
- 正式注入成功输出仅包含完成标记和文件计数；成功后临时输入文件被精确删除。
- 六个secret env均为`root:root 0600`；非secret `release.env`为`root:root 0644`。
- 首次SSH stdin Base64因PowerShell原生管道编码损坏而失败；旧`.part`保留且未执行。两版隐藏输入脚本因终端粘贴确认不一致均在写文件前退出。最终改用root-only可见编辑文件，未放宽key格式或输出值。

## 2. Env与Compose静态门禁

- 七个env文件的存在、owner/mode、精确变量集合、非空、URL、固定模型、正整数超时、JWT强度和跨文件一致性：PASS。
- 生产embedding角色固定为302.AI OpenAI-compatible API、`text-embedding-3-small`、1536维；base URL版本段契约：PASS；OpenAI官方直连、自动回退或供应商切换：未配置。
- Compose静态解析包含8个服务；API、数据库及6个tools服务的7项最小权限策略：PASS。
- 常驻API只读`runtime.env`；数据库只读`postgres.env`；各一次性工具按database/demo/embedding/preflight职责最小注入：PASS。
- API宿主发布仅loopback 3000，PostgreSQL无宿主5432发布；AI preflight不持有数据库、uploads或demo密码：PASS。

## 3. PostgreSQL UID/GID与持久目录

- 使用固定PostgreSQL镜像执行一次`--network none`、无挂载、`--rm`探测；实测postgres用户为UID/GID `999:999`。
- 写入前`/srv/black-box/postgres`为`root:root 0700`且完全为空；仅在空目录断言通过后收敛为`999:999 0700`，写入后仍为空。
- uploads为`10001:10001 0750`，backups为`root:root 0700`：PASS。
- 容器数0；3000/5432监听0；failed units 0。未启动Compose、API或PostgreSQL。

## 4. 资源与收尾

- 根盘使用约21%，可用空间约29.6GiB；可用内存约1.09GiB；Swap约2GiB且基本空闲，满足D4后续串行执行门禁。
- 可见临时输入和Compose临时JSON均已删除；本机SSH/SFTP/SCP进程0；deploy sudo缓存已清除。
- 两次终态命令分别因远端`awk`被PowerShell转义及无效`sudo -n -K`组合非零；此前状态输出均通过，随后仅以无`awk`资源命令和标准`sudo -K`补证，未重复任何权限写入。
- `CLAUDE.md`哈希保持`E901EB626C3F92EFC47A0AA1B6BDC8D123D9155CCBDB5803578542735B9691A2`，Git暂存区为空。

## 5. 人工门禁终态

- 用户已确认本轮最终写入ECS的是供应商侧已轮换、未在聊天中暴露的新key；安全门禁关闭。
- D4.2人工验收通过。该结论不授权D4.3，不授权启动数据库、执行migration/seed、调用AI或embedding。
