# 本地 OAuth 开发与调试

本地架构：

```text
浏览器 http://localhost:5173
  └─ /api/*（Vite proxy）
       └─ Wrangler Pages Functions http://localhost:8788
            └─ GitHub OAuth token endpoint
```

## 配置

创建本地专用 GitHub OAuth App，Homepage 与 callback 都设为 `http://localhost:5173/`。然后：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars`：

```ini
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

`.env.local`：

```ini
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

`.dev.vars` 和 `.env.local` 都不应提交。Client ID 是公开标识，Secret 不是。

## 启动与检查

```bash
# terminal 1
npm run cloudflare:dev

# terminal 2
npm run dev
```

先访问 `http://localhost:8788/api/health`。登录时开发者工具应看到 `POST /api/oauth/token`，而不是旧的 GET 接口。成功后 URL 中的 `code` 与 `state` 应被清除。

## 调试顺序

1. 确认前端实际端口仍是 5173；
2. 确认健康检查为 `configured: true`；
3. 比较 OAuth App callback 与 `GITHUB_REDIRECT_URI`；
4. 比较 `.env.local` Client ID 与 `.dev.vars` Client ID；
5. 在 Network 查看 `/api/oauth/token` 状态码和安全处理后的错误信息；
6. 清除当前标签页登录会话，重新发起一次授权；
7. 若修改 `.dev.vars`，重启 Wrangler；若修改 `.env.local`，重启 Vite。

不要把 `functions/api/oauth/token.ts` 当作普通 Node 服务启动，也不要为了调试输出 code、token 或 Secret。自动校验可运行：

```bash
npm run cloudflare:type-check
npm run oauth:verify
npm run test:unit
```

生产部署与安全验收见[生产部署与发布手册](../DEPLOYMENT.md)。
