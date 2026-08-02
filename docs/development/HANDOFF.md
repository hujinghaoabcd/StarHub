# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
main：6d1771d5bcafa5f645033c22dee6285871c5778e
开发分支：agent/repo-links-unstar-pagination
Pull Request：#14
```

当前批次实现用户优先提出的项目链接、应用内取消 Star、全局升降序排序和最大 1000 条分页。

## 2. 项目链接

详情页新增 `RepositoryOverview.vue`，展示：

```text
GitHub repository html_url
GitHub About homepage
GitHub Pages actual html_url
```

数据来源：

- Stars 同步快照保存 `homepage` 和 `has_pages`；
- 打开详情时重新读取仓库详情，避免长期缓存过时；
- `has_pages=true` 时调用 Pages API；
- 优先使用当前认证请求的额度；
- 403 或 404 时，对公开仓库使用匿名 Pages API 回退；
- 任何 URL 都必须通过 `http:` / `https:` 校验后才能渲染为链接。

未配置 About 或 Pages 时显示明确的未配置状态，不拼接推测网址。

## 3. 全局排序与分页

排序状态位于 `useRepoStore`：

```text
sortBy: updated | stars | created | name
sortOrder: asc | desc
```

执行顺序：

```text
repos
→ filterType / tag / language / search
→ sortRepositories(allFilteredRepos)
→ slice(currentPage, pageSize)
```

这解决了旧实现只对当前页数组排序的问题。分页大小为：

```text
50, 100, 200, 500, 1000
```

分页控件在有结果时始终显示，因此选择 1000 后即使只剩一页，也能继续切换其他大小。

## 4. 取消 Star 数据流

入口：详情顶部的“取消 Star”按钮。

流程：

1. 仓库同步期间拒绝操作；
2. 用户确认取消具体仓库的 Star；
3. 检查当前 token 的 `X-OAuth-Scopes`；
4. 已有 `public_repo` 或 `repo` 时直接调用 GitHub；
5. 权限不足时显示作用域风险说明；
6. 用户同意后通过 PKCE popup 请求 `read:user public_repo`；
7. token 交换成功后替换当前 12 小时会话 token；
8. 自动重试 `DELETE /user/starred/{owner}/{repo}`；
9. 远端成功后，在共享数据写队列中删除 `repos` 和相关 `repoTags`；
10. 重新加载标签视图并关闭被删除仓库的详情。

私有仓库按钮禁用，因为本批不申请 `repo` 权限。

## 5. OAuth 权限策略

日常登录仍使用：

```text
read:user
```

只有主动使用取消 Star 时才请求：

```text
read:user public_repo
```

原因：GitHub OAuth App 没有只针对 Star 写操作的独立经典作用域。界面必须明确说明 `public_repo` 还包含更广泛的公开仓库读写能力。

作用域包含关系：

```text
repo        ⇒ public_repo
user        ⇒ read:user
public_repo ⇏ repo
```

## 6. 主要文件

```text
src/types/index.ts
src/api/github.ts
src/services/repoSync.ts
src/services/repositoryView.ts
src/services/oauthScopes.ts
src/services/oauthPermission.ts
src/stores/repo.ts
src/pages/Home/index.vue
src/pages/Home/components/RepoList.vue
src/pages/Home/components/RepositoryOverview.vue
tests/repository-view.test.mjs
tests/oauth-scopes.test.mjs
docs/development/PRIORITY_FEATURE_BATCH.md
```

## 7. 自动验证

本批新增测试覆盖：

- 全量 Star 数排序后再分页；
- 更新时间和创建时间升降序；
- 不区分大小写的项目名称排序；
- 1000 条分页大小；
- OAuth scope 多种分隔符；
- 空值处理；
- 精确权限；
- `repo` 与 `user` 的上位作用域包含关系。

第一轮 CI 和 Pages PR 构建已全绿。最终修正后的头提交还需再次通过：

```text
Lint
Frontend TypeScript
25 项单元测试
Functions TypeScript
OAuth 文档校验
应用与文档构建
CSP bundle 扫描
静态安全策略
生产依赖审计
Cloudflare bundle
GitHub Pages PR build
```

## 8. 人工验收

### 项目链接

- [ ] 打开有 About Website 的仓库，确认 URL 完全一致；
- [ ] 打开启用 GitHub Pages 的公开仓库，确认显示实际 `html_url`；
- [ ] 未配置时显示“未配置”，不出现错误猜测链接。

### 排序

- [ ] 将分页设为 50，选择 Star 数降序；
- [ ] 翻到第二页，确认仍是全量列表的连续排序；
- [ ] 分别验证更新时间、创建时间、名称的升序和降序；
- [ ] 切换到 1000，再切回 50，分页控件始终可用。

### 取消 Star

- [ ] 使用默认只读会话点击取消 Star；
- [ ] 确认出现 `public_repo` 风险说明；
- [ ] 完成 GitHub 授权后操作自动重试；
- [ ] GitHub 页面中 Star 状态已取消；
- [ ] StarHub 列表、IndexedDB `repos` 和 `repoTags` 同时删除；
- [ ] 刷新或重新同步后仓库不会重新出现；
- [ ] 拒绝权限或关闭 popup 时仓库保持不变。

## 9. 已知风险

- 自动测试不能替代真实 GitHub OAuth popup 和写操作；
- `public_repo` 权限范围较宽，必须坚持按需申请和清晰说明；
- 匿名 Pages 回退受 GitHub 未认证速率限制；
- 远端取消成功但本地存储失败属于极端部分成功状态，应通过刷新同步恢复；
- 当前仍缺少 Playwright 浏览器级 E2E。

## 10. 下一步

1. 完成 PR #14 最终 CI；
2. squash 合并到 `main`；
3. 生产发布后完成上述人工验收；
4. 返回 ESLint 零 warning 和 E2E 批次。
