# GitHub 登录问题

## 先判断哪一段失败

| 阶段 | 现象 | 检查 |
|---|---|---|
| 发起授权前 | 按钮提示未配置 | 前端 `VITE_GITHUB_CLIENT_ID` |
| GitHub 授权页 | OAuth App 不存在或 callback 错 | OAuth App 配置 |
| 返回 StarHub | state/回调验证失败 | 同一标签页会话、系统时间、callback |
| token 交换 | CORS、400、500 | Cloudflare 变量、Functions 日志、请求格式 |
| 已登录后 | 立即退出或 401 | token 验证、会话 12 小时、GitHub 撤权 |

## 生产实例核对值

```text
Frontend: https://hujinghaoabcd.github.io/StarHub/
OAuth API: https://starhub-oauth.pages.dev/api
Allowed Origin: https://hujinghaoabcd.github.io
Redirect URI: https://hujinghaoabcd.github.io/StarHub/
```

`Allowed Origin` 不含路径和末尾斜杠；redirect URI 包含路径和末尾斜杠。

## 常见错误

### `redirect_uri_mismatch`

逐字符比较 OAuth App callback、前端实际地址和 Cloudflare `GITHUB_REDIRECT_URI`。协议、大小写、端口、仓库路径和末尾斜杠都必须一致。修改后重新部署对应环境。

### state 校验失败

不要从另一标签页完成旧的授权，不要重复刷新带 `code` 的回调页。关闭相关标签页，在正常模式新开一个 StarHub 页面后重新登录。若浏览器阻止会话存储，也会失败。

### CORS 错误

检查 Cloudflare `ALLOWED_ORIGINS`。不要使用 `*`，不要填完整 callback。修改变量后重新部署；仅保存变量并不会总是更新已有部署。

### `/api/oauth/token` 404

生产构建的 `VITE_API_BASE_URL` 应以 `/api` 结尾，Cloudflare 构建输出目录应为 `cloudflare-dist`，根目录应保留 `functions/`。本地必须同时运行 `npm run cloudflare:dev`。

### 健康检查 `configured: false`

至少一个必要变量缺失。检查 Production/Preview 环境是否配置在正确环境，并确认 `CLIENT_SECRET` 是有效加密 Secret。不要把 Secret 发到 Issue。

### 已经授权但同步返回 401/403

退出并重新登录；在 GitHub `Settings → Applications → Authorized OAuth Apps` 检查授权是否仍存在。403 也可能是 API 限流，不要反复登录放大请求。

## 清理登录会话而不删除业务数据

优先使用应用内退出。必要时只删除当前站点 `sessionStorage` 中的认证会话，不要删除 IndexedDB；后者包含仓库分类和重点标记。若不确定，先导出备份。

## 安全地提供诊断信息

可以提供请求 URL、状态码、响应中的公开错误 code、Cloudflare 部署时间和 `deployment-info.json` SHA。必须遮盖 GitHub access token、AI Key、OAuth code、PKCE verifier、Client Secret 和完整备份内容。
