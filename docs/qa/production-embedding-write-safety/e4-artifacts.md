# E4 新候选制品报告

> 状态：本地制品完成；ECS尚未上传
> 日期：2026-07-27

## 身份

- RELEASE_SHA：`b6b3d93866e390eb2e37bd52649fa2628403b1b4`
- API image ID：`sha256:75cf2f0867b7982dc3f64133d6f37bc8cf6d7d14918a7814d0ce038f678bdaab`
- 架构与用户：linux/amd64，`10001:10001`，工作目录`/app`。

## 制品

| 文件 | 大小 | SHA-256 |
| --- | ---: | --- |
| API archive | 205707264 | `deca4bc32deb51490c41fa3fede3a748727d1cbd6ee94e9fd371ff24716f3de5` |
| build manifest | 783 | `8b492100f5facdef806e93adcf9e85929497cea8ab19384b4c6f4d14ca0876a4` |
| deployment bundle | 92160 | `b9ef15315b3e760aba654c7fe816e9f89b39b75cb446656831791136a7122c7e` |
| SHA256SUMS | 404 | `a7a87c89c07fb9216d221e22fc4ef82ceeaaa1b3d0e00724606621b2867413b0` |

`SHA256SUMS`为LF、CR=0、BOM=0。bundle直接来自固定Git object，共25个条目，无绝对路径或路径穿越。

## 正式镜像验证

- embedding安全矩阵6/6通过，无外网。
- SIGTERM两轮分别约261ms、229ms，均exit 0、仅signal 15、OOM false、restart 0、停止后HTTP不可达、PostgreSQL保持healthy。
- 本批未连接真实AI、未写生产数据库、未覆盖旧镜像、旧release或B2。

## 当前阻塞

`black-box-ecs`连接在SSH banner前超时。没有建立远端会话，也没有产生远端写入；需先恢复当前代理出口与唯一管理来源规则的一致性。
