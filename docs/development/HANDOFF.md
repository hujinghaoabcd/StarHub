# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
main：32c23b2d30d854329c13f41159a278e02468011a
开发分支：agent/first-priority-cleanup
Pull Request：#16
```

PR #16 处理第一优先级质量问题：全局样式作用域错误、7 条 ESLint warning、零 warning 质量门和状态文档更新。

## 2. 全局样式修复

### 原问题

`src/styles/main.scss` 是全局 SCSS，但其中大量使用 Vue 单文件组件专用的：

```scss
:deep(.el-button)
```

Vite 8 的 Lightning CSS 会把它视为未知伪类，并在构建中连续产生警告。由于该文件不是 `<style scoped>`，这些选择器不需要也不应该使用 `:deep()`。

### 当前处理

全局样式中的：

```scss
:deep(.selector)
```

全部规范化为：

```scss
.selector
```

组件内部 `<style scoped>` 中的 `:deep()` 保持不变，因为那是合法用法。

新增 `tests/global-style-scope.test.mjs`，验证全局样式不得再次包含 `:deep(`。

## 3. ESLint 零 warning

修复原有 7 条 warning：

```text
src/layouts/HomeLayout.vue
  loading: let → const

src/pages/Home/components/RepoCard.vue
  删除未使用的 defineEmits 返回值

src/pages/Home/components/SideMenu.vue
  allCategoryMap: let → const
  删除未使用的 batchCategoryMap 返回值
  existingTag: let → const

src/pages/Settings/index.vue
  presets: let → const

src/types/element-plus.d.ts
  linkHeader → _linkHeader
```

`package.json` 中的 lint 脚本现在要求：

```text
--max-warnings=0
```

以后任何新增 ESLint warning 都会直接导致 CI 失败。

## 4. 自动验证

一次性修改工作流已经通过完整 `npm run check`：

```text
依赖安装                         PASS
Lint，0 warnings                 PASS
前端 TypeScript                  PASS
单元测试                         PASS
Cloudflare Functions TypeScript  PASS
OAuth 文档验证                   PASS
应用与 VitePress 文档构建        PASS
CSP bundle 扫描                  PASS
静态安全验证                     PASS
生产依赖审计                     PASS，0 vulnerabilities
Cloudflare Pages bundle          PASS
```

一次性工作流已从分支中自删除，不会进入正式代码。

## 5. 取消 Star 当前行为

PR #15 已合并到 `main`。公开仓库的“取消 Star”按钮不再因为后台同步而禁用。

执行流程：

1. 用户点击并二次确认；
2. 若 Stars 后台同步仍在运行，先使旧同步失效；
3. 默认只读 token 缺少权限时，显示 `public_repo` 风险说明；
4. 用户同意后通过 PKCE popup 请求权限；
5. 自动重试 GitHub `DELETE /user/starred/{owner}/{repo}`；
6. 远端成功后删除 IndexedDB `repos` 与 `repoTags`；
7. 重新加载标签并关闭详情。

私有仓库仍禁用，因为应用没有申请范围更大的 `repo` 权限。

## 6. 必须完成的生产人工验收

自动测试无法真实操作用户 GitHub 账户，因此 PR #16 发布后执行：

1. 使用生产站点登录；
2. 在同步过程中打开一个公开测试仓库；
3. 确认“取消 Star”可点击；
4. 确认出现 `public_repo` 权限说明；
5. 完成 GitHub 授权；
6. 确认操作自动重试并成功；
7. 打开 GitHub 仓库页面确认 Star 已取消；
8. 在开发者工具 IndexedDB 中确认 `repos` 和 `repoTags` 已清理；
9. 刷新 StarHub，确认仓库不再出现；
10. 另测一次拒绝授权，确认远端和本地均不变化。

## 7. 已知风险

### 同步取消并非网络级中止

当前通过变更 `currentSyncId` 让旧同步结果失效，但已发出的分页请求仍会完成并消耗 GitHub API 配额。后续应接入 `AbortController` 或 Axios cancellation。

### 1000 条列表性能

目前最多一次渲染 1000 个 `RepoCard`，尚未接入虚拟滚动。低性能设备可能出现卡顿。

### 前端 token

Token 已从长期 `localStorage` 改为最长 12 小时的 `sessionStorage`，但成功执行的同源恶意脚本仍可读取。长期方案应考虑同站 BFF 和 HttpOnly Cookie。

### 依赖维护线

- `vue-i18n` 9 已结束主维护；
- ESLint 8 已结束主维护；
- VitePress 2 当前使用 alpha 版本。

## 8. 后续优先级

### 下一批

1. 接入 `vue-virtual-scroller`，保证 1000 条列表流畅；
2. 增加 Playwright E2E，覆盖登录、分页、排序、详情和取消 Star；
3. 为 Stars 同步加入真正的网络取消。

### 随后

1. 拆分超过 1 MB 的公共依赖与 Element Plus chunk；
2. 缓存 About/Pages 查询并处理 API 限流；
3. 升级 vue-i18n 与 ESLint；
4. 清理已合并分支和备份文件；
5. 建立 GitHub Issues 跟踪剩余技术债。

## 9. 合并前检查

- [ ] PR #16 最终 CI 成功；
- [ ] GitHub Pages PR 构建成功；
- [ ] PR 文件中没有一次性工作流；
- [ ] 全局 `main.scss` 不含 `:deep(`；
- [ ] Lint 输出为 0 warning；
- [ ] squash 合并到 `main`。
