# 自托管部署

StarHub 前端可以部署在任意静态服务器，但 GitHub OAuth code 交换必须由可信服务端完成。推荐的最小维护方案是：**自托管前端 + 复用 Cloudflare Pages Functions OAuth API**。

## 环境要求

- Node.js >= 22.12.0
- npm >= 10
- Nginx、Apache、Caddy 或其他静态服务器

## 1. 构建前端

将 OAuth API 地址注入构建：

```bash
npm ci
VITE_API_BASE_URL=https://你的项目.pages.dev/api npm run build
```

构建结果位于 `dist/`。

## 2. Nginx 示例

```nginx
server {
    listen 443 ssl http2;
    server_name starhub.example.com;

    ssl_certificate /etc/letsencrypt/live/starhub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/starhub.example.com/privkey.pem;

    root /var/www/starhub/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

不需要在 Nginx 中代理已删除的旧 Node OAuth 服务。浏览器会直接访问构建时配置的 Cloudflare API 地址。

## 3. OAuth 配置

GitHub OAuth App 的 Homepage URL 与 Authorization callback URL 都应指向自托管前端根地址，例如：

```text
https://starhub.example.com/
```

Cloudflare Production Variables and Secrets 同步改为：

```text
ALLOWED_ORIGINS=https://starhub.example.com
GITHUB_REDIRECT_URI=https://starhub.example.com/
```

修改后重新部署 Cloudflare Pages，并重新构建前端。

## 4. 完全自建 OAuth 后端

本仓库不再维护第二套 Node OAuth 服务。自行实现时必须兼容以下契约：

- `POST /api/oauth/token`；
- JSON 请求体包含 `code`、`codeVerifier`、`redirectUri`；
- 服务端执行 PKCE token 交换；
- 严格校验 Origin 与 redirect URI；
- Client Secret 只保存在服务端 Secret；
- 响应使用 `Cache-Control: no-store`；
- 错误响应不得泄露 Client Secret、authorization code 或 access token。

可参考 `functions/api/oauth/token.ts` 的实现，但不要把该 TypeScript 文件直接当作普通 Node/PM2 脚本运行。

## 5. 验证

1. 前端静态资源正常加载；
2. OAuth 回调返回前端根路径；
3. token 请求发往正确的 API 域名；
4. Cloudflare 的 `ALLOWED_ORIGINS` 与自托管域名一致；
5. 浏览器开发者工具中看不到 Client Secret。
