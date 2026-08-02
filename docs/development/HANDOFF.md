# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
main：ca85ce9291a446bcce367f181f5480629488915e
开发分支：agent/local-oauth-docs-hardening
Pull Request：#11
```

PR #10 已完成依赖升级、生产依赖审计和静态安全策略。PR #11 删除第二套旧 Node OAuth 服务，把本地开发、生产部署和文档统一到 Cloudflare Pages Functions。

## 2. 当前 OAuth 架构

### 生产

```text
GitHub Pages
  └─ Vue 前端与 VitePress 文档
       └─ HTTPS POST 到 Cloudflare Pages API

Cloudflare Pages Functions
  ├─ GET  /api/health
  └─ POST /api/oauth/token
       └─ 服务端使用 GitHub Client Secret 交换 token
```

### 本地

```text
http://localhost:5173  Vite 前端
        │
        └─ /api 代理
              ↓
http://localhost:8788  Wrangler Pages Functions
```

仓库不再维护独立的 Express/CORS/Dotenv OAuth 服务，也不再维护第二份服务端 `package-lock.json`。

## 3. 本地配置

### GitHub OAuth App

为本地开发单独创建 OAuth App：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

生产 App 继续使用：

```text
Homepage URL: https://hujinghaoabcd.github.io/StarHub/
Authorization callback URL: https://hujinghaoabcd.github.io/StarHub/
```

GitHub OAuth App 只有一个 callback URL，因此本地与生产不要复用同一个 App。

### Functions 变量

```bash
cp .dev.vars.example .dev.vars
```

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

`.dev.vars` 被 Git 忽略。不要把 Client Secret 写入源码、Issue、日志、聊天记录或浏览器变量。

### 浏览器变量

创建未提交的 `.env.local`：

```env
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

该值必须与 `.dev.vars` 中的 `CLIENT_ID` 完全一致。Client ID 可以公开，Client Secret 不能进入任何 `VITE_*` 变量。

本地使用 Vite 代理，不需要 `VITE_API_BASE_URL`。

## 4. 本地运行

```bash
npm ci

# 终端 1
npm run cloudflare:dev

# 终端 2
npm run dev
```

验证：

```text
Frontend: http://localhost:5173/
Health:   http://localhost:8788/api/health
```

健康检查应返回 `configured: true`。

## 5. Token 交换契约

请求：

```http
POST /api/oauth/token
Content-Type: application/json
Origin: http://localhost:5173
```

```json
{
  "code": "github_authorization_code",
  "codeVerifier": "pkce_verifier",
  "redirectUri": "http://localhost:5173/"
}
```

服务端必须：

1. 校验 HTTP 方法；
2. 校验 Origin 白名单；
3. 校验 JSON 数据结构；
4. 精确校验 redirect URI；
5. 使用 PKCE `code_verifier`；
6. 在服务端使用 Client Secret；
7. 返回 `Cache-Control: no-store`；
8. 不在错误响应或日志中泄露 code、token 和 Secret。

实现文件：`functions/api/oauth/token.ts`。

## 6. 会话策略

GitHub access token 仍由浏览器在当前会话中使用：

```text
sessionStorage.starhub-auth-session-v1
sessionStorage.starhub_user
```

- 最长会话时间：12 小时；
- 关闭标签页或浏览器后不依赖长期 token 自动登录；
- GitHub 401、会话过期和手动退出统一清理；
- 跨标签页退出通过不含 token 的事件同步；
- `sessionStorage` 不是 HttpOnly，不能声称能够抵御 XSS。

## 7. 自动验证

永久验证器：

```text
scripts/verify-oauth-docs.mjs
```

它会检查：

- `server/` 旧服务目录没有恢复；
- Markdown 不包含旧接口、旧端口和旧服务路径；
- Vite `/api` 代理指向 8788；
- 本地文档包含四个 Functions 变量；
- 本地文档包含 `.env.local` 与 `VITE_GITHUB_CLIENT_ID`；
- `.dev.vars.example` 只允许本地显式 Origin；
- 本地 Client ID 示例不复用生产配置。

运行：

```bash
npm run oauth:verify
npm run check
```

`npm run check` 还包含：

- Lint；
- 前端类型检查；
- 17 项单元测试；
- Functions 类型检查；
- GitHub Pages 应用与文档构建；
- CSP/Referrer Policy 校验；
- 生产依赖审计；
- Cloudflare Pages bundle 构建。

## 8. 主要修改文件

```text
.dev.vars.example
vite.config.ts
package.json
scripts/verify-oauth-docs.mjs
docs/development/local-oauth.md
docs/guide/oauth.md
docs/guide/installation.md
docs/deploy/cloudflare.md
docs/deploy/self-host.md
docs/DEPLOYMENT.md
docs/troubleshooting/login.md
README.md
README.en.md
```

删除：

```text
server/dev-server.js
server/package.json
server/package-lock.json
```

## 9. 合并后人工验收

### 本地 OAuth

1. 创建单独的本地 GitHub OAuth App；
2. 配置 `.dev.vars` 与 `.env.local`；
3. 启动 8788 Functions 和 5173 Vite；
4. 确认 `/api/health` 返回 `configured: true`；
5. 完成 GitHub 授权；
6. 确认 Network 中是 `POST /api/oauth/token`；
7. 确认授权后可以读取用户资料和 Stars；
8. 确认 URL 中 `code`、`state` 被清理。

### 拒绝路径

1. 将 Origin 改为未授权地址，确认接口拒绝；
2. 提交错误 redirect URI，确认接口拒绝；
3. 重复使用同一个 GitHub code，确认失败且不泄露敏感信息；
4. 缺少 PKCE verifier，确认返回通用错误。

### 生产回归

1. 打开 GitHub Pages；
2. 完成生产 OAuth 登录；
3. 同步 Stars；
4. 刷新当前标签页；
5. 退出并确认会话清理；
6. 检查 Cloudflare 日志中没有 code、token 或 Secret。

## 10. 已知风险与后续

- VitePress `2.0.0-alpha.17` 是预发布版本；
- 真实 OAuth、弹窗和 Cloudflare 变量仍需人工验收；
- 前端 token 仍存在同源 XSS 风险；
- ESLint 有历史 warning；
- 前端主 chunk 仍偏大。

后续优先级：

1. 完成 PR #11 合并与人工验收；
2. 清理 ESLint warning；
3. 增加 Playwright OAuth callback、IndexedDB 和跨标签页 E2E；
4. 评估同站自定义域名与 HttpOnly Cookie/BFF；
5. 拆分大体积 chunk。

自动检查通过不能替代真实浏览器、GitHub OAuth 与 Cloudflare 生产行为验收。
