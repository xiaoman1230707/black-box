# P5.10 生产启动验证

## 结论

2026-07-17，P5.10 已完成。`pnpm start:prod` 已与 Nest 真实构建产物对齐，并通过隔离端口真实启动验证。P5.1～P5.10 至此全部闭环；本次未进入 P6。

## 根因与最小修复

- `nest-cli.json` 使用 `sourceRoot: "src"`，当前 `pnpm build` 生成入口为 `dist/src/main.js`。
- `package.json` 原脚本为 `node dist/main`，目标文件不存在，生产启动会得到 `MODULE_NOT_FOUND`。
- 本次只将 `start:prod` 修正为 `node dist/src/main.js`；未改变 Nest 输出目录、依赖、lockfile或应用业务代码。
- 新增 `src/config/production-start.spec.ts`，读取真实 package script 并验证脚本目标与构建产物契约。

## TDD 与自动验证

- RED：聚焦测试稳定报告期望 `node dist/src/main.js`、实际为 `node dist/main`。
- GREEN：修正脚本后聚焦测试通过。
- 后端 build：通过。
- 新增测试定向 lint：`0 errors / 0 warnings`。
- 后端全量 Jest：`14 suites / 63 tests passed`。
- `git diff --check`：通过，仅输出工作树既存 CRLF 提示。

## 真实生产启动

- 启动前端口：3000、3106、5173 均无监听。用户此前保留的 3000 实例在本次验证前已自行不存在，本次未终止该端口进程。
- 使用隔离变量 `PORT=3106` 执行标准命令 `pnpm start:prod`。
- 启动日志确认实际执行 `node dist/src/main.js`，Nest 正常完成初始化。
- `GET http://localhost:3106/api` 返回 HTTP 200，正文为 `Hello World!`。
- 仅停止命令行已核对为本次 `dist/src/main.js` 的隔离 PID；结束后 3000、3106、5173 均无监听。

## 工作树边界

- 本 task 的生产配置差异仅为 `package.json` 的 `start:prod` 一行。
- 本 task 未运行依赖安装，也未修改 P5 此前已经存在的 lockfile 差异。
- 未提交 Git，未执行 P6。
