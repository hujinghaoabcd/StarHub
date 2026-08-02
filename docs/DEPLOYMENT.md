# 部署指南

StarHub 的推荐生产架构是：**GitHub Pages 承载前端，Cloudflare Pages Functions 承载 OAuth API**。两者职责分离，避免在浏览器或静态托管平台暴露 GitHub Client Secret。

## 环境要求

- Node.js >= 22.12.0
- npm >= 10

## 1. 部署 OAuth API 到 Cloudflare Pages

连接本仓库并使用以下设置：

| 设置 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npm run cloudflare:build` |
| Build output directory | `cloudflare-dist` |
| Root directory | `/` |
| Node.js | `22` |

Cloudflare 会从仓库根目录的 `functions/` 自动生成：

- `GET /api/health`
- `POST /api/oauth/token`

### Production Variables and Secrets

| 名称 | 类型 | 示例或说明 |
|---|---|---|
| `CLIENT_ID` | Text | GitHub OAuth Client ID |
| `CLIENT_SECRET` | Encrypt | GitHub OAuth Client Secret |
| `ALLOWED_ORIGINS` | Text | `https://hujinghaoabcd.github.io` |
| `GITHUB_REDIRECT_URI` | Text | `https://hujinghaoabcd.github.io/StarHub/` |

保存后重新部署，并先访问 `https://你的项目.pages.dev/api/health` 验证配置。

## 2. 配置 GitHub OAuth App

生产 OAuth App：

```text
Homepage URL: https://hujinghaoabcd.github.io/StarHub/
Authorization callback URL: https://hujinghaoabcd.github.io/StarHub/
```

回调地址必须包含 `/StarHub/`，不要使用 `#/login`。

## 3. 将 API 地址注入 GitHub Pages 构建

在仓库的 Actions Variables 中添加：

```text
VITE_API_BASE_URL=https://你的项目.pages.dev/api
VITE_GITHUB_CLIENT_ID=你的 GitHub OAuth Client ID
```

重新运行 `Deploy GitHub Pages`。正式前端仍位于：

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`

## 4. 本地开发

详见 [本地 OAuth 开发](development/local-oauth.md)。核心命令为：

```bash
# 终端 1
npm run cloudflare:dev

# 终端 2
npm run dev
```

## 5. 自托管前端

StarHub 前端是静态应用，可构建后交给任意静态服务器：

```bash
VITE_API_BASE_URL=https://你的项目.pages.dev/api npm run build
```

部署 `dist/` 即可。推荐继续复用 Cloudflare OAuth API，不要将 Client Secret 放入前端或 Nginx 静态配置。完整说明见 [自托管部署](deploy/self-host.md)。

## 6. 验证清单

1. `/api/health` 返回 `configured: true`；
2. GitHub OAuth 回调精确匹配前端根地址；
3. 浏览器请求 `POST /api/oauth/token`，而不是旧的 GET 接口；
4. 生产环境只允许配置的 Origin；
5. 登录完成后 URL 中不残留 `code` 与 `state`；
6. Client Secret 不出现在仓库、构建产物、浏览器存储或日志中。
