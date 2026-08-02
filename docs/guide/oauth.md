
# GitHub OAuth 配置

StarHub 使用 GitHub OAuth Web Flow。静态前端运行在 GitHub Pages，授权 code 由 Cloudflare Pages Function 在服务端兑换为访问令牌。

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

本地 Function 变量放在未提交的 `.dev.vars` 中，可从 `.dev.vars.example` 复制。

## 必需配置

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
VITE_GITHUB_CLIENT_ID=Ov23liIm4iNdpnHwGLfp
```

详细步骤见 [Cloudflare Pages Functions OAuth 后端](../deploy/cloudflare.md)。
