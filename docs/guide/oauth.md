# GitHub OAuth 配置与安全边界

StarHub 使用 GitHub OAuth Web Flow、随机 `state` 和 PKCE S256。静态前端负责发起授权，Cloudflare Pages Function 使用服务端 Secret 兑换访问 token。

## 完整流程

1. 浏览器生成一次性的 `state`、`code_verifier` 和 S256 `code_challenge`；
2. 临时验证信息写入会话级存储，然后跳转 GitHub；
3. GitHub 授权后把 `code` 与 `state` 返回应用根 URL；
4. 前端先校验 `state`、回调时效和 redirect URI；
5. 前端用 JSON `POST` 把 code、verifier 与 redirect URI 发送到 `/api/oauth/token`；
6. Function 再校验 Origin 和 redirect URI，并使用 Client Secret 调用 GitHub；
7. 前端取得 token、验证 GitHub 用户并移除地址栏回调参数；
8. token 保存在 `sessionStorage`，最长会话 12 小时，关闭会话或主动退出后清除。

Client Secret 从不进入浏览器；用户仓库、分类和 AI 数据也不会发送到 OAuth Function。

## 权限与影响

StarHub 需要读取用户 starred repositories，并支持用户主动取消 Star。实际授权范围以登录页和 GitHub 授权页面显示为准。用户应在 GitHub 设置中随时撤销不再使用的 OAuth App 授权。

## 生产配置

OAuth App：

```text
Homepage URL=https://hujinghaoabcd.github.io/StarHub/
Authorization callback URL=https://hujinghaoabcd.github.io/StarHub/
```

Cloudflare：

```text
CLIENT_ID=<production-client-id>
CLIENT_SECRET=<encrypted-secret>
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/
```

GitHub Actions Variables：

```text
VITE_API_BASE_URL=https://starhub-oauth.pages.dev/api
VITE_GITHUB_CLIENT_ID=<production-client-id>
```

## 本地配置

使用另一套 OAuth App：

```text
Homepage URL=http://localhost:5173/
Authorization callback URL=http://localhost:5173/
```

服务端变量写入 `.dev.vars`，公开 Client ID 写入 `.env.local`，然后分别运行 `npm run cloudflare:dev` 和 `npm run dev`。详见[本地 OAuth 开发](../development/local-oauth.md)。

## 常见配置错误

| 错误 | 原因 |
|---|---|
| `redirect_uri_mismatch` | callback 的协议、主机、路径或末尾斜杠不一致 |
| `bad_verification_code` | code 已使用、过期，或重复处理浏览器回调 |
| `state` 校验失败 | 在另一标签页发起登录、会话存储被清理或回调过期 |
| CORS 错误 | `ALLOWED_ORIGINS` 写入了路径、尾斜杠或错误域名 |
| Client ID 不一致 | 前端变量与 Cloudflare 变量来自不同 OAuth App |
| API 404 | `VITE_API_BASE_URL` 缺少 `/api`，或 Functions 未正确部署 |

不要通过关闭 `state`、放宽到 `*` Origin、把 Secret 放进前端或改成 GET 来“解决”这些错误。正确做法是让四处配置逐字符一致。
