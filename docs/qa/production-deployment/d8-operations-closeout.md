# D8 运维交接与部署收口

## 状态

- 状态：D8.0～D8.4均已实施并通过用户人工验收；07生产部署批次正式关闭，未自动进入第五期。
- 固定 `RELEASE_SHA`：`b6b3d93866e390eb2e37bd52649fa2628403b1b4`。
- D7 已于 2026-07-28 通过用户最终人工验收。
- 本批不创建快照、EIP、OSS/COS 或其他新增付费资源，不实际执行下线或资源释放。

## D8.0 基线

- 主工作树历史改动原样保留，暂存区为空；`AGENTS.md`、`CLAUDE.md`不纳入D8修改。
- 生产运行态初步只读核对：API镜像对应固定release并healthy，db healthy；uploads为24个文件。
- sudo缓存首次检查失败后由用户在自己的deploy终端重新建立，agent未接触密码。
- 首次只读封装被本机PowerShell提前展开远端命令替换；第二次资源采集的awk表达式被跨shell引号拆分。两次均无远端写入，后续改用本地语法与SHA校验的一次性脚本。
- 一次性预检脚本v1通过远端`bash -n`后执行，容器/镜像/one-off门禁通过，但首条数据库只读SQL因使用Prisma字段名`titleEmbedding`而非物理列`title_embedding`停止；未执行备份或任何生产写入。v1保留为失败证据，v2仅修正物理列名。
- v2本地/远端SHA一致、远端`bash -n`通过。执行结果：API/db均running+healthy、OOM=false、restart=0，release身份正确，one-off为0；User/Post/Comment/Like/File/Avatar=`6/36/13/31/11/1`，migration=3，embedding=`0 null / 36 non-null`；uploads=`24 files / 497958 bytes`；内存、Swap、磁盘、failed units及liveness/readiness全部通过。

## D8.1 上线后配对备份

- 正式远端目录：`/srv/black-box/backups/20260728T072233Z-b6b3d93866e390eb2e37bd52649fa2628403b1b4`。
- 本地仓库外副本：`C:\Users\15593\Black-box-backups\D8-online-20260728T072233Z-b6b3d938`。
- `database.dump`：296683 bytes，SHA-256 `6673aaa014ee5f6e8730bf3cf29ed9997f75af9bc2d7f7441fd164d2d1661563`。
- `uploads.tar.gz`：382992 bytes，SHA-256 `4b114fc1c716a1d8e64e8e03d7469a357c5e1f295c6d1332f98beb891c621e98`。
- `manifest.json`：857 bytes，SHA-256 `86fa417de0ee876687912a2a1b0c3dd1894b3d1a671849076e1bd6e14c829c7c`。
- `SHA256SUMS`：161 bytes，SHA-256 `0764489d5ea843d504c01ecd6b18c1e753269f9542376fe744ebb12551ff31e1`。
- 远端和本地均通过内部SHA、`pg_restore --list`、`tar -tzf`与manifest release/image/3 migrations语义核对。
- 备份脚本唯一执行并按契约停止API；远端验证封装首次因相对清单目录作用域错误停止，未重跑备份。改用绝对路径完成验证后恢复同一API。首次40秒健康等待结束时API尚未healthy，未重复启动；随后只读inspect确认其已自然进入healthy，liveness/readiness通过。
- 备份后再次运行v2只读审计，生产数据、uploads、release和资源无漂移。deploy导出副本及两份远端临时预检脚本已按精确路径删除；正式远端备份与本地副本保留。

## D8.2 监控与费用

- 初始只读快照中仅发现阿里云助手与安全代理，尚未发现CloudMonitor主机监控agent；该历史缺口已在本批获得用户授权后关闭，当前LoongCollector 4.0.0运行中，CPU、内存与磁盘指标已上报。
- 已固定控制面告警矩阵：CPU不低于80%持续5分钟；内存不低于85%；根磁盘70%预警、85%严重；API liveness、Prisma readiness与db readiness连续两次失败；Nginx 5xx在5分钟窗口出现；证书剩余30天/14天。
- 阿里云控制台登录后只读核对：目标ECS已出现在主机监控列表，但Agent版本/状态为空，CPU、内存、磁盘均显示无数据；报警联系人列表为空。自动安装入口明确要求创建`AliyunServiceRoleForCloudMonitor`服务关联角色，以允许云监控通过云助手安装主机监控插件。
- 控制面已完成服务关联角色、Agent安装、联系人组成员绑定和三条主机告警规则；临时测试规则触发后，用户已确认实际收到通知，通知可达性闭环。个人联系方式未由agent从账户资料读取或写入项目证据。
- 费用清单已建立：ECS、系统盘/独立磁盘、快照、EIP、公网出流量、域名、Vercel、DeepSeek、embedding供应商和可选异机备份存储分别核对。50%/75%/90%为人工额度提醒；`0.167元/小时`与约`1796.4小时`仅为历史估算，最终以账单控制台为准。
- 责任边界：用户负责云账号、联系人、账单、DNS/Vercel及供应商账户；执行agent负责技术状态和脱敏证据；验收方负责实际通知可达性。未创建快照、EIP、OSS/COS或其他新增付费资源。
- 官方依据：阿里云[主机监控快速入门](https://help.aliyun.com/zh/cms/cloudmonitor-1-0/getting-started/)、[基础监控与操作系统监控](https://help.aliyun.com/zh/cms/cloudmonitor-1-0/user-guide/overview-of-basic-and-operating-system-monitoring)、[安装CloudMonitor agent](https://help.aliyun.com/zh/cms/cloudmonitor-1-0/user-guide/install-and-uninstall-the-cloudmonitor-agent-for-cpp/)、[ECS告警规则](https://help.aliyun.com/zh/ecs/user-guide/configure-alerts-for-an-ecs-instance)、[告警联系人组](https://help.aliyun.com/zh/cms/cloudmonitor-1-0/user-guide/create-an-alert-contact-or-alert-contact-group)。

## D8.3 下线演练

- 已完成书面演练，不执行真实释放：停写并停止tools/API -> 创建最终database/uploads配对备份 -> 下载仓库外本地副本并验证SHA、dump、tar和manifest -> 记录最终release pair及数据计数 -> 处理Vercel别名与前端/API DNS -> 分别释放ECS、磁盘、快照、EIP和可选备份存储 -> 撤销SSH/云/Vercel/GitHub/AI凭据 -> 24小时与72小时账单复核。
- 停止ECS不等于释放实例；释放实例不等于独立磁盘、快照、EIP或其他持续计费资源已终止。每一项未来均需独立资源释放授权。
- 下线前若最终配对备份不可读、本地副本缺失、release pair不完整或账单责任不清，停止下线，不删除生产恢复点。

## D8.4 最终收口

- 运行手册已更新至当前TCP 2222受控alias、真实SHA目录、分层健康、启动/停止、日志、证书、备份恢复、SSH `/32`轮换、AI故障、cleanup dry-run、紧急停写、secret轮换、监控费用与下线口径。
- CloudMonitor Agent、联系人组绑定及三条主机告警规则已完成；临时通知测试已真实触发、用户确认收到、测试规则已删除，三条正式规则保持不变。新增付费站点监控不属于本批授权范围，API/Prisma/Nginx/证书继续采用runbook主机侧与人工检查，该边界不阻塞D8验收。
- 用户已确认D8人工验收通过；07生产部署设计与D0～D8全部闭环，不自动进入第五期。
- 不自动进入第五期，不提交Git，不处理`AGENTS.md`、`CLAUDE.md`或历史工作树。

## 2026-07-28 CloudMonitor 实施进度

- 用户已明确授权安装主机监控 Agent，并已自行创建报警联系人组。
- 已创建 `AliyunServiceRoleForCloudMonitor` 服务关联角色，并通过云监控控制台为目标 ECS 安装 LoongCollector。
- 控制面复核：Agent 版本 `4.0.0`、状态“运行中”，CPU、内存和磁盘指标均已开始上报；远端只读复核同时确认对应服务 active、failed units 为 0。
- 已创建目标实例级 CPU 告警：`(ECS)CPU使用率 >= 80%`，连续 5 个一分钟周期触发。
- 已创建并启用三条目标实例级规则：CPU `>=80%` 连续 5 个一分钟周期；内存 `>=85%` 连续 3 个一分钟周期；磁盘 `>=70%` 为 Warn、`>=85%` 为 Critical，均连续 3 个一分钟周期。
- 三条规则均显示“正常”并关联“云账号报警联系人”组；联系人列表确认唯一联系人属于该组。
- 旧版联系人页当前不提供独立激活状态列；历史页面曾显示联系人等待激活。因此“成员绑定完成”和“通知实际可达”分开验收；临时规则触发后用户已确认收到通知，D8.2现已关闭。
- 阿里云站点监控/网络分析按量计费，控制台显示最低 `0.001元/次`。本批未获得新增付费资源授权，因此未开通站点监控、未创建公网API探测任务；API liveness、Prisma readiness、Nginx 5xx与证书到期继续按runbook的主机侧/人工检查执行，不宣称已经配置云端告警。
- 用户独立授权通知可达性测试后，创建唯一临时CPU规则：目标为同一ECS、阈值 `>=0%`、连续1个一分钟周期、绑定既有联系人组。控制台随后记录“报警发生”并进入通道沉默周期，用户确认实际收到通知；临时规则随即删除，三条正式规则保持不变。
- 文档与证据不记录实例 ID、主机名、公网地址、联系人值或其他账号敏感信息。
