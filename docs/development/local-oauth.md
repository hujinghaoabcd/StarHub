# 本地 OAuth 开发

StarHub 本地开发使用两项服务：

- Vite 前端：`http://localhost:5173`；
- Cloudflare Pages Functions：`http://localhost:8788`。

Vite 将 `/api` 请求代理到 8788，因此浏览器始终以 5173 为 Origin。

## 1. 创建本地 OAuth App

建议为本地开发单独创建 GitHub OAuth App：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

## 2. 配置变量

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars`：

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

`.dev.vars` 已被 Git 忽略。不要把 Client Secret 放入 `VITE_*` 变量、源码、Issue、日志或聊天记录。

## 3. 启动

```bash
# 终端 1：构建并启动本地 Functions
npm run cloudflare:dev

# 终端 2：启动 Vite
npm run dev
```

## 4. 验证

```text
http://localhost:8788/api/health
```

健康检查应返回 `configured: true`。随后访问 `http://localhost:5173` 完成 GitHub 登录。

## 5. 请求契约

前端通过 Vite 代理调用：

```http
POST /api/oauth/token
Content-Type: application/json
```

请求体：

```json
{
  "code": "...",
  "codeVerifier": "...",
  "redirectUri": "http://localhost:5173/"
}
```

旧的 GET token 交换接口与重复 Node OAuth 服务已移除。
