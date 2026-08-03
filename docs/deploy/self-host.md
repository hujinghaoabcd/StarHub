# 自托管前端与文档

StarHub 是静态 Vue 应用，可以放在 Nginx、Caddy、对象存储或其他静态平台。GitHub OAuth code 交换仍必须由可信服务端完成；最简单的方案是复用本仓库的 Cloudflare Pages Functions。

## 根域名部署

```bash
npm ci
VITE_API_BASE_URL=https://oauth.example.com/api \
VITE_GITHUB_CLIENT_ID=<client-id> \
VITE_BASE_PATH=/ \
npm run build
```

将 `dist/` 部署到站点根目录。若也部署 VitePress 文档：

```bash
VITEPRESS_BASE_PATH=/docs/ npm run docs:build
```

将 `docs/.vitepress/dist/` 放到站点 `/docs/`。

## 子路径部署

例如部署到 `https://example.com/tools/starhub/`：

```bash
VITE_API_BASE_URL=https://oauth.example.com/api \
VITE_GITHUB_CLIENT_ID=<client-id> \
VITE_BASE_PATH=/tools/starhub/ \
npm run build

VITEPRESS_BASE_PATH=/tools/starhub/docs/ npm run docs:build
```

应用和文档的 base path 必须以 `/` 开头并结尾。构建后检查 HTML 中的资源路径，不要依赖服务器猜测子路径。

## Nginx 示例

```nginx
server {
    listen 443 ssl http2;
    server_name starhub.example.com;
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

StarHub 当前路由使用 hash history，通常不会因直接刷新产生 SPA 404；保留 `try_files` 仍有利于未来路由调整。

## 调整 OAuth 配置

OAuth App 的 Homepage URL 与 callback 指向新的前端根地址，例如：

```text
https://starhub.example.com/
```

Cloudflare 变量同步修改为：

```text
ALLOWED_ORIGINS=https://starhub.example.com
GITHUB_REDIRECT_URI=https://starhub.example.com/
```

随后重新部署 Cloudflare API，并用新的 `VITE_GITHUB_CLIENT_ID` 和 API 地址重新构建前端。

## 完全自建 OAuth API

本仓库不维护传统 Node/PM2 OAuth 服务。自建实现必须兼容 `POST /api/oauth/token` 契约，并满足：

- JSON 输入包含授权 code、PKCE verifier 和 redirect URI；
- 精确校验 Origin 与 redirect URI；
- GitHub Client Secret 只存在于服务端 Secret；
- 错误和成功响应均禁止缓存；
- 不记录授权 code、访问 token 与 Secret；
- 正确处理 CORS 预检和超时；
- 返回格式与 `functions/api/oauth/token.ts` 保持兼容。

## 自托管验收

- 从全新浏览器完成 GitHub 登录；
- 刷新、直接打开子页面和文档链接均正常；
- 静态资源路径没有引用 `/StarHub/`；
- token 请求只发往预期 API 主机；
- Client Secret 不在 JavaScript、HTML、source map 或服务器访问日志中；
- 导出备份后可在另一浏览器实例导入；
- HTTPS 与安全响应头由宿主平台正确提供。
