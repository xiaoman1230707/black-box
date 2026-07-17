# P5.7 演示 seed/full 双轮执行证据

> 日期：2026-07-16  
> 数据库：已确认的 `yue` 专用演示库。  
> 恢复点：仓库外备份 B 已闭环，见 `p5-backup-b.md`。  
> 状态：两轮真实执行、只读数据门禁及 Home/Search/Chat/PostDetail 页面串验均已通过；用户已确认 P5.1～P5.10 整批人工验收通过。

## 1. 授权与执行边界

用户明确授权连续执行两次：

```powershell
pnpm seed:demo:full
```

两轮均在 `backend/backend/posts/` 单独执行，均退出 0。没有执行第三轮，没有额外调用 Search/Chat，也未进入 P6。

`seed:demo:full` 的固定顺序为 `seed:demo` 后执行 `embedding:backfill -- --all`。每轮处理 35 个标题，两轮共 70 次 embedding 调用，均成功；模型为 `text-embedding-3-small`。

## 2. 两轮结果

| 项目 | 第一轮 | 第二轮 |
|---|---:|---:|
| 定向替换旧帖子 | 14 | 35 |
| 定向替换旧 File 记录 | 0 | 10 |
| 最终帖子 | 35 | 35 |
| 最终评论 | 13 | 13 |
| 最终点赞关系 | 31 | 31 |
| 最终帖子图片 File | 10 | 10 |
| embedding 成功/失败 | 35/0 | 35/0 |

第二轮按 manifest 定向删除并重建第一轮数据，因此数据库自增 ID 会前进；幂等契约是内容、关系、文件和规模不累计，不承诺主键稳定。

## 3. 最终数据库与关系核对

- 作者：5 名，分别为星海攻略组、爱睡觉的旅人、夜之城电台、海拉鲁工坊、提瓦特观察员。
- 帖子：35；标题重复 0；正文为空 0。
- 游戏：黑神话:悟空、原神、艾尔登法环、塞尔达传说:王国之泪、赛博朋克2077，各 7 帖。
- 每个游戏均覆盖攻略、资讯、求助、评测、活动五种内容类型。
- 评论 13；点赞关系 31。
- `titleEmbedding`：35/35 非 null，维度集合仅 `[1536]`。
- File：10；全部关联帖子；重复 filename 0；尺寸均为 1600x900。
- Avatar：保持 1。

## 4. 图片与 cleanup 核对

第一轮和第二轮的 10 张缩略图 SHA-256 逐一一致，说明第二轮复用了已有确定性图片，没有覆盖或累计生成：

| 文件 | SHA-256 |
|---|---|
| phase4-black-myth-boss-thumbnail.jpg | `B906F92A32964913C89905BBB2E7CC914ECA6B2E8064E3B30D56934C3271D52C` |
| phase4-black-myth-temple-thumbnail.jpg | `18993932D9FCADAB67B9158C14FF93E1B74B53265011758DB5712B373245E544` |
| phase4-cyberpunk-dogtown-thumbnail.jpg | `E1E2BF635A493A4DDB918274FA6C6CDB80EC53EBC6F80853C0DE9076FEFE55F2` |
| phase4-cyberpunk-night-city-thumbnail.jpg | `025CD3CB10DCEB0C16AD0263AF749B38589F30E079754610B945E30D1D7E6139` |
| phase4-elden-malenia-thumbnail.jpg | `42C2BBB3D5D3009B21EDE369A732E7D3C288C6C4EEDB30B5075F861794BB2717` |
| phase4-elden-shadow-thumbnail.jpg | `F01B641B13B9202EF403389A409B34758A11C75F54A46C66F3C11F21B6435A7C` |
| phase4-genshin-event-thumbnail.jpg | `DBBB4F560F7BA7999FFAA4BD0D557EAF315212D7F0BB3902108F68681EC29869` |
| phase4-genshin-fontaine-thumbnail.jpg | `AA23451621EB8EC9730B5F737227FDD47A2F017429E73ABC556D19DB4138E4B2` |
| phase4-zelda-sky-island-thumbnail.jpg | `DE24F947523DBCB762E3ADD81F8B7EFEF71A9AD6EFC963E3FE10CC06CDF3E56C` |
| phase4-zelda-ultrahand-thumbnail.jpg | `3A31035474E4036041F2D5BD34D96908F4435E4E021373535C9C89288A725450` |

最终 uploads 共 26 个文件：4 个控制文件、2 个引用头像文件、10 张帖子原图和 10 张帖子缩略图。cleanup dry-run 退出 0：control 4、referenced 22、orphan 0，其余分类均为 0。

## 5. 恢复点与停机状态

seed 后复核备份 B 两份 SHA-256 未变化：

- DB dump：`F901DA0A5552DF1D29423AA821BD0B7DB1A8487AE85E217BBEB54A9AE5F3CB3A`
- uploads：`D6EC377E2B63F02C25090AC8C7A9D02D88BD15FC41FD5F8CC01BD3FF2B56F7B3`

最终 3000/5173 监听为 0。下一门禁是用户人工串验 Home、Search、Chat、PostDetail；确认前 P5 不标人工验收通过，也不进入 P6。
