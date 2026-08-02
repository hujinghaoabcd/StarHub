# 登录问题

本页介绍 StarHub 的登录相关问题和解决方案。

## OAuth 登录失败

### 问题描述

点击「使用 GitHub 登录」后，跳转 GitHub 授权，但返回后显示错误。

### 常见原因

1. **回调地址不匹配**
2. **后端服务未运行**
3. **Client ID/Secret 配置错误**
4. **网络问题**

### 解决方案

#### 检查回调地址

GitHub OAuth App 的回调地址必须**完全匹配**：

| 环境 | 回调地址 |
|------|----------|
| 本地开发 | `http://localhost:5173/` |
| 生产环境 | `https://yourdomain.com/` |

注意：
- 协议（http/https）必须匹配
- 端口号必须匹配
- 路径必须匹配

#### 检查后端服务

本地开发时，确保 OAuth 代理服务器正在运行：

```bash
node server/dev-server.js
```

成功运行会显示：
```
🚀 本地开发服务器运行在 http://localhost:7001
```

#### 检查配置文件

确认 `src/config/oauth.ts` 中的 `CLIENT_ID` 正确：

```typescript
export const GITHUB_OAUTH_CONFIG = {
  CLIENT_ID: 'your_actual_client_id'
}
```

确认 `.env` 文件存在且内容正确：

```env
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
```

---

## 授权后一直加载

### 问题描述

GitHub 授权成功，跳转回 StarHub 后页面一直显示加载状态。

### 解决方案

1. **检查控制台错误**：按 F12 查看是否有报错

2. **清除登录状态**：
   ```javascript
   localStorage.removeItem('github_token');
   localStorage.removeItem('access_token');
   location.reload();
   ```

3. **重新登录**：清除后刷新页面重试

---

## Token 失效

### 问题描述

之前可以正常使用，突然无法获取数据或提示未授权。

### 原因

- Token 过期
- 在 GitHub 撤销了授权
- Token 被意外清除

### 解决方案

1. **退出重新登录**：点击头像 → 退出登录 → 重新登录

2. **检查 GitHub 授权**：
   - 访问 https://github.com/settings/applications
   - 确认 StarHub 在已授权列表中

3. **手动清除重新授权**：
   ```javascript
   localStorage.clear();
   location.reload();
   ```

---

## 跨域错误

### 问题描述

控制台显示 CORS 相关错误。

### 原因

- 后端代理未正确配置
- 生产环境 Workers/Serverless 配置问题

### 解决方案

#### 本地开发

确认 `vite.config.ts` 中代理配置正确：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:7001',
    changeOrigin: true
  }
}
```

#### 生产环境

确认 Cloudflare Workers 或 Serverless Function 正确返回 CORS 头：

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
})
```

---

## 网络超时

### 问题描述

登录过程中提示网络超时或连接失败。

### 解决方案

1. **检查网络连接**：确保可以访问 GitHub

2. **使用代理**：如果 GitHub 访问受限，配置网络代理

3. **稍后重试**：GitHub API 可能暂时不可用

4. **检查防火墙**：确保没有阻止相关请求

---

## 多账户切换

### 问题描述

想要切换到另一个 GitHub 账户。

### 解决方案

1. 点击头像 → 退出登录
2. 刷新页面
3. 点击登录，在 GitHub 页面切换账户
4. 授权新账户

如果 GitHub 自动使用旧账户：
1. 先在 GitHub 网站退出登录
2. 或在授权页面点击「Use another account」

---

## 权限不足

### 问题描述

登录后无法获取仓库数据，提示权限不足。

### 解决方案

1. **重新授权**：
   - 访问 https://github.com/settings/applications
   - 找到 StarHub → Revoke access
   - 回到 StarHub 重新登录授权

2. **检查 OAuth Scope**：确保请求了正确的权限范围

StarHub 需要的权限：
- `read:user` - 读取用户信息
- `public_repo` - 访问公开仓库

---

## 调试技巧

### 查看请求详情

1. 打开开发者工具 (F12)
2. 切换到 Network 标签
3. 筛选 `getToken` 请求
4. 查看请求和响应内容

### 查看存储的 Token

```javascript
console.log('Token:', localStorage.getItem('access_token'));
console.log('GitHub Token:', localStorage.getItem('github_token'));
```

### 测试 API 连通性

```javascript
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

