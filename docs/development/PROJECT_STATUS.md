# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- `main` 当前同步修复提交：`909b99e23eef4aafef6af8109be786e9ba8e12f8`
- 开发分支：`agent/tag-relations-single-source`
- 当前 PR：`#8 refactor: make repoTags the single source of truth`
- 当前阶段：标签关系单一真源与本地事务并发控制
- GitHub Pages：已发布
- Cloudflare Pages OAuth：已部署并接通
- PR #8：代码与自动验证完成，等待合并和浏览器生产验收

## 已完成批次

### 工程、部署与 OAuth

- [x] Node.js 22、ESLint、TypeScript、CI 和联合构建
- [x] GitHub Pages 应用与文档部署
- [x] Cloudflare Pages Functions OAuth 后端
- [x] OAuth `state`、PKCE、严格 CORS 和安全弹窗回调

### 仓库同步正确性（PR #7，已合并）

- [x] 远端 Stars 作为完整权威快照
- [x] 取消 Star 后删除本地幽灵仓库
- [x] 全部分页成功后才提交 IndexedDB
- [x] 分页失败保留上一次完整快照
- [x] 区分 `success`、`partial`、`error`、`cancelled`
- [x] 合并提交：`909b99e23eef4aafef6af8109be786e9ba8e12f8`

### 标签关系单一真源（PR #8）

- [x] 新增 `StoredTag`，数据库 `tags` 只存标签元数据
- [x] `repoTags` 成为唯一持久化关系真源
- [x] `Tag.repos` 仅作为内存派生视图，兼容现有界面
- [x] IndexedDB 升级到 v3
- [x] 自动合并旧 `tags.repos` 与已有 `repoTags`
- [x] 迁移时去重并删除孤儿标签关系
- [x] 单仓库标签编辑只替换该仓库的关联
- [x] 删除标签时同步删除其全部关系
- [x] 仓库同步只清理失效 `repoTags`，不再重写标签元数据
- [x] 设置页统计使用 `repoTags`
- [x] 备份格式升级到 v2.0，并兼容旧标签关系导入
- [x] 导入和清空操作采用完整 Dexie 事务
- [x] 新增全局本地数据事务队列
- [x] 仓库同步、标签编辑、导入和清空共享同一互斥队列
- [x] 标签 `id` 与 `createdAt` 在更新时保持不可变

## 自动验证

```text
PR                              #8
Branch                          agent/tag-relations-single-source
CI run                          30760895159  PASS
Pages PR build                  30760895134  PASS/PR build
npm ci                                        PASS
npm run lint                                 PASS
npm run type-check                           PASS
npm run test:unit                            PASS，11 tests
npm run cloudflare:type-check                PASS
npm run pages:build                          PASS
npm run cloudflare:build                     PASS
```

测试覆盖：

- 仓库远端快照、差异计算和失效关系清理；
- 旧标签数据迁移、去重和孤儿关系过滤；
- `StoredTag` 与 UI 标签视图转换；
- 单仓库与单标签关系替换；
- 本地数据事务按顺序执行；
- 单次事务失败不会阻塞后续事务。

## 在线地址

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## PR #8 主要文件

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

## 合并后人工验收

- [ ] 刷新旧版用户数据，确认原标签和仓库关联全部保留
- [ ] 检查 IndexedDB `tags` 行中不再保存 `repos`
- [ ] 检查 IndexedDB `repoTags` 保存全部关联
- [ ] 为单个仓库新增、移除和切换标签
- [ ] 删除标签，确认对应 `repoTags` 一并删除
- [ ] 新增和取消 GitHub Star，确认关系正确保留或清理
- [ ] 导出 v2.0 备份并重新导入，确认标签关系完整恢复
- [ ] 在后台同步期间编辑标签，确认最终状态不被覆盖

## 后续计划

### P1：令牌安全

- [ ] 缩短 GitHub access token 在浏览器中的持久化生命周期
- [ ] 评估从 localStorage 迁移到会话级存储或后端会话
- [ ] 增加退出、撤销授权和 401 状态的统一清理

### P1：依赖与质量

- [ ] 审查 33 个依赖漏洞：2 low、12 moderate、19 high
- [ ] 清理现有 ESLint 警告
- [ ] 处理主要 chunk 过大问题
- [ ] 增加 IndexedDB 浏览器集成测试和 Playwright E2E

## 下一步

1. 将 PR #8 标记 Ready 并 squash 合并到 `main`；
2. 等待主分支 CI 与 GitHub Pages 生产发布；
3. 执行标签迁移和备份恢复人工验收；
4. 开始 GitHub token 生命周期安全批次。

## 更新规则

每一批必须记录：已完成、未完成、修改文件、验证结果、已知风险和下一步。自动测试通过不得替代真实浏览器迁移和生产行为验收。
