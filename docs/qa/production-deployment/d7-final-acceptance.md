# D7 生产全链路最终验收

## 状态

- 状态：D7.0～D7.4已执行并完成证据收集；320px桌面经典滚动条差异已由用户批准登记为验收例外；用户于2026-07-28确认D7人工验收通过。
- 固定 `RELEASE_SHA`：`b6b3d93866e390eb2e37bd52649fa2628403b1b4`。
- 范围：自动回归、生产四视口截图、真实链路、资源与安全只读审计；D7 不开发新功能。

## D7.0 冻结基线

- 使用仓库外 detached worktree `C:\Users\15593\Black-box-release-20260727-b6b3d93`。
- `HEAD` 精确等于固定 `RELEASE_SHA`，分支为空且 `git status --short`、`git diff --check`均无输出。
- worktree 初始无前后端 `node_modules`；依赖安装必须使用现有 lockfile 和 frozen 模式，不修改 package/lockfile。
- Docker Desktop 初始未运行；后端 Windows Jest 继续受已登记的 Application Control 限制，权威全量门禁使用 Linux/amd64 环境。
- 当前主工作树历史改动与未跟踪证据原样保留，暂存区为空；`AGENTS.md`、`CLAUDE.md`不纳入D7修改。

## D7.1 自动矩阵

- 前端 unit：16 files / 53 tests passed。
- 前端 build：2460 modules transformed，成功。
- 前端全量 lint：批准的历史基线 3 errors / 0 warnings，仅 `ui/badge.tsx` 1条与 `utils/index.ts` 2条；不表述为全仓lint通过。
- Playwright：清单9 files / 51 tests，全量51 passed。
- 后端 build：成功。
- 后端Linux/amd64 Jest：21 suites / 102 tests passed；Windows Application Control未放宽。
- 09 embedding触及文件定向lint：0 errors / 0 warnings。
- 部署脚本：AI mock 8/8、embedding故障矩阵6/6、backup fixture 8/8、Compose policy 7项、build path 2项、Shell语法与3个Shell LF契约通过。
- 非首次通过：外部worktree首次命令受沙箱读取限制；Linux Jest首次因PowerShell随机值API和Jest参数封装未执行测试；embedding/backup测试首次分别缺少容器APP_ROOT与Git工具。均在无业务、数据库或外部AI副作用前停止，修正执行环境后通过，原失败不改写为代码回归。

## D7.2 四视口

- 已按稳定页面锚点采集 Home、Search、PostDetail、Compose、Chat、Mine、Login、MyPosts、MyLikes 九页，共 9页 x 4视口 = 36/36 张最终截图；首轮 1440px 部分页仍为懒加载 Loading 帧，已保留为采集时机失败事实并改用现有 `data-testid`/标题锚点重拍，未将 Loading 帧计入最终截图。
- 1440、900、390 三档当前记录页面级横向溢出均为 0，页面 console warning/error 为 0；Home 与 Search 各精确 1 个页内搜索框，其他七页为 0。
- 320x740 暴露真实严格口径缺口：Home、PostDetail、Compose、Mine 的 `documentElement.scrollWidth - clientWidth = 15px`，截图出现页面级横向滚动条；Search、Chat、Login、MyPosts、MyLikes 为 0。
- 只读 DOM 定位确认全局 `body` 的 `min-width: 320px` 在当前桌面浏览器经典垂直滚动条占用 15px 后仍强制 320px；此时 `html.clientWidth=305`、`body.clientWidth=320`、`body.scrollWidth=320`。轮播离屏 slide 虽有超出视口的几何位置，但被 Embla viewport 裁切，并非该 15px 页面滚动条的根因。
- 该表现可能不出现在滚动条覆盖式的真实移动浏览器。用户已批准将其登记为“桌面浏览器在精确320px视口采用经典垂直滚动条时，由全局320px最小宽度产生的15px模拟环境差异”；D7不修改CSS、不重建发布制品，该例外不阻塞继续真实链路。

## D7.3 真实链路

- 正式Home匿名读取正常，真实轮播、5个游戏和帖子feed可见，Home只有1个页面级搜索框。
- 初始浏览器会话为匿名态；访问`/mine`按既有RequireAuth契约转到`/login`。用户随后自行登录既有验收账号，`/mine`稳定显示用户ID 6、既有头像以及“我的发布/我的收藏”入口。
- 用户确认生产库新增的1 User与1 Avatar来自此前人工验收；Mine、MyPosts、MyLikes、Compose、Chat等登录保护页面均可进入，个人发布/收藏当前均为0篇空态，console无warning/error。
- 320px例外确认前未执行生产写链路；确认后仅按授权创建一篇永久测试帖及一组媒体，并执行可回退社交写入、Search与Chat真实调用。注册、头像和退出不为重复证明再次写入，沿用此前人工验收与9/51行为回归证据。
- 用户随后明确认可该例外并授权继续真实链路，范围为一篇永久测试帖及测试图片、可回退的点赞/评论操作，以及各一次Search和Chat真实AI请求。
- 发帖链路已唯一执行：标题 `D7 生产验收测试帖 2026-07-27`，使用D7仓库内非敏感截图作为测试图片，图片上传完成后发布按钮恢复可用；正式站点创建 `/post/36`，作者为当前验收账号，Markdown标题/列表与图片均在详情页正常渲染，初始点赞/评论/浏览均为0。
- 发布动作的浏览器导航等待器因通配URL匹配超时，但提交后只读核对已处于`/post/36`且页面数据完整；未重复点击发布，登记为工具等待假失败，不是业务失败。
- 点赞/收藏一致性：`/post/36`从idle/0变为liked/1，`/mine/likes`显示“共1篇”且为该测试帖；取消后恢复idle/0，收藏页恢复“共0篇”空态，净点赞写入为0。
- 评论链路：唯一创建顶层评论和一条回复，详情统计由0变为2；随后先删除回复、再通过AlertDialog删除顶层评论，最终统计恢复0且两条测试文本均不存在。Playwright点击回复/删除按钮两次受运行时3秒CDP上限影响未触发，DOM只读核对证明未写入后改用同一可见按钮节点完成；未产生重复评论或删除。
- “我的发布”显示“共1篇”且精确命中`/post/36`；该永久测试帖为本次唯一新增帖子。
- Home真实组合筛选验证：`原神 × 攻略`两个chip均为active并按AND语义返回2篇，逐项清除后恢复无筛选首屏10篇。到达列表底部后真实加载至20篇；进入`/post/35`再返回时恢复`scrollY=4164`且20篇列表保持，分页、详情返回与sessionStorage滚动恢复闭环。
- `/mine`在用户ID 6登录态下刷新前后均保持当前路径、账户摘要和“我的发布”入口，未跳转Login；匿名RequireAuth重定向已在本轮初始会话及既有行为回归中验证。
- Search以测试帖完整标题执行并进入success，返回3篇且测试帖精确命中1篇。执行偏差：填入关键词后的500ms debounce在按钮严格定位修正期间已完成一次请求，随后精确“搜索”按钮又执行手动提交；应用未暴露请求计数，因此供应商侧按保守口径登记为最多2次embedding请求，不再重试Search。
- Chat只提交一次真实问题，约4.4秒完整结束；无error、loading清零、输入恢复，回答引用站内帖子并生成1个独立citation。引用`/post/29`可正常进入“赛博朋克2077往日之影：隐藏结局达成条件梳理”详情。
- 写后生产只读终态：migration 3；User 6、Post 36、Comment 13、Like 31、File 11、Avatar 1；embedding null 0、non-null 36、错误维度0。`/post/36`归属User 6，精确1条File、0评论、0点赞、embedding 1536维；uploads共24文件、497958 bytes，符合原媒体加本次原图/缩略图两文件。API/db均healthy、OOM=false、restart=0，liveness/readiness 200，无tool残留、无公网3000监听、failed units 0。
- 首次写后只读脚本误用Prisma逻辑模型名而非`@@map`后的物理表名，并由PowerShell文本管道向Base64输入加入无效前缀；服务健康检查后在首条错误SQL停止且无写入。按schema/migration证据改用物理表名及二进制安全stdin后取得完整结果；Base64解码器仍报告输入前缀告警但脚本完整退出0，根因是.NET StandardInput UTF-8 BOM，不影响解码后的只读脚本内容，未再重跑。
- 首页首屏10张真实PostCard均提供整卡link语义；其中`/post/35`卡片可正常进入详情。

## D7.4 资源与安全

- ECS只读审计：Docker/containerd/Nginx均active+enabled，failed units=0，无reboot marker。
- Swap底层文件2147483648 bytes、page size4096、有效容量与`/proc`均2147479552 bytes；SwapFree约1.99GiB，MemAvailable约984MiB，磁盘可用约27.98GiB，swappiness=10。
- 监听端口仅22、53、80、443、2222及loopback 3000；3000公网监听0，5432与2375/2376监听0。UFW active，管理2222唯一规则、Web规则存在，无22/3000/5432规则。
- API/db均healthy、OOM=false、restart=0；API镜像ID与固定release SHA一致，运行用户10001:10001，loopback liveness/readiness均200。
- 写前数据库安全基线：migration 3/3完成、failed 0；User 6、Post 35、Comment 13、Like 31、File 10、Avatar 1、Game 5、Tag 5、PostTag 35；embedding null 0、non-null 35、错误维度0。受控写链路后的最终计数以D7.3写后只读终态为准。
- 相比B3基线新增1 User与1 Avatar，其他核心业务计数不变；用户已明确确认二者均来自此前人工验收，归属闭环，不视为未知生产漂移。
- B3四项文件、内部SHA、dump与tar可读性通过；Nginx配置有效、access 5xx计数0、API日志敏感模式命中0。
- API约122MiB、db约62MiB；无资源越线。
- 首次远程审计因PowerShell CRLF和`docker exec`未启用stdin导致封装层非零及SQL缺失；Base64保真与独立只读SQL补采后通过，未修改远端状态。
- 写链路前cleanup唯一dry-run退出0：control/missing/orphan/protected/symlink/unknown/unsafe-record均0，referenced 22；工具容器残留0，未执行apply。写链路后新增媒体已由Post 36、File 11及uploads 24文件的一致性只读核对闭环，未再次运行cleanup。
- cleanup首次在容器创建前因错误假设env位于compose目录而停止；只读确认真实受控env位于`/etc/black-box`且权限0600后修正门禁脚本，未读取变量值。
- D7本地临时测试镜像`black-box-d7-test:b6b3d93`确认无容器引用后已按精确标签删除；未执行Docker prune，正式候选镜像与历史审计现场未处理。
