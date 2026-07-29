# Black-box

Black-box 是一个面向游戏社区的全栈内容平台，支持帖子发布、Markdown 正文、游戏与内容类型筛选、评论与点赞、个人发布与收藏，以及基于标题向量检索的 AI 搜索和流式聊天。

**在线体验：** [https://www.lcman.click](https://www.lcman.click)

![Black-box 首页](docs/qa/production-deployment/screenshots/d7-production/1440x1000/home.png)

## 功能概览

- 帖子发布、图片上传、安全 Markdown 渲染与详情浏览
- 游戏和内容类型双维度筛选、分页加载与滚动恢复
- 评论、回复、删除、点赞，以及“我的发布”和“我的收藏”
- 语义搜索：使用 1536 维标题 embedding 检索相关帖子
- AI 聊天：流式输出、站内帖子引用和有限失败降级
- JWT 登录、刷新令牌、接口限流和登录保护路由
- Neo-Brutalism 响应式界面，覆盖桌面、平板与移动端

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite 8、Tailwind CSS 4、Zustand、Base UI |
| 后端 | NestJS 11、TypeScript、Prisma 6、PostgreSQL 16 |
| AI | DeepSeek 流式聊天、OpenAI-compatible embedding API、LangChain |
| 测试 | Vitest、Jest、Playwright |
| 生产环境 | Vercel、Nginx、Docker Compose、阿里云 ECS |

## 项目结构

```text
Black-box/
├── frontend/black_box/          # React/Vite 前端
├── backend/backend/posts/       # NestJS/Prisma 后端
├── deploy/production/           # Docker Compose、Nginx 和部署脚本
├── docs/design/                 # 权威设计文档
├── docs/plans/                  # 实施计划
├── docs/operations/             # 运维与维护手册
└── docs/qa/                     # 测试和人工验收证据
```

## 快速启动

### 1. 环境要求

- Node.js 22 或更高版本
- pnpm 10 或更高版本
- PostgreSQL 16，或可用的 Docker 环境

克隆项目：

```bash
git clone https://github.com/xiaoman1230707/black-box.git
cd black-box
```

### 2. 启动 PostgreSQL

已有 PostgreSQL 时，可直接创建数据库并跳到下一步。使用 Docker 的本地示例：

```bash
docker run --name black-box-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=local-dev-password \
  -e POSTGRES_DB=black_box \
  -p 5432:5432 \
  -v black-box-pgdata:/var/lib/postgresql/data \
  -d postgres:16
```

### 3. 启动后端

```bash
cd backend/backend/posts
pnpm install --frozen-lockfile
cp .env.example .env
```

Windows PowerShell 使用：

```powershell
Copy-Item .env.example .env
```

至少修改 `.env` 中的以下变量：

```dotenv
DATABASE_URL=postgresql://postgres:local-dev-password@localhost:5432/black_box
TOKEN_SECRET=<至少 32 字节的随机值>
PUBLIC_BASE_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173
```

生成随机 `TOKEN_SECRET`：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

后端启动会校验完整 runtime 环境，因此还必须配置 `.env.example` 中的 DeepSeek 与 embedding provider 变量。维护脚本会按自身能力校验更小的变量集合，但不能用这一规则替代应用启动配置。

初始化数据库并启动开发服务：

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

后端默认地址为 [http://localhost:3000/api](http://localhost:3000/api)。

### 4. 启动前端

打开另一个终端：

```bash
cd frontend/black_box
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Windows PowerShell 使用：

```powershell
Copy-Item .env.example .env.local
pnpm dev
```

确认 `.env.local` 包含：

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api
```

前端默认地址为 [http://localhost:5173](http://localhost:5173)。首次启动的数据库为空，可注册账号并发布内容。

## 可选演示数据

演示数据初始化会写入数据库和 `uploads`，且 embedding 回填会调用外部服务。请先阅读 [维护手册](docs/operations/phase4-maintenance.md)，按以下顺序分别执行并逐步核验：

```text
seed-games -> rebuild-tags -> seed-demo -> embedding backfill
```

不要在已有生产数据库中直接运行演示 seed，也不要在未确认费用与供应商配置时执行 embedding 回填。

## 测试与构建

后端：

```bash
cd backend/backend/posts
pnpm exec prisma generate
pnpm test
pnpm build
```

前端：

```bash
cd frontend/black_box
pnpm test:unit
pnpm build
pnpm e2e
```

当前验收基线：

- 前端 Unit：16 files / 53 tests
- 后端 Jest：21 suites / 102 tests
- Playwright：9 files / 51 tests

仓库仍有已登记的历史 lint 债，因此不能将当前状态表述为“全仓 lint 零错误”；新增或修改文件应保持差分 lint 不增加问题。

## 生产部署

生产环境采用 Vercel 前端、Nginx 边缘代理、Docker Compose 后端与 PostgreSQL。生产发布涉及 secret、数据库写入、AI 费用、DNS、证书和备份门禁，不应直接照搬本地快速启动命令。

- [生产部署设计](docs/design/07-production-deployment.md)
- [生产部署实施计划](docs/plans/07-production-deployment-implementation-plan.md)
- [生产运维手册](docs/operations/production-deployment-runbook.md)
- [项目设计底座](docs/design/00-foundation.md)

## 安全说明

- 不要提交 `.env`、`.env.local`、API key、数据库连接串或私钥。
- 用户输入的 Markdown 通过统一 sanitize 策略渲染，禁止 raw HTML 注入。
- 生产上传目录与 PostgreSQL 数据必须使用持久化存储，并保持数据库与 uploads 配对备份。
- 生产 embedding 固定为 1536 维；切换模型或供应商前必须先验证维度与兼容性。

## 许可证

本项目当前未声明开源许可证，主要用于个人作品展示与学习交流。
