# F6.2 新候选制品上传前置门禁停止报告

> 状态：前置核验失败，F6.2暂停；未上传、未创建新SHA目录、未导入镜像

## 1. 固定候选

- `FIX_RELEASE_SHA=72350a77acf59ad179b9a89b19544c162033e0ae`。
- 本地四项固定制品在连接前重新计算大小与SHA-256，均与F4人工验收身份一致。
- 原始`SHA256SUMS`为LF、无BOM，未转码或重写。

## 2. 停止点

F6.2远端前置脚本依次完成：

1. `sudo -n`可用性检查；
2. 新SHA专属release、compose和唯一staging路径不存在检查；
3. 现有Docker容器集合与F6.1“仅db”基线比较。

第三步返回`ERROR: unexpected existing container count`并以非零状态退出。脚本尚未执行release目录创建，也未进入资源检查后的任何写入步骤。该结果说明F6.1之后容器集合发生了需要独立只读确认的漂移；当前证据不足以判断是新增运行容器、停止容器或遗留的一次性容器，不作猜测。

## 3. 未发生事项

- 未建立SFTP会话，四项制品均未上传；
- 未创建新SHA release、compose或staging目录；
- 未执行原始`SHA256SUMS`远端校验或bundle展开；
- 未执行`docker load`，未拉取或修改PostgreSQL镜像；
- 未启动、停止、删除或重启任何容器；
- 未读取或写入生产数据库，未执行migration、seed、restore、embedding、cleanup或AI；
- 未修改secret、Nginx、证书、DNS、Vercel、UFW、安全组或SSH。

## 4. 恢复门禁

后续独立只读诊断已确认：第二个对象是D4.4按要求保留的旧候选API停止容器，不是F6.1后的新增漂移；生产db仍为原容器且healthy。根因是本前置脚本把“仅db运行”错误收紧为“全部容器对象总数为1”。完整证据及恢复口径见`f6-2-container-drift-diagnostic-report.md`；未经用户确认仍不得恢复上传。
