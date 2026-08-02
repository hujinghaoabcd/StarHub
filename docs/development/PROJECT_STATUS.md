# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- 开发分支：`agent/repo-sync-correctness`
- 当前 PR：`#7 fix: make repository synchronization atomic`
- 当前阶段：仓库同步正确性修复
- GitHub Pages：已启用并成功发布
- Cloudflare Pages OAuth：用户已完成平台部署与前端地址接通
- OAuth 真实登录：需要继续保留人工生产验收记录
- 当前同步批次：代码完成并通过 CI，尚未合并到 `main`

## 已完成

### 批次 1：工程与 CI 基线

- [x] Node.js 22、ESLint、类型检查和 CI 基线
- [x] GitHub Actions CI
- [x] 应用与文档联合构建

### 批次 2：GitHub Pages 部署

- [x] 应用基础路径 `/StarHub/`
- [x] 文档基础路径 `/StarHub/docs/`
- [x] `.nojekyll` 与部署 SHA
- [x] 生产发布和公网冒烟测试

### 批次 3：OAuth 安全与 Cloudflare Pages Functions

- [x] OAuth `state` 校验与 PKCE S256
- [x] `postMessage` 安全回调
- [x] JSON POST token 交换
- [x] 严格 CORS、Origin 与 redirect URI 校验
- [x] `GET /api/health`
- [x] Cloudflare Pages Functions 独立构建和类型检查
- [x] GitHub Pages 读取 `VITE_API_BASE_URL` 与 `VITE_GITHUB_CLIENT_ID`
- [x] 用户完成 Cloudflare Pages 部署

### 批次 4：仓库同步正确性（PR #7）

- [x] 远端 Stars 作为完整快照，不再以本地仓库作为合并底稿
- [x] 取消 Star 的仓库能够从本地快照删除
- [x] 全部分页成功后才提交 IndexedDB
- [x] 仓库、`tags.repos` 和 `repoTags` 在同一 Dexie 事务中更新
- [x] 分页失败时保留上一次完整本地快照
- [x] 区分 `success`、`partial`、`error`、`cancelled`
- [x] 首页每次进入都会执行后台同步
- [x] 同步结果显示新增、更新、移除或失败页
- [x] 提取纯函数：快照构建、差异计算、标签引用清理
- [x] 增加 Node 内置单元测试
- [x] CI 增加同步测试步骤

## 当前验证

```text
PR                              #7
Branch                          agent/repo-sync-correctness
CI run                          30759484185  PASS
npm ci                                        PASS
npm run lint                                 PASS，8 条非阻断警告
npm run type-check                           PASS
npm run test:sync                            PASS，4 tests
npm run cloudflare:type-check                PASS
npm run pages:build                          PASS
npm run cloudflare:build                     PASS
```

CI 证明代码、类型、纯函数测试和构建通过；真实 GitHub 账户下的取消 Star、超多分页和网络中断仍需要浏览器人工验收。

## 在线地址

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## 本批修改文件

- `src/services/repoSync.ts`
- `src/stores/repo.ts`
- `src/pages/Home/index.vue`
- `tests/repo-sync.test.mjs`
- `package.json`
- `.github/workflows/ci.yml`
- `docs/development/PROJECT_STATUS.md`
- `docs/development/HANDOFF.md`

## 尚未完成

### 当前 PR 验收

- [ ] 使用真实账户取消一个 Star 后重新进入 StarHub，确认本地仓库被移除
- [ ] 模拟分页请求失败，确认旧完整快照不被覆盖
- [ ] 确认被移除仓库的标签引用同时清理
- [ ] 通过人工验收后将 PR #7 标记 Ready 并合并

### P1：数据模型

- [ ] 统一 `tags.repos` 与 `repoTags` 双轨标签模型
- [ ] 评估同步期间并发编辑标签的交互限制
- [ ] 评估更安全的 GitHub token 生命周期和存储方案

### P1：依赖与质量

- [ ] 审查 33 个依赖漏洞：2 low、12 moderate、19 high
- [ ] 清理 8 条 ESLint 警告
- [ ] 处理两个超过 1 MB 的主要 chunk
- [ ] 增加浏览器级 E2E 测试

## 下一步

1. 对 PR #7 做真实账户人工同步验收；
2. 验收通过后合并到 `main`；
3. 验证 GitHub Pages 生产发布；
4. 再进入标签数据模型统一批次。

## 更新规则

每一批必须记录：已完成、未完成、修改文件、验证结果、已知风险和下一步。构建成功不得表述为线上行为已经完成人工验证。
