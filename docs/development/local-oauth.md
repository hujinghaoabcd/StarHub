# 本地 OAuth 开发

StarHub 本地开发使用两个进程：

- Vite 前端：`http://localhost:5173`；
- Cloudflare Pages Functions：`http://localhost:8788`。

Vite 将 `/api` 请求代理到 8788，因此浏览器请求的 Origin 始终是 `http://localhost:5173`。

## 1. 创建独立的本地 OAuth App

建议不要复用生产 OAuth App。GitHub OAuth App 只允许配置一个回调地址，本地与 GitHub Pages 的域名不同，因此应单独创建本地 App：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

记录该 App 的 Client ID，并生成 Client Secret。Client Secret 不要发送到聊天、Issue、日志或提交记录中。

## 2. 配置 Functions 变量

复制示例文件：

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`：

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

`.dev.vars` 已被 Git 忽略。`ALLOWED_ORIGINS` 在本地只保留 Vite 地址，不要使用 `*`。

## 3. 配置浏览器端 Client ID

浏览器发起 GitHub 授权时也必须使用同一个本地 OAuth App。创建未提交的 `.env.local`：

```env
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

这里的值必须与 `.dev.vars` 中的 `CLIENT_ID` 完全一致。Client ID 是公开标识，可以进入浏览器；Client Secret 绝不能写入任何 `VITE_*` 变量。

本地开发使用 Vite 代理，因此不需要设置 `VITE_API_BASE_URL`。只有前端与 API 分属不同域名的生产或自托管构建才需要该变量。

## 4. 启动

```bash
# 终端 1：构建并启动本地 Functions
npm run cloudflare:dev

# 终端 2：启动 Vite
npm run dev
```

不要直接把 `functions/api/oauth/token.ts` 当作普通 Node 脚本运行。

## 5. 验证

先访问：

```text
http://localhost:8788/api/health
```

健康检查应返回 `configured: true`。随后访问 `http://localhost:5173/`，点击 GitHub 登录。

浏览器开发者工具中应看到：

```http
POST /api/oauth/token
Content-Type: application/json
```

请求体包含：

```json
{
  "code": "...",
  "codeVerifier": "...",
  "redirectUri": "http://localhost:5173/"
}
```

## 6. 常见问题

### `redirect_uri_mismatch`

确认以下三处都精确为 `http://localhost:5173/`：

1. GitHub OAuth App 的 Authorization callback URL；
2. `.dev.vars` 中的 `GITHUB_REDIRECT_URI`；
3. 浏览器实际打开的 StarHub 根地址。

### `origin_not_allowed`

确认 `.dev.vars` 中包含：

```env
ALLOWED_ORIGINS=http://localhost:5173
```

修改 `.dev.vars` 后需要重启 `npm run cloudflare:dev`。

### GitHub 返回 `bad_verification_code`

授权 code 只能使用一次，也可能在等待过久后失效。关闭旧授权页，从 StarHub 登录页重新发起授权。

旧的 GET token 交换接口与重复 Node OAuth 服务已经移除。
