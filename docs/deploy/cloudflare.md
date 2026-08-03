# Cloudflare Pages Functions OAuth 后端

Cloudflare 项目只承载 StarHub 的 OAuth API。正式应用和文档仍由 GitHub Pages 承载，用户的 Stars、分类和 AI 任务仍只在浏览器 IndexedDB 中。

## 构建设置

| 设置 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npm run cloudflare:build` |
| Build output directory | `cloudflare-dist` |
| Root directory | `/` |
| Node.js | `22` |

构建脚本只生成 API 站点首页和 `_routes.json`。实际 API 由根目录 `functions/` 提供：

- `GET /api/health`：报告服务状态以及必要变量是否齐全；
- `POST /api/oauth/token`：校验 Origin、redirect URI、请求体与 PKCE 参数后向 GitHub 换取 token。

## 生产变量

| 名称 | 类型 | 内容 |
|---|---|---|
| `CLIENT_ID` | Text | GitHub OAuth App Client ID |
| `CLIENT_SECRET` | Encrypted | GitHub OAuth App Client Secret |
| `ALLOWED_ORIGINS` | Text | 允许调用 API 的前端 Origin |
| `GITHUB_REDIRECT_URI` | Text | OAuth App 中登记的完整回调 URL |

官方实例：

```text
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/
```

`ALLOWED_ORIGINS` 是 Origin，不含路径；`GITHUB_REDIRECT_URI` 是完整 URL，包含仓库路径和末尾斜杠。不要使用通配符，也不要把 Secret 写进普通 Text 变量。

## OAuth App 与前端变量

OAuth App 的 Homepage URL 和 callback 都应为正式前端根 URL。GitHub Actions 还必须提供：

```text
VITE_API_BASE_URL=https://<project>.pages.dev/api
VITE_GITHUB_CLIENT_ID=<与 Cloudflare CLIENT_ID 相同的 Client ID>
```

修改 Cloudflare 变量后重新部署 API；修改 Actions Variables 后重新部署 GitHub Pages。只改其中一侧可能导致 Client ID 或回调不一致。

## 本地开发

使用独立的本地 OAuth App，并复制变量模板：

```bash
cp .dev.vars.example .dev.vars
npm run cloudflare:dev
```

Wrangler 默认运行在 `http://localhost:8788`。另一个终端执行 `npm run dev`，Vite 会把 `/api` 代理到 8788。`.dev.vars` 不得提交。

## 验证清单

1. `/api/health` 返回 HTTP 200 与 `configured: true`；
2. 非白名单 Origin 被拒绝；
3. 预检请求返回允许的 method 与 headers；
4. 登录时浏览器发出 `POST /api/oauth/token`；
5. 响应含 `Cache-Control: no-store`；
6. 日志不输出 code、token 或 Client Secret；
7. 登录后回调参数从地址栏移除。

完整上线步骤、回滚和 Pages 验证见[生产部署与发布手册](../DEPLOYMENT.md)。
