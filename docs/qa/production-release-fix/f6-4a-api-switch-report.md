# F6.4-A 生产API切换与生命周期验收报告

> 状态：已实施，用户人工验收通过

## 1. 范围

本门禁仅允许：保存旧API与旧非secret release引用证据、原子切换`release.env`的三个非secret发布字段、仅启动新API、执行只读健康链路、一次10秒SIGTERM并重启同一新API。

F6.4-B生产配对备份、migration、seed、AI、cleanup、Nginx、证书、DNS、Vercel及公网规则均不在授权内。

## 2. 固定切换身份

- `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`。
- API镜像ID：`sha256:4f73d61202fb2cb2d3044a27a10a127bdbee1a263bbb8296b6a567203939a89d`。
- 原生产db和旧停止API必须在切换前精确匹配既有完整ID与状态。

## 3. 执行前sudo门禁（已完成）

F6.3收尾已清除sudo timestamp。执行F6.4-A前，用户已在自己的deploy终端执行`sudo -v`建立缓存；agent未读取、索取或传递密码。缓存建立后才连接ECS并开始切换。

## 4. 切换前证据与边界

切换前全部门禁通过：

- 原生产db完整ID不变，running+healthy、OOM=false、restart=0，9张业务表总行数仍为0；
- 旧API保持exited 137、非OOM、无restart，其脱敏完整inspect、最近日志摘要、镜像/退出/Compose标签与时间信息已保存；
- 旧`release.env`副本及SHA-256、旧release原始SHA清单校验均保存到root受控证据；
- 旧镜像、旧release、B0和B1均完整可读；B0/B1内部SHA、`pg_restore --list`和uploads归档可读性通过；
- 新release、compose与固定镜像身份通过；六个secret env保持`root:root 0600`，未读取或输出值；
- Nginx保持inactive+disabled，80/443/3000切换前无监听。

root受控证据目录为`/root/black-box-f64a-20260723T031107Z`；文件均为0600并建立内部`SHA256SUMS`。敏感内容扫描为0。该目录是切换证据，不是F6.4-B生产配对备份。

## 5. 原子切换与首次健康核验

旧非secret release引用先复制留证，再通过唯一临时文件生成新引用、Compose静态解析和原子rename。仅替换：

- `RELEASE_SHA`为固定FIX SHA；
- `API_IMAGE`为对应固定tag；
- `API_IMAGE_DIGEST`为固定新镜像ID。

数据库、schema、migration、uploads及六个secret env均未修改。Compose仅对`api`执行`up -d --no-deps --no-build`，按用户授权替换已停止旧API对象；旧镜像、旧release、B0/B1未删除。

新API容器ID为`b8a95d2ff72b46063aa13fcae5fac614579096d98cc71fe7ed40a5b12f73eb91`。固定镜像ID、OCI revision、`10001:10001`、running+healthy、OOM=false、restart=0及`127.0.0.1:3000`绑定全部通过。`/api` liveness、PostgreSQL healthy和空帖子分页均通过。

## 6. 唯一一次SIGTERM与重启

- 10秒停止窗口的实际耗时：`483ms`；
- 停止后exit code=`0`、OOM=false、restart=0；
- Docker events存在signal 15，不存在signal 9，die事件exit 0；
- 停止后loopback HTTP不可达，db持续healthy；
- 随后仅重新启动同一个新API容器对象，完整ID不变；
- 重启后镜像/OCI/非root/health身份、liveness、空分页和loopback绑定再次通过。

终态运行服务精确为`api,db`。新API与原db均healthy；Nginx保持inactive+disabled，80/443未监听，API仅监听loopback 3000。

Docker Compose正常的Recreate/Start/Stop进度写入stderr，导致本地PowerShell把外层捕获标为NativeCommandError；远端脚本已输出完整`F6_4A_API_SWITCH_COMPLETE=true`并通过全部末尾断言，因此不是远端切换失败，也未重跑。

## 7. 禁止项与收尾

- 未执行migration、seed、embedding、AI、cleanup、restore或backup；
- `F6_4B_BACKUP_EXECUTED=false`；
- 未修改Nginx、证书、DNS、Vercel、UFW、安全组或SSH；
- `sudo -K`退出0，负向`sudo -n true`退出1；SSH关闭。

用户已于2026-07-23人工确认F6.4-A通过。F6.4-B随后获得独立授权，仅用于创建“F6 release / pre-DB2”生产配对恢复点。
