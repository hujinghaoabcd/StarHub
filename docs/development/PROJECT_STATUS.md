# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- `main` 当前提交：`ca85ce9291a446bcce367f181f5480629488915e`
- 开发分支：`agent/local-oauth-docs-hardening`
- 当前 PR：`#11 refactor: unify local OAuth development`
- 当前阶段：统一本地 OAuth、部署与文档模型
- 生产前端：`https://hujinghaoabcd.github.io/StarHub/`
- 生产文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## 已完成批次

### 工程与部署基础

- [x] Node.js 22、ESLint、TypeScript、单元测试和 CI
- [x] GitHub Pages 应用与 VitePress 文档联合构建
- [x] Cloudflare Pages Functions OAuth API
- [x] GitHub OAuth `state`、PKCE、JSON POST、严格 Origin 与 redirect URI 校验

### 仓库同步正确性（PR #7，已合并）

- [x] 远端 Stars 作为权威完整快照
- [x] 取消 Star 后删除本地幽灵仓库
- [x] 分页完整成功后原子提交
- [x] 合并提交：`909b99e23eef4aafef6af8109be786e9ba8e12f8`

### 标签关系单一真源（PR #8，已合并）

- [x] `repoTags` 成为唯一持久化标签关系真源
- [x] IndexedDB v3 迁移与孤儿关系过滤
- [x] 同步、标签编辑、导入与清空共享事务队列
- [x] 合并提交：`4bf20a5dc57776438a35be86b9a1dbc04514ab45`

### 会话级认证（PR #9，已合并）

- [x] GitHub token 与用户资料迁移到 `sessionStorage`
- [x] 旧长期 token 自动迁移并删除
- [x] 12 小时会话边界、定时检查与 401 统一清理
- [x] 跨标签页退出同步
- [x] 合并提交：`f4aee772a9d71b97e5302f7fcb0c31d9682a8575`

### 依赖与静态交付加固（PR #10，已合并）

- [x] Axios `1.19.0`、DOMPurify `3.4.12`
- [x] Vite `8.2.0`、TypeScript `5.9.3`、vue-tsc `3.3.9`
- [x] VitePress `2.0.0-alpha.17` 与可重现 lockfile
- [x] CSP、Referrer Policy 与外置主题初始化脚本
- [x] `npm audit --omit=dev` 加入 CI 质量门
- [x] 生产依赖漏洞为 0
- [x] 合并提交：`ca85ce9291a446bcce367f181f5480629488915e`

## 当前批次：本地 OAuth 与文档统一（PR #11）

### 已完成

- [x] 删除重复的 `server/` Node OAuth 服务及独立依赖树
- [x] 本地 API 统一为 Cloudflare Pages Functions
- [x] Vite `/api` 代理从 7001 改为 Wrangler 默认端口 8788
- [x] 本地 token 交换统一为 `POST /api/oauth/token`
- [x] `.dev.vars.example` 改为仅允许 `http://localhost:5173`
- [x] 本地服务端变量统一为 `CLIENT_ID`、`CLIENT_SECRET`、`ALLOWED_ORIGINS`、`GITHUB_REDIRECT_URI`
- [x] 新增 `.env.local` 中的 `VITE_GITHUB_CLIENT_ID` 配置说明
- [x] 明确浏览器 Client ID 与 Functions Client ID 必须属于同一个 OAuth App
- [x] 重写本地开发、部署、自托管和登录排障文档
- [x] 删除通配 CORS、长期 `localStorage` 和旧 GET token 流程的过时指导
- [x] 新增 `scripts/verify-oauth-docs.mjs`
- [x] CI 阻止旧服务目录、旧接口、旧端口和旧路径回归

### 自动验证

迁移工作流已通过：

```text
Migration application                    PASS
npm ci                                   PASS
Lint                                     PASS
Type-check                               PASS
Unit tests                               PASS，17 tests
Cloudflare Functions type-check          PASS
OAuth documentation verification         PASS
Application + docs build                 PASS
Static security verification             PASS
Production dependency audit              PASS，0 vulnerabilities
Cloudflare Pages bundle                   PASS
```

机器人生成的文档提交会显示 GitHub `action_required`，最终普通提交将重新运行 PR CI 与 Pages 构建。

## 本地开发标准流程

```bash
npm ci
cp .dev.vars.example .dev.vars
# 创建 .env.local，写入 VITE_GITHUB_CLIENT_ID
npm run cloudflare:dev
npm run dev
```

本地地址：

```text
Frontend: http://localhost:5173/
Functions: http://localhost:8788
Health:    http://localhost:8788/api/health
```

本地 OAuth App：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

## 合并后人工验收

- [ ] `.dev.vars` 使用本地 OAuth App 的 Client ID 与 Secret
- [ ] `.env.local` 的 `VITE_GITHUB_CLIENT_ID` 与 `.dev.vars` 的 `CLIENT_ID` 一致
- [ ] `/api/health` 返回 `configured: true`
- [ ] 本地授权回调到 `http://localhost:5173/`
- [ ] Network 面板只出现 `POST /api/oauth/token`
- [ ] 错误 Origin 返回拒绝响应
- [ ] 错误 redirect URI 返回拒绝响应
- [ ] 登录成功后 URL 中不残留 `code` 与 `state`
- [ ] GitHub Pages 生产登录与仓库同步不回归

## 已知风险

- `sessionStorage` 仍可被成功执行的同源恶意脚本读取，不能替代 HttpOnly 会话；
- VitePress 2 当前为 alpha 版本，升级时需继续运行完整文档构建；
- 本地 OAuth App 与生产 OAuth App 必须分别维护；
- 自动测试尚未覆盖真实 GitHub 授权、浏览器弹窗和 Cloudflare 生产变量；
- 前端主要 chunk 仍偏大；
- ESLint 仍有历史 warning，但没有 error。

## 后续计划

1. 完成 PR #11 最终 CI、Pages PR 构建与 squash 合并；
2. 执行本地 OAuth 和生产 OAuth 人工验收；
3. 清理 ESLint warning；
4. 增加 Playwright 登录、IndexedDB 与跨标签页 E2E；
5. 评估同站自定义域名、HttpOnly Cookie 与 GitHub API BFF；
6. 拆分大体积前端 chunk。

## 更新规则

每一批记录：已完成、未完成、修改文件、验证结果、已知风险、人工验收和下一步。自动检查通过不能替代真实浏览器与生产环境验收。
