# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
开发分支：agent/repo-sync-correctness
Pull Request：#7
```

用户已经完成 Cloudflare Pages OAuth 后端部署，并开始仓库同步正确性批次。PR #7 已完成代码实现和自动验证，但尚未合并到 `main`。

## 2. 本批目标

修复以下问题：

1. 用户取消 GitHub Star 后，本地 IndexedDB 仍保留旧仓库；
2. 分页中途失败时，旧实现仍把不完整结果写入数据库；
3. 同步只能表现为“结束”，无法区分完整成功、部分失败和失败；
4. 同步过程中频繁 `bulkPut`，无法保证完整快照原子替换；
5. 标签中可能继续引用已经取消 Star 的仓库。

## 3. 已完成实现

### 完整远端快照

`src/stores/repo.ts` 不再使用本地仓库初始化远端合并 Map。GitHub 返回的所有 Stars 页面共同构成唯一远端快照。

这意味着：

- 远端新增 Star → 本地新增；
- 远端仓库信息变化 → 本地更新；
- 远端取消 Star → 本地删除；
- 本地旧仓库不会因为历史缓存重新混入远端快照。

### 分页失败保护

剩余页面使用批量 `Promise.allSettled` 获取。任一页面失败时：

- 同步结果标记为 `partial`；
- 记录失败页码；
- 不清空、不替换 IndexedDB；
- 页面继续使用上一次完整本地快照；
- 用户收到“保留上一次完整数据”的警告。

第一页或数据库操作失败时标记为 `error`。主动取消时标记为 `cancelled`。

### 原子数据库更新

只有全部 GitHub 分页成功后，才执行 Dexie 写事务：

```text
repos
+ tags.repos
+ repoTags
```

同一事务中完成：

1. 清空旧仓库；
2. 写入完整远端快照；
3. 删除标签中不存在的仓库 ID；
4. 删除 `repoTags` 中不存在仓库的关联行。

事务失败时不会留下半套仓库快照。

### 同步结果模型

新增：

```text
idle
syncing
success
partial
error
cancelled
```

成功结果包含：

```text
localCount
remoteCount
added
updated
removed
fetchedPages
totalPages
```

部分失败包含 `failedPages`。

### 页面行为

首页不再只在 `repos.length === 0` 时同步。每次进入首页都会：

1. 先加载本地标签和仓库，快速显示旧完整快照；
2. 后台获取 GitHub Stars 全部分页；
3. 完整成功后一次性切换到新快照；
4. 显示新增、更新和移除数量；
5. 失败时保留旧数据并显示明确状态。

## 4. 纯函数与测试

新增 `src/services/repoSync.ts`：

- `sanitizeRepository`
- `buildRepositorySnapshot`
- `calculateRepositoryChanges`
- `pruneTagsForRepositories`
- `pruneRepoTagsForRepositories`

新增 `tests/repo-sync.test.mjs`，使用 Node 22 内置 test runner 和项目已有 TypeScript 编译器，不增加第三方测试依赖。

覆盖：

1. 多页快照合并和重复仓库去重；
2. 新增、更新、取消 Star 差异计算；
3. `tags.repos` 幽灵引用清理；
4. `repoTags` 幽灵关联清理。

运行：

```bash
npm run test:sync
```

统一验证：

```bash
npm run check
```

## 5. 自动验证

```text
CI run                           30759484185
Lint                            PASS
Frontend type-check             PASS
Repository sync tests           PASS，4 tests
Cloudflare Functions type-check PASS
Application + docs build        PASS
Cloudflare bundle build         PASS
```

当前仍有 8 条既有 ESLint 警告，本批没有引入阻断错误。

## 6. 主要文件

- `src/services/repoSync.ts`
- `src/stores/repo.ts`
- `src/pages/Home/index.vue`
- `tests/repo-sync.test.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `docs/development/PROJECT_STATUS.md`
- `docs/development/HANDOFF.md`

## 7. 人工验收步骤

PR #7 合并前，使用真实 GitHub 账户执行：

### 取消 Star

1. 记录 StarHub 中某个测试仓库；
2. 在 GitHub 取消 Star；
3. 返回或刷新 StarHub 首页；
4. 确认提示中 `移除 1`；
5. 确认仓库列表、IndexedDB `repos`、标签引用中均不存在该仓库。

### 新增 Star

1. 在 GitHub 新增一个 Star；
2. 返回 StarHub；
3. 确认提示中 `新增 1`；
4. 确认仓库进入本地数据库。

### 网络失败保护

1. 在浏览器开发者工具中让后续分页请求失败；
2. 触发同步；
3. 确认出现“同步未完成”；
4. 确认旧仓库数量和 IndexedDB 内容未被部分结果覆盖。

### 标签清理

1. 给测试仓库添加标签；
2. 在 GitHub 取消该仓库 Star；
3. 完整同步成功；
4. 确认标签仍存在，但其 `repos` 不再包含该仓库 ID。

## 8. 已知风险

### 并发标签编辑

当前完整同步会在最终提交前读取标签并清理引用。同步期间用户同时编辑标签的极端竞态尚未做浏览器级并发测试。后续可在同步状态下暂时禁用标签写操作，或统一标签数据模型后集中解决。

### 双轨标签模型

项目同时保留：

- `tags.repos`
- `repoTags`

本批同时清理两套数据，避免幽灵引用，但没有完成模型统一。

### 自动测试范围

当前测试覆盖纯同步逻辑，不包含真实 GitHub API、IndexedDB 浏览器实现和 Vue 页面 E2E。

### 其他遗留

- 33 个 npm audit 漏洞，其中 19 个 high；
- 8 条既有 ESLint 警告；
- 两个主要 chunk 超过 1 MB；
- GitHub token 仍存放在 localStorage。

## 9. 下一步

1. 完成 PR #7 真实账户人工验收；
2. 验收通过后将 PR 标记 Ready；
3. squash 合并到 `main`；
4. 等待 GitHub Pages 生产发布成功；
5. 生产环境再次验证新增 Star、取消 Star 和标签清理；
6. 下一批统一 `tags.repos` 与 `repoTags` 数据模型。

不得把 CI 通过表述为真实 GitHub 账户行为已经完成验收。
