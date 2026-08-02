
# Cloudflare Pages Functions OAuth 后端

StarHub 正式前端继续部署在 GitHub Pages：

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`

Cloudflare Pages 项目只承载 OAuth API，不重复承担正式前端托管。

## 1. 创建 Cloudflare Pages 项目

进入 Cloudflare Dashboard：

`Workers & Pages → Create → Pages → Connect to Git`

连接 GitHub 并选择 `hujinghaoabcd/StarHub`，使用以下构建设置：

| 设置 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npm run cloudflare:build` |
| Build output directory | `cloudflare-dist` |
| Root directory | `/` |
| Node.js | `22` |

`/functions` 必须位于仓库根目录。Cloudflare 会根据文件路径生成 API 路由：

- `functions/api/health.ts` → `/api/health`
- `functions/api/oauth/token.ts` → `/api/oauth/token`

## 2. 配置 Variables and Secrets

进入：

`Workers & Pages → StarHub OAuth 项目 → Settings → Variables and Secrets`

在 Production 环境添加：

| 名称 | 值 | 类型 |
|---|---|---|
| `CLIENT_ID` | `Ov23liIm4iNdpnHwGLfp` | Text |
| `CLIENT_SECRET` | GitHub OAuth App Client Secret | **Encrypt** |
| `ALLOWED_ORIGINS` | `https://hujinghaoabcd.github.io` | Text |
| `GITHUB_REDIRECT_URI` | `https://hujinghaoabcd.github.io/StarHub/` | Text |

Secret 不得提交到仓库或粘贴到 issue、日志和聊天记录。

保存变量后重新部署 Production。

## 3. 配置 GitHub OAuth App

GitHub 中进入：

`Settings → Developer settings → OAuth Apps → StarHub`

设置：

```text
Homepage URL:
https://hujinghaoabcd.github.io/StarHub/

Authorization callback URL:
https://hujinghaoabcd.github.io/StarHub/
```

回调地址不再使用 `#/login`。授权 code 和 state 会作为查询参数返回到应用根路径。

## 4. 将 Cloudflare API 地址提供给 GitHub Pages

Cloudflare 首次部署完成后会生成类似地址：

```text
https://starhub-oauth.pages.dev
```

在 GitHub 仓库进入：

`Settings → Secrets and variables → Actions → Variables`

添加：

```text
VITE_API_BASE_URL=https://你的项目.pages.dev/api
VITE_GITHUB_CLIENT_ID=Ov23liIm4iNdpnHwGLfp
```

然后重新运行 `Deploy GitHub Pages`，或者向 `main` 推送新提交。

## 5. 验证

先访问：

```text
https://你的项目.pages.dev/api/health
```

正确配置后应返回：

```json
{
  "status": "ok",
  "service": "starhub-oauth",
  "configured": true
}
```

再打开 StarHub，点击“使用 GitHub 登录”，完成授权和仓库同步。

## 6. 本地开发

复制示例变量：

```bash
cp .dev.vars.example .dev.vars
```

将 `.dev.vars` 中的 `CLIENT_SECRET` 改为本地开发 OAuth App 的密钥，然后运行：

```bash
npm run cloudflare:dev
```

Cloudflare Pages Functions 默认在 `http://localhost:8788` 启动。另一个终端运行 `npm run dev` 后，Vite 会将 `/api` 请求代理到该地址。

## 安全措施

当前实现包括：

- OAuth `state` 校验；
- PKCE S256；
- code 通过 JSON POST 发送；
- GitHub token 交换使用 POST 请求体；
- 严格 Origin 白名单和 CORS 预检；
- redirect URI 精确校验；
- 响应禁止缓存；
- Client Secret 仅存在于 Cloudflare 加密 Secret；
- 不生成伪造的随机应用 token。
