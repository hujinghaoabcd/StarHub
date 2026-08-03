# 数据管理、备份与隐私

StarHub 是本地优先应用。理解每类数据的真实存储位置，是备份、迁移和故障恢复的前提。

## IndexedDB v8

数据库名称：`StarHubDB`。

| 表 | 主键/索引 | 内容 | 是否进入备份 v4 |
|---|---|---|---|
| `repos` | `id` | GitHub Stars 仓库快照 | 是 |
| `tags` | `id` | 分类和正式注册表元数据 | 是，通过导出的 `tags` |
| `repoTags` | `[repoId+tagId]` | 仓库—分类唯一关系真源 | 是，转换为每个 tag 的 `repos` |
| `classificationTasks` | `id` | AI 任务、模型、版本、进度 | 否 |
| `classificationTaskItems` | `[taskId+repositoryId]` | 草稿、审核、错误、增强结果 | 否 |
| `classificationReadmeCache` | `repositoryId` | 疑难项 README 摘要 | 否 |
| `repositoryHighlights` | `repositoryId` | 重点项目和标记时间 | 是 |
| `categoryMigrationSnapshots` | `id` | 最近分类迁移撤销快照 | 否 |

`Tag.repos` 是 UI 派生字段。任何新代码都不能同时把关系写入 `tags` 和 `repoTags`。

## Web Storage

| 数据 | 存储 | 生命周期 |
|---|---|---|
| GitHub OAuth 会话 | `sessionStorage` | 最长 12 小时或当前页面会话 |
| AI API Key | `sessionStorage` | 当前页面会话，可手动清除 |
| OAuth state 和 PKCE verifier | `sessionStorage` | 单次登录回调 |
| 主题和语言 | `localStorage` | 跨会话保留 |
| AI 非敏感偏好 | `localStorage` | 服务商、地址、模型和批次 |
| 分类预设 | `localStorage` | 设置页的模板分类 |

浏览器阻止存储时，Token 或 Key 可以回退到当前页面内存，但刷新后会丢失。

## GitHub 同步语义

StarHub 不做“只追加新 Star”的简单增量同步，而是构建当前权威快照：

1. 分页读取 GitHub 当前全部 Stars；
2. 清洗和按仓库 ID 去重；
3. 计算新增、更新、取消 Star 数量；
4. 只有完整快照成功后才替换 `repos`；
5. 清理已不存在仓库的 `repoTags` 和 `repositoryHighlights`；
6. 失败或取消时保留旧快照。

同步不会清空仍存在仓库的分类和重点标记。

## 备份 v4

设置页点击“导出数据”，生成：

```text
starhub-backup-YYYY-MM-DD.json
```

结构示例：

```json
{
  "version": "4.0",
  "exportDate": "2026-08-04T00:00:00.000Z",
  "data": {
    "repos": [],
    "tags": [],
    "highlights": [],
    "categoryPresets": []
  },
  "stats": {}
}
```

分类关系被内嵌为每个导出 tag 的 `repos` 数组，以兼容旧备份并保持文件可读；导入后会重新构建规范化的 `repoTags`。

### 备份不包含

- GitHub Token；
- AI API Key；
- AI 任务和逐仓库草稿；
- README 缓存；
- 分类迁移撤销快照；
- 浏览器主题和语言。

因此，备份适合迁移“仓库快照 + 分类体系 + 重点项目”，不是完整浏览器镜像。

## 导入备份

导入会显示仓库、分类、重点项目和导出时间，然后要求确认覆盖。

提交时：

- 检查 `version` 和 `data` 字段存在；当前尚未做严格 JSON Schema/版本白名单校验；
- 规范化分类、关系和重点标记；仓库数组目前主要信任备份来源；
- 恢复正式注册表元数据；
- 从 tag 的 `repos` 重建关系；
- 只保留仍存在仓库的重点标记；
- 在事务中覆盖仓库、分类、关系、重点和迁移快照；
- 恢复分类预设；
- 重载 Store 并返回主页。

::: danger 当前已知限制
覆盖导入目前不会清理 `classificationTasks`、`classificationTaskItems` 和 `classificationReadmeCache`。导入后若出现旧任务，应删除旧任务或清除整个站点数据后重新导入。该问题已列入后续优先修复。
:::

## 只导入分类

只需要迁移分类体系时，使用主页“分类工具 → 导入分类”，不要使用全量备份覆盖导入。

分类注册表导入会：

- 预览新增、重命名、合并、更新和冲突；
- 保留已有仓库关系；
- 创建本地迁移快照；
- 失败时回滚。

详见[分类与正式注册表](../guide/tags.md)。

## 分类迁移快照

每次注册表迁移、安全编辑或合并前，保存完整 `tags` 和 `repoTags`。最多保留最近 10 份。

快照只提供短期本机撤销，不替代下载备份。大量关系会增加 IndexedDB 用量。

## 清空全部数据

设置页“清空所有数据”会先停止同步，清空 UI，再尝试在事务中删除：

- `repos`；
- `tags`；
- `repoTags`；
- `repositoryHighlights`；
- `categoryMigrationSnapshots`。

常规事务失败时，界面会询问是否删除并重建整个 `StarHubDB`。

::: danger 当前已知限制
常规清表路径没有清理 AI 任务和 README 缓存。若目标是彻底恢复初始状态，应使用浏览器 Application/Storage 面板删除整个 StarHub 站点数据，而不是只清理几张表。
:::

清空 IndexedDB 不一定退出 GitHub 或清除 AI Key；公共设备上应同时退出登录、点击清除 Key，并关闭页面。

## 空间不足

遇到 `QuotaExceededError`：

1. 导出仍可读取的备份；
2. 暂停 AI 和 README 增强；
3. 关闭其他 StarHub 标签页；
4. 检查磁盘和站点存储；
5. 必要时删除旧 AI 任务/缓存；
6. 最后通过浏览器 Storage 面板删除整个站点数据，再重新登录和导入备份。

不要运行通过网络下载并 `eval` 的“修复脚本”，也不要手工只清理部分关系表。

## 隐私与外发数据

| 目标 | 发送内容 |
|---|---|
| GitHub API | Token、仓库/README/Pages 请求 |
| Cloudflare OAuth API | OAuth code、PKCE verifier、redirect URI |
| AI 服务商 | 仓库元数据、正式注册表；疑难项可能发送 README 摘要 |
| StarHub GitHub Pages | 静态应用和文档请求，不集中保存分类库 |

私人仓库用户应注意：仓库名称、描述、Topics 和 README 可能包含敏感信息。使用 AI 前先确认服务商政策。

## 数据操作安全规则

1. 重命名保持分类 ID；
2. 合并在单一事务中迁移和去重关系；
3. AI 只添加审核通过的关系；
4. 全量同步只有成功后才替换快照；
5. 所有本地写操作通过共享 `dataMutationQueue` 串行化；
6. 大规模操作前导出备份；
7. 恢复后核对仓库数、分类数、关系数和重点数。

## 下一步

- [存储故障排查](../troubleshooting/storage.md)
- [分类与正式注册表](../guide/tags.md)
- [部署与数据版本检查](../DEPLOYMENT.md)
