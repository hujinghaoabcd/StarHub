# 部署指南

本文档详细说明 StarHub 的各种部署方式。

## 目录

- [环境要求](#环境要求)
- [Cloudflare Pages 部署（推荐）](#cloudflare-pages-部署推荐)
- [自托管部署](#自托管部署)
- [GitHub OAuth 配置](#github-oauth-配置)

---

## 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

---

## Cloudflare Pages 部署（推荐）

Cloudflare Pages 提供免费托管，并且可以使用 Cloudflare Workers 处理 OAuth token 交换，是最推荐的部署方式。

### 步骤 1：构建项目

```bash
npm install
npm run build
```

### 步骤 2：创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** > **Create a project**
3. 选择 **Connect to Git** 连接 GitHub 仓库

### 步骤 3：配置构建设置

| 设置项 | 值 |
|--------|-----|
| Framework preset | Vue |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js version | 18 |

### 步骤 4：配置环境变量

在 **Settings** > **Environment variables** 中添加：

| 变量名 | 说明 |
|--------|------|
| `CLIENT_ID` | GitHub OAuth App 的 Client ID |
| `CLIENT_SECRET` | GitHub OAuth App 的 Client Secret |

### 步骤 5：配置 Functions

项目中的 `functions/api/oauth/token.ts` 会自动被识别为 Cloudflare Workers 函数，处理 OAuth token 交换。

### 步骤 6：更新 GitHub OAuth 回调地址

在 GitHub OAuth App 设置中更新回调地址：

```
https://your-project.pages.dev/#/login
```

### 自定义域名

1. 在 **Custom domains** 中添加你的域名
2. 配置 DNS 记录（Cloudflare 会提供说明）
3. 更新 GitHub OAuth 回调地址



---

## 自托管部署

### 使用 Node.js 静态服务器

```bash
# 安装 serve
npm i -g serve

# 构建
npm run build

# 启动静态服务器
serve -s dist -l 3000
```

### 使用 PM2

```bash
# 安装 PM2
npm i -g pm2

# 创建 ecosystem.config.js
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'starhub-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      cwd: '/path/to/starhub'
    },
    {
      name: 'starhub-backend',
      script: 'functions/api/oauth/token.ts',
      cwd: '/path/to/starhub',
      env: {
        CLIENT_ID: 'your_client_id',
        CLIENT_SECRET: 'your_client_secret'
      }
    }
  ]
}
```

```bash
# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name starhub.yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name starhub.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/starhub.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/starhub.yourdomain.com/privkey.pem;

    root /var/www/starhub/dist;
    index index.html;

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:7001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## GitHub OAuth 配置

### 创建 OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写信息：

| 字段 | 本地开发 | 生产环境 |
|------|----------|----------|
| Application name | StarHub Dev | StarHub |
| Homepage URL | http://localhost:5173 | https://yourdomain.com |
| Authorization callback URL | http://localhost:5173/ | https://yourdomain.com/ |

### 获取凭证

1. 创建后记录 **Client ID**
2. 点击 **Generate a new client secret**
3. 记录 **Client Secret**（只显示一次）

### 权限说明

StarHub 仅需要以下权限：

- `read:user` - 读取用户基本信息
- `public_repo` - 访问公开仓库（获取 Star 列表）

### 安全注意事项

⚠️ **永远不要将 Client Secret 暴露在前端代码中！**

- Client Secret 必须存储在后端环境变量中
- 使用服务端函数（Cloudflare Workers）处理 token 交换
- 定期轮换 Client Secret

---

## 故障排除

### OAuth 登录失败

1. 检查回调地址是否完全匹配（包括协议、端口、路径）
2. 确认 Client ID 和 Client Secret 正确
3. 检查后端服务是否正常运行

### 页面白屏

1. 检查浏览器控制台错误
2. 确认构建产物完整
3. 检查 nginx/服务器配置

### API 404

1. 确认 API 代理配置正确
2. 检查后端服务端口
3. 查看后端日志

---

如有问题，请提交 [GitHub Issue](https://github.com/hujinghaoabcd/StarHub/issues)。

