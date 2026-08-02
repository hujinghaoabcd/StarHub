# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
main：4bf20a5dc57776438a35be86b9a1dbc04514ab45
开发分支：agent/session-auth-lifecycle
Pull Request：#9
```

PR #8 的标签关系单一真源改造已经合并。PR #9 将 GitHub access token 从长期浏览器持久化改为有界会话，并统一过期、401、退出和跨标签页清理。

## 2. 会话策略

### 存储位置

旧实现：

```text
localStorage.github-token
localStorage.app-token
localStorage.starhub_user
```

新实现：

```text
sessionStorage.starhub-auth-session-v1
sessionStorage.starhub_user
```

长期 `localStorage` 不再保存 GitHub token 或用户资料。

### 会话数据

```ts
interface AuthSession {
  version: 1
  authorization: string
  createdAt: number
  lastUsedAt: number
}
```

- `authorization` 保存完整 Authorization header 值；
- 最长会话时间为 12 小时；
- `lastUsedAt` 最多每 5 分钟写入一次，减少 Storage 写入；
- `getSessionInfo()` 只返回时间信息，不返回 token。

### 浏览器关闭行为

`sessionStorage` 使会话限定在当前标签页会话。关闭标签页或浏览器后不再依赖长期 token 自动登录。

浏览器禁用 Storage API 时，认证退化为当前页面内存会话；刷新后需要重新登录。

## 3. 旧数据迁移

第一次读取认证状态时：

1. 检查版本化 sessionStorage 会话；
2. 若不存在，读取旧 `localStorage.github-token`；
3. 将旧 token 写入当前 sessionStorage 会话；
4. 删除 `localStorage.github-token` 和 `localStorage.app-token`；
5. 用户资料由 user store 同步迁移到 sessionStorage；
6. 损坏或过期会话直接删除。

这样升级时当前用户通常不需要立刻重新授权，但旧 token 不会继续长期保存。

## 4. 会话期限执行

新增：

```text
src/utils/authLifecycle.ts
```

会话守护器在以下时机检查：

- 每 60 秒；
- 浏览器窗口重新聚焦；
- 页面从隐藏恢复为可见。

过期后跳转：

```text
#/login?reason=session-expired
```

以下页面不被守护器打断：

- 登录页；
- 带 GitHub OAuth `code` 的回调页。

## 5. GitHub 请求层

`src/api/request.ts` 的行为：

### 请求前

- 获取有效会话 token；
- 无 token 或已过期时不发送匿名 GitHub API 请求；
- 清理会话并跳转登录页。

### 响应后

GitHub 返回 401 时：

- 清理 token 和用户资料；
- 只发起一次登录跳转；
- 使用 `reason=unauthorized` 显示重新授权提示。

403、网络错误和其他 API 错误不会被误判为 token 失效。

## 6. 退出与跨标签页同步

当前标签页退出：

1. 删除当前会话 token；
2. 删除当前用户资料缓存；
3. 删除所有旧 localStorage 认证键；
4. 通过非敏感 localStorage 事件广播退出；
5. Pinia 用户状态清空并返回登录页。

其他标签页收到广播后：

1. 清理自己的 sessionStorage 会话；
2. 不再次广播，避免循环；
3. 跳转 `#/login?reason=logged-out`；
4. 显示“登录已在另一个标签页退出”。

广播内容只包含时间戳，不包含 token。

## 7. 登录页提示

登录页区分：

```text
session-expired  会话达到本地期限
unauthorized     GitHub 拒绝当前凭据
logged-out       其他标签页主动退出
```

OAuth `state` 和 PKCE 流程保持不变。

## 8. 自动验证

```text
CI run                           30761611893  PASS
Lint                                         PASS
Frontend type-check                          PASS
Unit tests                                   PASS，17 tests
Cloudflare Functions type-check              PASS
Application + docs build                     PASS
Cloudflare bundle build                      PASS
```

新增 `tests/auth-session.test.mjs`，覆盖：

1. 新 token 只进入 sessionStorage；
2. 旧 localStorage token 自动迁移；
3. 会话到期后拒绝并清理；
4. 退出清理及通知；
5. Storage API 被阻止时的内存回退；
6. 会话时间信息不泄露 token。

运行：

```bash
npm run test:unit
npm run check
```

## 9. 主要文件

- `src/utils/auth.ts`
- `src/utils/authLifecycle.ts`
- `src/api/request.ts`
- `src/stores/user.ts`
- `src/pages/Login.vue`
- `src/main.ts`
- `tests/auth-session.test.mjs`
- `docs/development/PROJECT_STATUS.md`
- `docs/development/HANDOFF.md`

## 10. 合并后人工验收

### 旧登录迁移

1. 使用旧生产版本保持登录；
2. 打开新版本；
3. 确认当前标签页仍能进入首页；
4. DevTools → Application → Local Storage；
5. 确认 `github-token`、`app-token`、`starhub_user` 已删除；
6. Session Storage 中应存在版本化会话和用户资料。

### 刷新和关闭

1. 登录后刷新当前标签页，确认仍登录；
2. 关闭该标签页；
3. 重新从地址栏打开 StarHub；
4. 确认需要重新登录。

### 手动退出

1. 登录后点击退出；
2. 确认 token、用户资料和旧键全部删除；
3. 确认返回登录页。

### 跨标签页退出

1. 从已登录标签页再打开一个 StarHub 标签页；
2. 在其中一个标签页退出；
3. 确认另一个标签页自动返回登录页；
4. 确认显示跨标签页退出提示。

### 过期与 401

1. 开发环境缩短 `maxAgeMs` 或写入过期会话；
2. 确认一分钟内或窗口重新聚焦时返回登录页；
3. 模拟 GitHub 401；
4. 确认显示重新授权提示；
5. 确认没有重复跳转循环。

### OAuth 回归

1. 测试弹窗登录；
2. 测试浏览器阻止弹窗后的错误提示；
3. 测试同页 OAuth callback；
4. 确认 callback 不会被会话守护器提前重定向；
5. 确认登录成功后能够读取用户和 Stars。

## 11. 安全边界

本批解决的是“长期持久化”风险，不是彻底消除浏览器 token 风险。

`sessionStorage` 仍可被成功执行的同源恶意脚本读取。因此：

- 不应把 sessionStorage 描述为 HttpOnly；
- 不应声称能够抵御 XSS；
- 浏览器端加密 token 没有可信密钥边界，不采用伪加密；
- 更高等级方案需要同站后端会话或 GitHub API BFF。

## 12. 后续优先级

1. PR #9 squash 合并并发布；
2. 完成第 10 节生产验收；
3. 审查前端 CSP、第三方依赖和 HTML 注入面；
4. 审查 33 个 npm audit 漏洞；
5. 清理 ESLint 警告和大体积 chunk；
6. 评估自定义同站域名、HttpOnly Cookie 与 Cloudflare 会话存储。

自动检查通过不能替代真实浏览器存储、跨标签页和 OAuth 回归验收。
