# D5 API 边缘与 HTTPS 验收记录

**状态：** 已实施并通过自动门禁，待用户人工验收。

## 范围

- 主机 UFW 公网 HTTP/HTTPS 规则。
- API 域名 DNS 与 ACME HTTP-01 前置。
- Certbot standalone 首签、续期 dry-run。
- Nginx HTTPS、loopback API 反向代理、SSE 禁缓冲、上传上限及真实 IP 头覆盖。
- liveness、PostgreSQL readiness、Prisma readiness、CORS、媒体和受保护端口检查。

本文不记录真实公网地址、管理来源、证书私钥、供应商 endpoint 或任何 secret。

## D4 交接基线

- D4 已由用户指示继续进入 D5，视为 D4 人工验收关闭。
- 生产 API 与 PostgreSQL 均 healthy；API 仅绑定宿主 loopback。
- 生产数据为 5 User、35 Post、35 个 1536 维有限数 embedding、20 个媒体文件。
- B2、B3 远端恢复点及本地异机副本有效。

## D5 前置预检

- Docker、containerd：active。
- Nginx：inactive、disabled。
- API/db：各唯一一个 healthy 常驻容器。
- API：仅监听 `127.0.0.1:3000`；宿主未监听 5432。
- UFW：active；实施前只有受控管理端口规则，尚无 80/443。
- Certbot 与 Nginx 已安装；资源、Swap、磁盘和 failed units 满足门禁。
- 用户已人工确认云安全组公网 TCP 80/443 入方向规则。

## 执行结果

- 首次 UFW 80/443 写入与 Certbot standalone 首签成功，证书已进入受控目录并建立自动续期任务。
- 首次 `nginx -t` 在服务启用前失败，错误为宿主 Nginx 1.18 不识别模板中的新版 `http2 on` 指令；Nginx未启动、API仍仅loopback。
- 根因是模板语法版本高于D3固定安装版本，不是DNS、证书、API或数据库故障。
- 采用单一兼容修正：模板使用Nginx 1.18支持的`listen 443 ssl http2`；恢复脚本复用已签证书，不二次申请。
- 兼容修正后Nginx配置测试、启用和loopback HTTPS检查通过；首次续期dry-run因standalone模式下Nginx占用80端口而失败。
- 第二个根因是自动续期缺少standalone所需的Nginx停止/恢复hook；证书本身与当前HTTPS服务有效。修正限定为Certbot受控pre/post hook，不改变代理或应用配置。

## 自动验收结果

- UFW保持默认deny-in/allow-out/deny-routed；新增公网TCP 80/443，管理端口仍仅限批准来源，未新增3000/5432规则。
- Nginx配置测试通过并处于active+enabled；HTTP重定向HTTPS，TLS证书有效，续期dry-run成功且Nginx恢复运行。
- Nest liveness、Compose PostgreSQL readiness、loopback及公网Prisma readiness全部通过；公开分页返回35条总数。
- 授权origin返回精确CORS头，相似未授权origin不返回允许头。
- 11次合法无效登录请求在伪造不同`X-Forwarded-For`时结果为10次401后1次429，证明客户端伪造头未绕过同源限流。
- 演示媒体经HTTPS返回200；7MiB请求被Nginx以413拒绝，6MiB代理上限生效。
- Chat location静态确认关闭buffer/cache/gzip，覆盖转发头并保留75秒读取上限和`X-Accel-Buffering: no`。
- 候选内置基础栈脚本通过：数据库、Nest、Prisma和uploads权限均正常。
- 本机TUN/fake-IP会代理任意端口，故本地`Test-NetConnection`不作为3000/5432证据；该结论只采用安全组人工确认、UFW规则及宿主监听三层证据。

## 人工验收保留项

- 从真实浏览器检查登录、图片和控制台。
- 前端发布后串验Search有限完成/失败与Chat真实流式输出，确认无mixed content或末尾集中输出。
