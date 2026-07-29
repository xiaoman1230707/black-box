# D6 Vercel 同 SHA 发布证据

## 状态

- 状态：已实施，并于 2026-07-27 通过用户人工验收。
- 固定 `RELEASE_SHA`：`b6b3d93866e390eb2e37bd52649fa2628403b1b4`。
- Vercel Production deployment ID：`dpl_G1hgP1yaVhpaZeW8ti67fH75oqJd`。
- 后端配对镜像 ID：`sha256:75cf2f0867b7982dc3f64133d6f37bc8cf6d7d14918a7814d0ce038f678bdaab`。

## Git 与项目配置

- GitHub 独立发布分支已存在，且远端分支精确指向固定 `RELEASE_SHA`；远端默认分支未改写。
- GitHub App 仅在用户完成仓库授权后用于 Vercel 导入。
- Vercel Production Branch 已从默认分支改为独立发布分支。
- Root Directory：`frontend/black_box`。
- Framework Preset：Vite。
- Build/Output：Vite 默认 build，输出 `dist`。
- Production 环境变量只记录变量名及校验状态；Preview 使用不可连接地址 fail-closed。仓库证据不记录真实域名值。

## 部署证据

- 首次项目初始化尝试使用远端默认分支，构建失败；该部署 ID 为 `dpl_EJVHh6DDFaY4h1pgtqUxNTSrQTPj`，未形成可服务的 Production 制品，也未绑定自定义域名。
- 随后从完整固定 SHA 手动创建 Production deployment；Vercel UI 同时显示正确分支、短 SHA、提交信息、Ready、Current 与 Production。
- 正式构建耗时 27 秒；生成独立不可变 deployment URL 和项目 Production alias。真实域名值仅保留在受控平台，不写入仓库 QA。
- Vercel 默认域名可加载前端产物；因后端精确 CORS 只允许正式前端来源，该临时域名上的 API 请求被拒绝，符合 fail-closed 预期，不视为正式链路失败。

## DNS 与正式域名门禁

- 正式前端域名已添加到 Vercel Production 环境，用户已在权威 DNS 控制台写入平台要求的唯一 `www` CNAME。
- 本机权威解析核对命中平台要求的 CNAME；Vercel 显示 `Valid Configuration`，Production TLS 可用。
- 仓库证据只记录 `FRONTEND_HOST`、`API_HOST` 角色及结果，不记录真实 DNS 目标或域名值。

## 正式链路验证

- `FRONTEND_HOST/`、`FRONTEND_HOST/login`、`FRONTEND_HOST/mine/posts` 均返回 HTTP 200 HTML；后两项证明 Vercel SPA rewrite 支持深链刷新。
- 正式首页加载真实轮播、5 个游戏筛选与帖子数据；Home 仅保留 1 个页面级搜索框。
- `API_HOST/api/posts?page=1&limit=1` 返回 HTTP 200 JSON；携带正式前端 Origin 时，`Access-Control-Allow-Origin` 精确回显正式 Origin，未放宽为通配符。
- `1440x1000`、`900x1000`、`390x844`、`320x740` 四档首页均加载 feed；页面宽度未超过目标视口，未发现页面级横向溢出。
- 正式页面浏览器 console 的 warning/error 为 0。
- 受保护个人内容深链在匿名状态下由现有路由守卫转到 Login；没有创建账号或产生业务写入。

## Release pair 与回滚

- Vercel deployment ID、后端镜像 ID 与固定 `RELEASE_SHA` 已形成同 SHA release pair。
- Vercel 当前 Production deployment 可回滚到平台保留的上一 deployment；后端继续保留上一镜像、release 与 B0/B1/B2/B3 恢复点。
- 本批未修改生产数据库、uploads、Nginx、证书、UFW、安全组或 AI 状态。

## 人工验收

- 用户已在正式域名完成独立人工验证并明确确认成功。
- D6 正式关闭；下一步为 D7 生产全链路最终验收，尚未开始执行。
