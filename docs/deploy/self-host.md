# 自托管部署

如果你有自己的服务器，可以选择自托管部署。

## 准备工作

### 服务器要求

- Linux / Windows Server
- Node.js 18+
- Nginx（推荐）或其他 Web 服务器

### 构建项目

```bash
# 克隆项目
git clone https://github.com/mengjian-github/starhub.git
cd starhub

# 安装依赖
npm install

# 构建
npm run build
```

---

## 方式 1：Nginx + Node.js

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS
sudo yum install nginx
```

### 配置 Nginx

编辑 `/etc/nginx/sites-available/starhub`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

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

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/starhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置后端服务

创建 `.env` 文件：

```env
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
```

启动后端：

```bash
cd server
node dev-server.js
```

---

## 方式 2：使用 PM2

PM2 可以管理 Node.js 进程，支持开机自启。

### 安装 PM2

```bash
npm i -g pm2
```

### 创建配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'starhub-backend',
      script: 'server/dev-server.js',
      cwd: '/var/www/starhub',
      env: {
        CLIENT_ID: 'your_client_id',
        CLIENT_SECRET: 'your_client_secret'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
}
```

### 启动服务

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### PM2 常用命令

```bash
pm2 list          # 查看进程
pm2 logs          # 查看日志
pm2 restart all   # 重启所有
pm2 stop all      # 停止所有
```

---

## 方式 3：使用 Systemd

### 创建服务文件

创建 `/etc/systemd/system/starhub.service`：

```ini
[Unit]
Description=StarHub Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/starhub/server
ExecStart=/usr/bin/node dev-server.js
Restart=on-failure
Environment=CLIENT_ID=your_client_id
Environment=CLIENT_SECRET=your_client_secret

[Install]
WantedBy=multi-user.target
```

### 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl start starhub
sudo systemctl enable starhub
```

---

## HTTPS 配置

### 使用 Let's Encrypt

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 防火墙配置

```bash
# 允许 HTTP 和 HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 如果需要外部访问后端
sudo ufw allow 7001
```

---

## 故障排除

### Nginx 502 错误？

1. 检查后端服务是否运行
2. 确认代理地址正确
3. 查看 Nginx 错误日志

### 权限问题？

```bash
# 设置正确的文件权限
sudo chown -R www-data:www-data /var/www/starhub
sudo chmod -R 755 /var/www/starhub
```

### 端口被占用？

```bash
# 查看端口占用
sudo lsof -i :7001
sudo netstat -tulpn | grep 7001
```

