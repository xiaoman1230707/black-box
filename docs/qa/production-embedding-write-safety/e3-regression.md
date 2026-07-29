# E3 回归与提交报告

> 状态：已完成
> 日期：2026-07-27

## 结果

- 后端Linux/amd64：21 suites / 102 tests passed，Nest build成功。
- embedding聚焦文件lint：0 errors / 0 warnings。
- embedding无外网容器矩阵：6/6 passed。
- AI preflight mock：8/8 passed。
- backup fixture：8/8 passed。
- Compose policy：7项通过；build-image路径：2项通过；3个Shell LF门禁通过。
- 前端没有本批差异；Windows Application Control及当前node_modules缺失阻止fresh unit/build启动，沿用最近人工验收的16/53、9/51与build基线。全量lint保持批准的3/0。

## 非首次通过证据

- 后端首次完整Jest为20/21 suites、102/103 tests：新增测试错误地读取Docker context外的Compose文件。Compose契约移至部署级MJS后，复用同一Linux镜像重跑为21/102。
- LF门禁首次因并行测试留下零字节Git index lock失败；确认无Git进程后精确删除锁文件，串行重跑通过。

## 提交

1. `f6f86687c13fe34e2dd74db4746bbc1e25bf1c06`：`fix(embedding): validate provider results before persistence`
2. `b6b3d93866e390eb2e37bd52649fa2628403b1b4`：`test(deploy): verify embedding backfill safety`

最终提交是当前候选`RELEASE_SHA`。AGENTS、CLAUDE及历史工作树未进入提交。
