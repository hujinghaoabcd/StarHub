# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
main 同步修复：909b99e23eef4aafef6af8109be786e9ba8e12f8
开发分支：agent/tag-relations-single-source
Pull Request：#8
```

PR #7 的仓库同步正确性修复已经合并到 `main`。PR #8 将标签关系统一到单一持久化真源，已经通过自动检查，尚未完成生产浏览器迁移验收。

## 2. 数据模型

### 持久化模型

```text
repos
  id → Repository

tags
  id → StoredTag
  只保存 name、color、emoji、createdAt、updatedAt

repoTags
  [repoId + tagId] → RepoTag
  保存全部仓库—标签关系
```

`tags` 表不再保存 `repos` 数组。`repoTags` 是唯一关系真源。

### UI 模型

现有组件继续使用：

```ts
interface Tag extends StoredTag {
  repos: number[]
}
```

这里的 `repos` 由 `hydrateTags(storedTags, repoTags)` 在内存中派生，不会写回 `tags` 表。

## 3. IndexedDB v3 迁移

`src/db/index.ts` 将数据库升级到版本 3。

升级时执行：

1. 读取旧 `tags.repos`；
2. 读取旧 `repoTags`；
3. 合并两套关系；
4. 对 `[repoId, tagId]` 去重；
5. 删除指向不存在标签的孤儿关系；
6. 将标签改写为不含 `repos` 的 `StoredTag`；
7. 将规范化关系写入 `repoTags`。

迁移发生在 Dexie upgrade transaction 中，任一步失败都会回滚，不会留下半迁移状态。

## 4. 关系读写规则

### 读取

`tagStore.loadTags()` 同时读取：

```text
db.tags
db.repoTags
```

然后生成 UI 标签视图。

### 单仓库标签编辑

`replaceTagsForRepo(repoId, tagIds)`：

- 只删除该仓库已有关系；
- 写入该仓库新的关系；
- 不全量覆盖其他仓库或标签；
- 同步更新受影响标签的 `updatedAt`。

### 标签元数据更新

`updateTag()`：

- `id` 不可被覆盖；
- `createdAt` 不可被覆盖；
- 修改 `repos` 时同时更新该标签的 `repoTags`；
- 普通名称、颜色和 emoji 更新不会触碰关系。

### 删除标签

删除标签和删除该标签的全部 `repoTags` 在同一 Dexie 事务中完成。

### 仓库同步

仓库同步成功提交时只处理：

```text
repos
repoTags 中指向已取消 Star 仓库的关系
```

它不再清空或改写标签元数据。

## 5. 共享事务队列

新增：

```text
src/services/dataMutationQueue.ts
```

所有跨表本地写入通过 `runDataMutation()` 串行执行：

- 标签创建、更新和删除；
- 单仓库标签替换；
- 全量标签替换；
- GitHub Stars 完整快照提交；
- 备份导入；
- 设置页彻底清空；
- 重新抓取时清空本地数据。

一个事务失败后，后续事务仍能继续执行，不会使队列永久失效。

## 6. 设置页数据维护

### 统计

已标记仓库数量从 `repoTags.repoId` 统计，不再读取 `tags.repos`。

### 导出

备份格式升级到：

```json
{
  "version": "2.0"
}
```

导出时先从 `repoTags` 还原 `Tag.repos`，因此备份仍是便携的自包含 JSON。

### 导入

导入同时支持旧备份中的 `tags[].repos`。导入时：

1. 规范化标签和仓库；
2. 将标签拆为 `StoredTag`；
3. 从 `repos` 数组生成 `repoTags`；
4. 在同一事务中替换三张表。

### 清空

`repos`、`tags` 和 `repoTags` 在共享事务队列中的同一事务内清空。

## 7. 自动验证

```text
CI run                           30760895159  PASS
Lint                                         PASS
Frontend type-check                          PASS
Unit tests                                   PASS，11 tests
Cloudflare Functions type-check              PASS
Application + docs build                     PASS
Cloudflare bundle build                      PASS
```

测试包括：

- 仓库同步纯逻辑 3 项；
- 标签关系与迁移 6 项；
- 共享事务队列 2 项。

运行：

```bash
npm run test:unit
npm run check
```

## 8. 主要文件

- `src/types/index.ts`
- `src/db/index.ts`
- `src/services/tagRelations.ts`
- `src/services/dataMutationQueue.ts`
- `src/services/repoSync.ts`
- `src/stores/tag.ts`
- `src/stores/repo.ts`
- `src/pages/Home/components/RepoCardTags.vue`
- `src/pages/Settings/index.vue`
- `tests/repo-sync.test.mjs`
- `tests/tag-relations.test.mjs`
- `tests/data-mutation-queue.test.mjs`

## 9. 合并后人工验收

### 旧数据迁移

1. 在已有标签数据的浏览器中打开新版本；
2. 确认标签数量和仓库关联不变；
3. DevTools → Application → IndexedDB → StarHubDB；
4. 确认数据库版本为 3；
5. 确认 `tags` 记录不含 `repos`；
6. 确认全部关联位于 `repoTags`。

### 标签操作

1. 为仓库添加标签；
2. 移除该标签；
3. 同时选择多个标签并保存；
4. 编辑标签名称和颜色；
5. 删除标签；
6. 刷新页面后确认状态保持一致。

### 同步并发

1. 触发 GitHub Stars 同步；
2. 同步期间编辑一个仓库的标签；
3. 等待全部操作完成；
4. 刷新页面；
5. 确认标签编辑未被同步覆盖。

### 备份恢复

1. 导出 v2.0 备份；
2. 新建测试标签和关系；
3. 导入备份；
4. 确认仓库、标签和关系完整恢复；
5. 确认导入后仍能正常新增和删除标签。

### 取消 Star

1. 给测试仓库添加标签；
2. 在 GitHub 取消 Star；
3. 完整同步；
4. 确认仓库被删除；
5. 确认对应 `repoTags` 被清理；
6. 确认标签本身仍保留。

## 10. 已知风险

- 自动测试尚未直接运行真实浏览器 IndexedDB upgrade；
- 没有 Playwright E2E 覆盖迁移和导入恢复；
- GitHub token 仍持久化在 localStorage；
- npm audit 仍报告 33 个依赖漏洞；
- 主要前端 chunk 仍偏大。

## 11. 下一步

1. PR #8 squash 合并到 `main`；
2. 跟踪主分支 CI 和 GitHub Pages 发布；
3. 按第 9 节执行生产浏览器验收；
4. 下一批处理 GitHub token 生命周期和浏览器持久化安全；
5. 随后处理依赖漏洞、ESLint 警告和构建体积。

自动检查通过不能替代真实浏览器数据迁移与生产行为验收。
