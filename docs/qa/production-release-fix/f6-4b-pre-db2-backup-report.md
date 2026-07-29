# F6.4-B pre-DB2生产配对备份报告

> 状态：已实施，用户人工验收通过
> 恢复点标识：F6 release / pre-DB2（不是B2或B3）

## 1. 授权边界

本门禁只允许使用固定`FIX_RELEASE_SHA`中的修复版`backup-pair.sh`停止API、生成并验证database/uploads配对备份、通过默认SFTP建立仓库外异机副本，并在两端证据全部通过后恢复同一新API。

禁止migration、seed、restore、embedding、AI、cleanup及任何业务写入；禁止修改Nginx、证书、DNS、Vercel、UFW、安全组、SSH或secret。

## 2. 执行结果

首次前置连接中`sudo -n true`返回需要认证，门禁在任何远端写入、API停止、数据库读取或SFTP前结束。用户需在自己的deploy终端执行`sudo -v`建立缓存后才能恢复；agent不接触密码。

用户建立缓存后，前置门禁完整通过：

- 固定FIX SHA及新API镜像身份正确；API与db均healthy，API仅绑定`127.0.0.1:3000`；
- migration为总计3、finished 3、rolled-back 0，九张业务表总行数0，DB-2未执行；
- 无migrate、seed、embedding、cleanup、AI preflight或其他写工具运行；
- B0、B1、旧release及旧镜像均完整可读；
- 新唯一备份根不位于uploads或真实Git工作树，开始前不存在complete或`.incomplete`；
- 内存、Swap、磁盘与swappiness满足既定阈值；六个secret env只核对owner/mode，未读取值。

## 3. 远端配对恢复点

仅使用固定FIX SHA部署目录内、SHA-256已锁定的修复版`backup-pair.sh`。脚本按契约停止API并生成唯一恢复点：

`/srv/black-box/backups/f6-release-pre-db2-20260723T032954Z/20260723T032958Z-72350a77acf59ad179b9a89b19544c162033e0ae`

恢复点用途在manifest中明确为`F6 release / pre-DB2`与`post-fix, pre-DB2`，未命名为B2/B3。manifest记录固定FIX SHA、API镜像ID、PostgreSQL配置引用/镜像ID/repo digest、三条migration及database/uploads绝对路径、大小与SHA。

- `database.dump`：26,567 bytes；SHA-256 `0fd95c8384968ead2973604e56239d394a91507960913e286b27c59eed251177`；
- `uploads.tar.gz`：99 bytes；SHA-256 `5ec240651ee71c31d496b0eb06caa7a1dc69e385551e1bf5d3e1c1f1a11b6e3e`；
- `manifest.json`：1,445 bytes；SHA-256 `93619a447ff89dff5af882387f7bbd5b6f674bce9b0a335df425c81b3eca8d1d`；
- `SHA256SUMS`：161 bytes；SHA-256 `c3d831848f94ea0cdeb2da63a1d2e22f183aa71a2d46d25917f9985ba29fc23d`。

内部`SHA256SUMS`、`pg_restore --list`、`tar -tzf`及manifest字段/大小/SHA一致性全部通过。uploads归档只有1个真实目录控制项，没有伪造业务媒体。

## 4. 默认SFTP异机副本

四项文件通过一次默认SFTP下载到仓库外全新目录：

`C:\Users\15593\Black-box-backups\f6-release-pre-db2-20260723T032954Z`

未使用legacy SCP，未覆盖既有备份。四项本地大小与SHA逐项等于远端；本地内部SHA、`pg_restore --list`、tar可读性和manifest语义全部通过。验证后仅精确删除临时deploy导出目录，正式远端恢复点与本地副本均保留。

## 5. API恢复与当前停止点

两端证据全部通过后，仅重新启动同一新API容器。容器完整ID保持不变，固定镜像、running+healthy、OOM=false、restart=0、loopback 3000、liveness与空分页再次通过；db持续healthy。终态运行服务精确为api和db，Nginx保持inactive+disabled，80/443关闭。

最终sudo清理命令因本地到远端的引号转义错误，被远端shell以语法错误拒绝；没有证据表明`sudo -K`已执行。该错误发生在备份、下载验证、API恢复和临时导出清理全部完成之后，不影响正式恢复点或服务状态。按失败即停约束未自动重试，也未修改sudoers。

用户随后明确授权独立收尾。纠正后的单一SSH命令没有重复备份、下载、API或数据库操作：`sudo -K`退出0，随后`sudo -n true`退出1，证明全局timestamp已清除。SSH关闭后F6.4-B标记为“已实施，待用户人工验收”。

用户已于2026-07-23最终确认F6.4-B及08生产发布修复批次人工验收通过。本恢复点仍严格标识为“F6 release / pre-DB2”，不是B2/B3；该确认不授权DB-2或任何后续生产写入。
