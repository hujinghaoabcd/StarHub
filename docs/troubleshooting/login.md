# 登录问题

本页用于排查 StarHub 的 GitHub OAuth 登录问题。当前流程由浏览器端 `state` 与 PKCE、Cloudflare Pages Functions 以及会话级凭据存储共同组成。

## 快速检查顺序

1. 确认前端地址和 GitHub OAuth 回调地址完全一致；
2. 确认浏览器 Client ID 与 Functions 中的 Client ID 属于同一个 OAuth App；
3. 确认 `/api/health` 返回 `configured: true`；
4. 确认 token 交换使用 `POST /api/oauth/token`；
5. 检查浏览器控制台和 Network 面板中的具体错误码。

## 本地登录失败

### 1. 检查回调地址

本地 OAuth App 应配置：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

协议、主机、端口、路径和末尾 `/` 都应保持一致。

### 2. 检查服务端变量

复制并编辑 `.dev.vars`：

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

不要使用 `Access-Control-Allow-Origin: *`。OAuth token 接口只应允许明确配置的前端 Origin。

### 3. 检查浏览器 Client ID

创建未提交的 `.env.local`：

```env
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

该值必须与 `.dev.vars` 中的 `CLIENT_ID` 完全一致。Client Secret 不得出现在 `.env.local` 或任何 `VITE_*` 变量中。

### 4. 启动两个进程

```bash
# 终端 1：Cloudflare Pages Functions
npm run cloudflare:dev

# 终端 2：Vite 前端
npm run dev
```

访问健康检查：

```text
http://localhost:8788/api/health
```

返回结果中的 `configured` 应为 `true`。

## 常见错误

### `oauth_state_mismatch`

可能原因：

- 在另一个标签页完成了授权；
- 会话存储被清除；
- 重复使用旧回调页；
- 从浏览器历史记录重新打开了带 `code` 的地址。

处理方式：关闭旧授权页，返回 StarHub 登录页重新发起授权。不要手动复制或复用回调 URL。

### `redirect_uri_mismatch` 或 `invalid_redirect_uri`

确认以下值完全一致：

- GitHub OAuth App 的 Authorization callback URL；
- `.dev.vars` 中的 `GITHUB_REDIRECT_URI`；
- 浏览器实际访问的 StarHub 根地址。

生产 GitHub Pages 地址应包含仓库子路径：

```text
https://hujinghaoabcd.github.io/StarHub/
```

不要使用 `#/login` 作为 OAuth callback URL。

### `origin_not_allowed`

本地环境确认：

```env
ALLOWED_ORIGINS=http://localhost:5173
```

生产环境确认 `ALLOWED_ORIGINS` 是正式前端的 Origin，例如：

```env
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
```

Origin 不包含路径。修改 Cloudflare Variables and Secrets 后需要重新部署，修改 `.dev.vars` 后需要重启本地 Functions。

### `bad_verification_code`

GitHub authorization code 只能使用一次，也可能在等待过久后失效。重新从登录页开始，不要刷新或重复提交旧回调。

### `/api/oauth/token` 返回 404

本地检查 Vite 代理是否指向：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8788',
    changeOrigin: true
  }
}
```

生产环境检查 `VITE_API_BASE_URL` 是否以 `/api` 结尾，例如：

```text
https://your-project.pages.dev/api
```

### `/api/health` 返回 `configured: false`

至少有一个必需变量缺失。检查：

```text
CLIENT_ID
CLIENT_SECRET
ALLOWED_ORIGINS
GITHUB_REDIRECT_URI
```

不要在日志、Issue 或聊天中粘贴 Client Secret。

## 登录后一直加载

1. 查看 Network 面板中 `/api/oauth/token` 和 GitHub `/user` 请求的状态码；
2. 确认回调完成后地址栏中的 `code` 与 `state` 已被清理；
3. 关闭其他正在进行 OAuth 的 StarHub 标签页；
4. 使用应用内“退出登录”后重新授权。

StarHub 的 GitHub token 和用户资料存储在当前浏览器会话中，不应依赖长期 `localStorage`。不建议执行 `localStorage.clear()`，因为它会同时删除主题和其他无关设置。

## Token 失效或 GitHub 返回 401

StarHub 会清理失效会话并返回登录页。重新授权即可。也可以在 GitHub 的已授权应用页面确认 StarHub 是否仍被授权：

```text
https://github.com/settings/applications
```

若你主动撤销了应用授权，旧 token 无法恢复，必须重新登录。

## 网络超时

1. 确认浏览器和 Cloudflare 运行环境都能访问 GitHub；
2. 检查本地防火墙是否阻止 5173 或 8788；
3. 查看 GitHub 状态和 Cloudflare 部署日志；
4. 重新发起一次新的授权流程。

更完整的本地配置见 [本地 OAuth 开发](../development/local-oauth.md)。
