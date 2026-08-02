# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- `main` 当前提交：`32c23b2d30d854329c13f41159a278e02468011a`
- 开发分支：`agent/first-priority-cleanup`
- 当前 PR：`#16 fix: complete first priority cleanup`
- 当前阶段：第一优先级质量修复
- 生产前端：`https://hujinghaoabcd.github.io/StarHub/`
- 生产文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## 已完成基础能力

- [x] GitHub Pages 与 Cloudflare Pages Functions 部署
- [x] OAuth state、PKCE、严格 Origin 与 redirect URI 校验
- [x] Stars 权威快照与 IndexedDB 原子同步
- [x] `repoTags` 单一关系真源与 IndexedDB v3 迁移
- [x] 12 小时会话级 token、401 清理与跨标签页退出
- [x] 生产依赖漏洞归零、严格 CSP 与 bundle 动态执行扫描
- [x] 本地 OAuth 开发统一到 Wrangler Pages Functions
- [x] vue-i18n 严格 CSP 兼容
- [x] About Website 与 GitHub Pages 实际地址展示
- [x] 全量升降序排序与最大 1000 条分页
- [x] 应用内取消公开仓库 Star
- [x] 取消 Star 在后台同步期间保持可用，并安全取消旧同步

## 当前批次：PR #16

### 全局样式修复

- [x] 移除 `src/styles/main.scss` 中全部 Vue SFC `:deep()` 选择器
- [x] 全局 Element Plus 主题覆盖改为普通 CSS/SCSS 选择器
- [x] 增加单元测试，禁止 `:deep()` 再次进入全局样式
- [x] 消除 Lightning CSS 对全局 `:deep()` 的构建警告

### ESLint 零 warning

- [x] 修复 7 条既有 warning
- [x] 修复 `prefer-const`
- [x] 删除未使用的 `defineEmits` 返回值和分类结果变量
- [x] 修正声明文件中的未使用参数名
- [x] `npm run lint` 增加 `--max-warnings=0`
- [x] 后续新增 warning 将直接阻止 CI

### 自动验证

一次性修改工作流已通过：

```text
npm ci                              PASS
Lint --max-warnings=0               PASS
Frontend type-check                 PASS
Unit tests                          PASS
Cloudflare Functions type-check     PASS
OAuth documentation verification   PASS
Application + docs build            PASS
CSP bundle verification             PASS
Static security verification        PASS
Production dependency audit         PASS，0 vulnerabilities
Cloudflare Pages bundle             PASS
```

普通文档提交将再次触发最终 CI 和 GitHub Pages PR 构建。

## 尚未完成的人工验收

### 取消 Star 生产链路

- [ ] 使用生产站点登录真实 GitHub 账户
- [ ] 在后台同步尚未结束时打开一个公开仓库详情
- [ ] 确认“取消 Star”按钮可点击
- [ ] 首次操作时确认 `public_repo` 权限说明
- [ ] 完成 GitHub OAuth 授权并确认操作自动重试
- [ ] 确认 GitHub 仓库页面已取消 Star
- [ ] 确认 StarHub 列表、IndexedDB `repos` 和 `repoTags` 同时删除
- [ ] 刷新或重新同步后仓库不再出现
- [ ] 拒绝授权或关闭 popup 时仓库保持不变

自动测试不能替代真实 OAuth popup 和 GitHub 写操作，因此该项必须保留为人工生产验收。

## 仍需后续处理

### P1

- [ ] 为 1000 条列表接入虚拟滚动
- [ ] 增加 Playwright 浏览器 E2E
- [ ] 为 Stars 同步请求加入 `AbortController`，真正终止网络请求
- [ ] 拆分超过 1 MB 的 Element Plus 与公共依赖 chunk

### P2

- [ ] 为 About/Pages 查询增加缓存、请求去重与限流提示
- [ ] 评估 HttpOnly Cookie + BFF 的长期认证架构
- [ ] 升级 `vue-i18n` 与 ESLint 维护线
- [ ] 在 VitePress 2 稳定版发布后退出 alpha
- [ ] 清理 Vite、主题初始化和文档高亮构建警告

### P3

- [ ] 删除已合并的开发与热修分支
- [ ] 删除仓库中的备份文件
- [ ] 将剩余技术债建立为 GitHub Issues

## 下一步

1. 确认 PR #16 最终 CI 与 Pages 构建；
2. squash 合并到 `main`；
3. 等待生产 Pages 发布；
4. 完成取消 Star 真实账户人工验收；
5. 进入虚拟滚动与 Playwright E2E 批次。

## 更新规则

每一批记录：已完成、未完成、修改文件、验证结果、已知风险、人工验收和下一步。自动检查通过不得表述为真实 GitHub 账户行为已经完成验收。
