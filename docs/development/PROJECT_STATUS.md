# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- `main` 当前提交：`6d1771d5bcafa5f645033c22dee6285871c5778e`
- 开发分支：`agent/repo-links-unstar-pagination`
- 当前 PR：`#14 feat: add repository links, global sorting, unstar, and 1000-page size`
- 当前阶段：用户优先功能批次
- 生产前端：`https://hujinghaoabcd.github.io/StarHub/`
- 生产文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## 已完成基础批次

- [x] GitHub Pages 与 Cloudflare Pages Functions 部署
- [x] OAuth state、PKCE、严格 Origin 与 redirect URI 校验
- [x] Stars 权威快照与 IndexedDB 原子同步
- [x] `repoTags` 单一关系真源与 IndexedDB v3 迁移
- [x] 12 小时会话级 token、401 清理与跨标签页退出
- [x] 生产依赖漏洞归零、严格 CSP 与 bundle 动态执行扫描
- [x] 本地 OAuth 开发统一到 Wrangler Pages Functions
- [x] vue-i18n 严格 CSP 兼容热修

## 当前批次：PR #14

### 项目链接

- [x] 仓库类型保存 `homepage` 与 `has_pages`
- [x] 详情区域显示 GitHub 仓库链接
- [x] 显示 About `homepage`
- [x] 按需读取 GitHub Pages 的实际 `html_url`
- [x] 未配置或不可读取时显示明确状态，不猜测 URL
- [x] Pages 元数据优先使用会话请求，403/404 时对公开仓库匿名回退

### 取消 Star

- [x] 接入 `DELETE /user/starred/{owner}/{repo}`
- [x] 二次确认并禁止在同步期间操作
- [x] 远端成功后删除 IndexedDB 仓库和 `repoTags`
- [x] 更新 Pinia 列表、标签视图和当前详情选择
- [x] 日常登录保持 `read:user`
- [x] 首次取消 Star 时按需请求 `public_repo`
- [x] 授权前明确说明 `public_repo` 的较宽公开仓库写权限
- [x] 不申请私有仓库 `repo` 权限
- [x] `repo` 自动视为包含 `public_repo`

### 全局排序与分页

- [x] 处理顺序改为“筛选 → 全量排序 → 分页”
- [x] 更新时间、Star 数、创建时间、名称排序
- [x] 所有字段支持升序和降序
- [x] 分页大小支持 `50 / 100 / 200 / 500 / 1000`
- [x] 只有一页时仍保留分页大小控件

### 测试

- [x] 全局 Star 数排序
- [x] 日期升序和降序
- [x] 名称排序
- [x] 1000 条分页大小
- [x] OAuth scope 解析
- [x] `repo → public_repo` 与 `user → read:user` 包含关系

## 自动验证

第一轮完整 CI 与 GitHub Pages PR 构建已通过。权限包含关系、Pages 回退和单页分页控件修正后正在执行最终 CI。

最终质量门包含：

```text
npm ci
Lint
Frontend type-check
Unit tests
Cloudflare Functions type-check
OAuth documentation verification
Application + docs build
CSP bundle verification
Static security verification
Production dependency audit
Cloudflare Pages bundle
GitHub Pages PR build
```

## 尚未完成

- [ ] PR #14 最终 CI 与 Pages 构建确认
- [ ] squash 合并到 `main`
- [ ] 生产环境强制刷新后验证新功能
- [ ] 真实账户首次按需授权 `public_repo`
- [ ] 真实取消 Star 后核对 GitHub、IndexedDB 和标签关系
- [ ] 恢复 ESLint 历史 warning 清理批次

## 已知风险

- `public_repo` 比单独的 Star 操作更宽，因此只在用户主动取消 Star 时请求，并在授权前说明；
- OAuth popup、真实权限升级和 GitHub 写操作仍需浏览器人工验收；
- 匿名 GitHub API 回退受较低速率限制，只作为 Pages 元数据的后备路径；
- `sessionStorage` token 仍可被成功执行的同源恶意脚本读取，不能替代 HttpOnly 会话；
- VitePress 2 当前仍为 alpha 版本。

## 下一步

1. 完成 PR #14 最终自动验证并合并；
2. 验证 About、Pages、全局排序、1000 条分页和取消 Star；
3. 继续 ESLint 零 warning 与质量门批次；
4. 增加 Playwright 浏览器 E2E。

## 更新规则

每一批记录：已完成、未完成、修改文件、验证结果、已知风险、人工验收和下一步。自动检查通过不能替代真实 GitHub 账户与生产浏览器验收。
