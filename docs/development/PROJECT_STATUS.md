# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- `main` 当前提交：`4bf20a5dc57776438a35be86b9a1dbc04514ab45`
- 开发分支：`agent/session-auth-lifecycle`
- 当前 PR：`#9 security: scope authentication to a bounded browser session`
- 当前阶段：GitHub token 会话化、过期控制和统一清理
- GitHub Pages：已发布
- Cloudflare Pages OAuth：已部署并接通
- PR #9：代码和自动验证完成，等待合并与生产浏览器验收

## 已完成批次

### 工程、部署与 OAuth

- [x] Node.js 22、ESLint、TypeScript、CI 和联合构建
- [x] GitHub Pages 应用与文档部署
- [x] Cloudflare Pages Functions OAuth 后端
- [x] OAuth `state`、PKCE、严格 CORS 和安全弹窗回调

### 仓库同步正确性（PR #7，已合并）

- [x] 远端 Stars 作为权威完整快照
- [x] 取消 Star 后删除本地幽灵仓库
- [x] 分页完整成功后原子提交
- [x] 合并提交：`909b99e23eef4aafef6af8109be786e9ba8e12f8`

### 标签关系单一真源（PR #8，已合并）

- [x] `repoTags` 成为唯一持久化标签关系真源
- [x] IndexedDB 升级到 v3 并迁移旧关系
- [x] 仓库同步、标签编辑、导入和清空共享事务队列
- [x] 备份格式升级到 v2.0
- [x] 合并提交：`4bf20a5dc57776438a35be86b9a1dbc04514ab45`

### 会话级认证（PR #9）

- [x] GitHub token 从 `localStorage` 迁移到 `sessionStorage`
- [x] 旧 `github-token` 首次读取时自动迁移并删除
- [x] 旧 `app-token` 自动清除
- [x] 用户资料缓存从 `localStorage` 迁移到 `sessionStorage`
- [x] 会话最长 12 小时
- [x] 关闭标签页或浏览器后不再长期保存 token
- [x] 浏览器禁止 Storage API 时退化为当前页面内存会话
- [x] 会话数据结构校验和损坏数据清理
- [x] 每 5 分钟最多更新一次 `lastUsedAt`
- [x] 每分钟、窗口聚焦和页面重新可见时检查会话期限
- [x] OAuth callback 和登录页不受会话守护器干扰
- [x] 请求前发现无有效会话时直接跳转登录
- [x] GitHub 401 统一清理并只跳转一次
- [x] 清理认证时同时删除 token 和缓存用户资料
- [x] 跨标签页同步退出
- [x] 登录页区分会话过期、GitHub 拒绝和其他标签页退出

## 自动验证

```text
PR                              #9
Branch                          agent/session-auth-lifecycle
CI run                          30761611893  PASS
npm ci                                        PASS
npm run lint                                 PASS
npm run type-check                           PASS
npm run test:unit                            PASS，17 tests
npm run cloudflare:type-check                PASS
npm run pages:build                          PASS
npm run cloudflare:build                     PASS
```

新增认证测试覆盖：

- 新 token 只写入会话存储；
- 旧 localStorage token 自动迁移；
- 到期会话拒绝并删除；
- 退出清理和通知；
- Storage API 被阻止时的内存回退；
- 会话时间元数据不暴露 token。

## 在线地址

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## PR #9 主要文件

- `src/utils/auth.ts`
- `src/utils/authLifecycle.ts`
- `src/api/request.ts`
- `src/stores/user.ts`
- `src/pages/Login.vue`
- `src/main.ts`
- `tests/auth-session.test.mjs`

## 合并后人工验收

- [ ] 已登录旧版本升级后无需立即重新授权
- [ ] localStorage 中不再存在 `github-token`、`app-token`、`starhub_user`
- [ ] sessionStorage 中存在版本化认证会话和用户资料
- [ ] 刷新当前标签页仍保持登录
- [ ] 关闭标签页后重新打开需要重新登录
- [ ] 手动退出后 token 和用户资料全部删除
- [ ] 两个标签页中任一标签页退出，另一标签页同步返回登录页
- [ ] 模拟 401 后显示重新授权提示
- [ ] 模拟过期后显示会话过期提示
- [ ] OAuth 弹窗和同页回调仍能完成登录

## 已知风险

- `sessionStorage` 仍可被同源 JavaScript 读取，不能抵御成功的 XSS；
- 真正的 HttpOnly 服务端会话需要后续引入同站后端会话或 GitHub API BFF；
- 自动测试尚未覆盖真实浏览器跨标签页和计时器行为；
- npm audit 仍报告 33 个依赖漏洞；
- 主要前端 chunk 仍偏大。

## 后续计划

### P1：认证纵深防御

- [ ] 评估同站自定义域名与 HttpOnly Cookie 可行性
- [ ] 评估 Cloudflare KV/D1 会话或 GitHub API BFF
- [ ] 增加 Content Security Policy 和 XSS 防护审查

### P1：依赖与质量

- [ ] 审查 33 个依赖漏洞：2 low、12 moderate、19 high
- [ ] 清理现有 ESLint 警告
- [ ] 处理主要 chunk 过大问题
- [ ] 增加 Playwright 认证与 IndexedDB E2E

## 下一步

1. 将 PR #9 标记 Ready 并 squash 合并到 `main`；
2. 跟踪主分支 CI 与 GitHub Pages 发布；
3. 执行会话迁移、刷新、关闭标签页和跨标签页退出验收；
4. 下一批处理依赖漏洞与前端安全响应头。

## 更新规则

每一批必须记录：已完成、未完成、修改文件、验证结果、已知风险和下一步。自动检查通过不得替代真实浏览器和生产行为验收。
