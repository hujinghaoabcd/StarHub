# GitHub OAuth 配置

StarHub 使用 GitHub OAuth Web Flow。静态前端运行在 GitHub Pages，authorization code 由 Cloudflare Pages Function 在服务端兑换为访问令牌。

## 生产地址

```text
Homepage URL:
https://hujinghaoabcd.github.io/StarHub/

Authorization callback URL:
https://hujinghaoabcd.github.io/StarHub/
```

回调地址必须包含 `/StarHub/`，并且不能使用 `#/login`。

## 安全流程

1. 浏览器生成随机 `state` 与 PKCE `code_verifier`；
2. 浏览器将 `code_challenge` 发给 GitHub；
3. GitHub 将 `code` 和 `state` 返回 StarHub 根路径；
4. StarHub 校验 `state`；
5. StarHub 使用 POST 将 `code`、`code_verifier` 和回调地址发送给 Cloudflare；
6. Cloudflare 使用加密保存的 Client Secret 向 GitHub 交换 token；
7. 前端验证当前 GitHub 用户并进入应用。

## 本地开发

本地环境应使用单独的 GitHub OAuth App：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

### Functions 变量

从示例复制未提交的 `.dev.vars`：

```bash
cp .dev.vars.example .dev.vars
```

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

### 浏览器变量

创建未提交的 `.env.local`：

```env
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

`.env.local` 中的 `VITE_GITHUB_CLIENT_ID` 必须与 `.dev.vars` 中的 `CLIENT_ID` 属于同一个本地 OAuth App。Client Secret 不能进入任何 `VITE_*` 变量。

### 启动

```bash
# 终端 1：OAuth Functions，端口 8788
npm run cloudflare:dev

# 终端 2：Vite 前端，端口 5173
npm run dev
```

Vite 会把 `/api` 请求代理到 `http://localhost:8788`。完整说明见 [本地 OAuth 开发](../development/local-oauth.md)。

## 生产必需配置

Cloudflare Production Variables and Secrets：

```text
CLIENT_ID
CLIENT_SECRET
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/
```

GitHub Actions Variables：

```text
VITE_API_BASE_URL=https://你的项目.pages.dev/api
VITE_GITHUB_CLIENT_ID=你的生产 GitHub OAuth Client ID
```

浏览器变量与 Cloudflare 的 `CLIENT_ID` 必须使用同一个生产 OAuth App。详细步骤见 [Cloudflare Pages Functions OAuth 后端](../deploy/cloudflare.md)。
