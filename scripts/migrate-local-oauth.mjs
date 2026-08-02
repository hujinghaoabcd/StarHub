import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

async function write(relativePath, content) {
  const target = path.join(root, relativePath)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, content.endsWith('\n') ? content : `${content}\n`, 'utf8')
  console.log(`updated ${relativePath}`)
}

function replaceRequired(source, pattern, replacement, label) {
  const updated = source.replace(pattern, replacement)
  if (updated === source) {
    throw new Error(`Expected content was not found: ${label}`)
  }
  return updated
}

function replaceEverywhere(source) {
  return source
    .split('node server/dev-server.js').join('npm run cloudflare:dev')
    .split('npm run server:dev').join('npm run cloudflare:dev')
    .split('http://localhost:7001').join('http://localhost:8788')
    .split('localhost:7001').join('localhost:8788')
    .split('functions/api/getToken.ts').join('functions/api/oauth/token.ts')
    .split('/api/getToken').join('/api/oauth/token')
}

const localOAuthZh = `### GitHub OAuth 配置

StarHub 使用 GitHub OAuth Web Flow。浏览器生成并校验 \`state\` 与 PKCE，Cloudflare Pages Function 在服务端使用 Client Secret 兑换访问令牌。

#### 第一步：创建本地 GitHub OAuth App

在 GitHub Developer Settings 中创建一个仅用于本地开发的 OAuth App：

\`\`\`text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
\`\`\`

#### 第二步：配置本地变量

复制示例文件：

\`\`\`bash
cp .dev.vars.example .dev.vars
\`\`\`

确认 \`.dev.vars\` 至少包含：

\`\`\`env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
\`\`\`

Client Secret 只能放在未提交的 \`.dev.vars\` 或 Cloudflare 加密 Secret 中，不能写入 \`VITE_*\` 变量或前端代码。

#### 第三步：启动本地联调

\`\`\`bash
# 终端 1：Cloudflare Pages Functions，监听 8788
npm run cloudflare:dev

# 终端 2：Vite 前端，监听 5173，并将 /api 代理到 8788
npm run dev
\`\`\`

详细说明见 [本地 OAuth 开发](docs/development/local-oauth.md) 和 [Cloudflare Pages Functions OAuth 后端](docs/deploy/cloudflare.md)。`

const deploymentZh = `### 方式一：GitHub Pages + Cloudflare Pages Functions（推荐）

正式架构采用前后端分离：

- GitHub Pages 托管 StarHub 前端与文档；
- Cloudflare Pages 项目只承载 \`/api/health\` 与 \`/api/oauth/token\`；
- Client Secret 只保存在 Cloudflare 加密 Secret 中。

Cloudflare Pages 使用：

| 设置 | 值 |
|---|---|
| Build command | \`npm run cloudflare:build\` |
| Build output directory | \`cloudflare-dist\` |
| Node.js | \`22\` |

Production Variables and Secrets：

\`\`\`text
CLIENT_ID
CLIENT_SECRET
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/
\`\`\`

GitHub Actions Variables：

\`\`\`text
VITE_API_BASE_URL=https://你的项目.pages.dev/api
VITE_GITHUB_CLIENT_ID=你的 GitHub OAuth Client ID
\`\`\`

完整步骤见 [部署指南](docs/DEPLOYMENT.md)。

### 方式二：自托管前端

\`\`\`bash
VITE_API_BASE_URL=https://你的项目.pages.dev/api npm run build
\`\`\`

将 \`dist/\` 交给 Nginx、Apache 或其他静态服务器即可。推荐继续复用 Cloudflare OAuth API；若自行实现后端，必须保持 \`POST /api/oauth/token\`、PKCE、Origin 白名单、回调地址精确校验和服务端 Secret 存储等安全约束。详见 [自托管部署](docs/deploy/self-host.md)。`

const localOAuthEn = `### GitHub OAuth Configuration

StarHub uses the GitHub OAuth Web Flow. The browser creates and validates \`state\` and PKCE values, while a Cloudflare Pages Function exchanges the authorization code with the Client Secret on the server side.

#### Step 1: Create a local GitHub OAuth App

Create a separate OAuth App for local development:

\`\`\`text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
\`\`\`

#### Step 2: Configure local variables

\`\`\`bash
cp .dev.vars.example .dev.vars
\`\`\`

The local \`.dev.vars\` file must contain at least:

\`\`\`env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
\`\`\`

Never put the Client Secret in a \`VITE_*\` variable or browser code.

#### Step 3: Start local integration

\`\`\`bash
# Terminal 1: Cloudflare Pages Functions on port 8788
npm run cloudflare:dev

# Terminal 2: Vite on port 5173, proxying /api to port 8788
npm run dev
\`\`\`

See [Local OAuth Development](docs/development/local-oauth.md) and [Cloudflare Pages Functions OAuth Backend](docs/deploy/cloudflare.md).`

const deploymentEn = `### Method 1: GitHub Pages + Cloudflare Pages Functions (Recommended)

The production architecture is split by responsibility:

- GitHub Pages hosts the StarHub frontend and documentation;
- Cloudflare Pages serves only \`/api/health\` and \`/api/oauth/token\`;
- the Client Secret stays in an encrypted Cloudflare Secret.

Cloudflare Pages settings:

| Setting | Value |
|---|---|
| Build command | \`npm run cloudflare:build\` |
| Build output directory | \`cloudflare-dist\` |
| Node.js | \`22\` |

Production Variables and Secrets:

\`\`\`text
CLIENT_ID
CLIENT_SECRET
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/
\`\`\`

GitHub Actions Variables:

\`\`\`text
VITE_API_BASE_URL=https://your-project.pages.dev/api
VITE_GITHUB_CLIENT_ID=your GitHub OAuth Client ID
\`\`\`

See [Deployment Guide](docs/DEPLOYMENT.md) for the complete setup.

### Method 2: Self-Hosted Frontend

\`\`\`bash
VITE_API_BASE_URL=https://your-project.pages.dev/api npm run build
\`\`\`

Serve \`dist/\` with Nginx, Apache, or another static server. Reusing the Cloudflare OAuth API is recommended. A custom backend must preserve the \`POST /api/oauth/token\` contract, PKCE, strict Origin checks, exact redirect URI validation, and server-side secret storage. See [Self-Hosting](docs/deploy/self-host.md).`

let readmeZh = await read('README.md')
readmeZh = replaceRequired(
  readmeZh,
  /### GitHub OAuth 配置[\s\S]*?\n---\n\n<a id="部署指南"><\/a>/,
  `${localOAuthZh}\n\n---\n\n<a id="部署指南"></a>`,
  'README.md OAuth section'
)
readmeZh = replaceRequired(
  readmeZh,
  /### 方式一：Cloudflare Pages（推荐）[\s\S]*?\n---\n\n<a id="使用说明"><\/a>/,
  `${deploymentZh}\n\n---\n\n<a id="使用说明"></a>`,
  'README.md deployment section'
)
readmeZh = replaceEverywhere(readmeZh)
  .split('node-%3E%3D18.0.0').join('node-%3E%3D22.12.0')
  .split('typescript-5.4').join('typescript-5.9')
  .split('vite-5.1').join('vite-8.2')
  .split('- **Node.js** >= 18.0.0').join('- **Node.js** >= 22.12.0')
  .replace(/├── server\/[^\n]*\n│   ├── dev-server\.js[^\n]*\n│   └── package\.json[^\n]*\n/, '')
  .split('│   │   └── getToken.ts      # OAuth Token 交换').join('│   │   └── oauth/\n│   │       └── token.ts      # OAuth Token 交换')
  .split('4. 检查 `.env` 文件中的 `CLIENT_SECRET` 是否正确').join('4. 检查 `.dev.vars` 中的 OAuth 变量是否完整')
await write('README.md', readmeZh)

let readmeEn = await read('README.en.md')
readmeEn = replaceRequired(
  readmeEn,
  /### GitHub OAuth Configuration[\s\S]*?\n---\n\n<a id="deployment"><\/a>/,
  `${localOAuthEn}\n\n---\n\n<a id="deployment"></a>`,
  'README.en.md OAuth section'
)
readmeEn = replaceRequired(
  readmeEn,
  /### Method 1: Cloudflare Pages \(Recommended\)[\s\S]*?\n---\n\n<a id="usage"><\/a>/,
  `${deploymentEn}\n\n---\n\n<a id="usage"></a>`,
  'README.en.md deployment section'
)
readmeEn = replaceEverywhere(readmeEn)
  .split('node-%3E%3D18.0.0').join('node-%3E%3D22.12.0')
  .split('typescript-5.4').join('typescript-5.9')
  .split('vite-5.1').join('vite-8.2')
  .split('- **Node.js** >= 18.0.0').join('- **Node.js** >= 22.12.0')
  .replace(/├── server\/[^\n]*\n│   ├── dev-server\.js[^\n]*\n│   └── package\.json[^\n]*\n/, '')
  .split('│   │   └── getToken.ts      # OAuth Token exchange').join('│   │   └── oauth/\n│   │       └── token.ts      # OAuth Token exchange')
  .split('4. Check if `CLIENT_SECRET` in `.env` file is correct').join('4. Check that all OAuth values in `.dev.vars` are present')
await write('README.en.md', readmeEn)

const simpleDocs = [
  'CONTRIBUTING.md',
  'docs/CONTRIBUTING.md',
  'docs/TROUBLESHOOTING.md',
  'docs/guide/installation.md',
  'docs/reference/structure.md',
  'docs/troubleshooting/faq.md',
  'docs/troubleshooting/login.md'
]

for (const relativePath of simpleDocs) {
  let source = replaceEverywhere(await read(relativePath))
  source = source
    .split('Node.js >= 18.0.0').join('Node.js >= 22.12.0')
    .split('Node.js | 18.0.0 | 20.x LTS').join('Node.js | 22.12.0 | 22.x LTS')
    .split('Node.js | 18.0.0 | 20.x LTS').join('Node.js | 22.12.0 | 22.x LTS')
    .split('├── server/          # 开发服务器\n').join('')
    .split('├── server/          # Dev server\n').join('')
    .split('├── server/           # 本地开发服务器\n').join('')
    .split('│   └── getToken.ts  # OAuth Token 交换').join('│   └── oauth/\n│       └── token.ts  # OAuth Token 交换')
    .split('检查 .env 配置').join('检查 .dev.vars 配置')
    .split('`.env`').join('`.dev.vars`')
  await write(relativePath, source)
}

let installation = await read('docs/guide/installation.md')
installation = installation
  .split('| `npm run dev` | 启动开发服务器 |').join('| `npm run cloudflare:dev` | 启动本地 OAuth Functions（8788） |\n| `npm run dev` | 启动 Vite 前端（5173） |')
  .split('| `npm run dev` | Start dev server |').join('| `npm run cloudflare:dev` | Start local OAuth Functions (8788) |\n| `npm run dev` | Start the Vite frontend (5173) |')
await write('docs/guide/installation.md', installation)

let oauthGuide = await read('docs/guide/oauth.md')
if (!oauthGuide.includes('npm run cloudflare:dev')) {
  oauthGuide = oauthGuide.replace(
    '本地 Function 变量放在未提交的 `.dev.vars` 中，可从 `.dev.vars.example` 复制。',
    `本地 Function 变量放在未提交的 \`.dev.vars\` 中，可从 \`.dev.vars.example\` 复制。\n\n\`\`\`bash\n# 终端 1：OAuth Functions，端口 8788\nnpm run cloudflare:dev\n\n# 终端 2：Vite 前端，端口 5173\nnpm run dev\n\`\`\`\n\nVite 会把 \`/api\` 请求代理到 \`http://localhost:8788\`。`
  )
}
await write('docs/guide/oauth.md', oauthGuide)

let cloudflareGuide = await read('docs/deploy/cloudflare.md')
cloudflareGuide = cloudflareGuide.replace(
  'Cloudflare Pages Functions 默认在 `http://localhost:8788` 启动。前端仍可通过现有本地代理或设置 `VITE_API_BASE_URL` 指向该地址进行联调。',
  'Cloudflare Pages Functions 默认在 `http://localhost:8788` 启动。另一个终端运行 `npm run dev` 后，Vite 会将 `/api` 请求代理到该地址。'
)
await write('docs/deploy/cloudflare.md', cloudflareGuide)

const deploymentDoc = `# 部署指南

StarHub 的推荐生产架构是：**GitHub Pages 承载前端，Cloudflare Pages Functions 承载 OAuth API**。两者职责分离，避免在浏览器或静态托管平台暴露 GitHub Client Secret。

## 环境要求

- Node.js >= 22.12.0
- npm >= 10

## 1. 部署 OAuth API 到 Cloudflare Pages

连接本仓库并使用以下设置：

| 设置 | 值 |
|---|---|
| Production branch | \`main\` |
| Build command | \`npm run cloudflare:build\` |
| Build output directory | \`cloudflare-dist\` |
| Root directory | \`/\` |
| Node.js | \`22\` |

Cloudflare 会从仓库根目录的 \`functions/\` 自动生成：

- \`GET /api/health\`
- \`POST /api/oauth/token\`

### Production Variables and Secrets

| 名称 | 类型 | 示例或说明 |
|---|---|---|
| \`CLIENT_ID\` | Text | GitHub OAuth Client ID |
| \`CLIENT_SECRET\` | Encrypt | GitHub OAuth Client Secret |
| \`ALLOWED_ORIGINS\` | Text | \`https://hujinghaoabcd.github.io\` |
| \`GITHUB_REDIRECT_URI\` | Text | \`https://hujinghaoabcd.github.io/StarHub/\` |

保存后重新部署，并先访问 \`https://你的项目.pages.dev/api/health\` 验证配置。

## 2. 配置 GitHub OAuth App

生产 OAuth App：

\`\`\`text
Homepage URL: https://hujinghaoabcd.github.io/StarHub/
Authorization callback URL: https://hujinghaoabcd.github.io/StarHub/
\`\`\`

回调地址必须包含 \`/StarHub/\`，不要使用 \`#/login\`。

## 3. 将 API 地址注入 GitHub Pages 构建

在仓库的 Actions Variables 中添加：

\`\`\`text
VITE_API_BASE_URL=https://你的项目.pages.dev/api
VITE_GITHUB_CLIENT_ID=你的 GitHub OAuth Client ID
\`\`\`

重新运行 \`Deploy GitHub Pages\`。正式前端仍位于：

- 应用：\`https://hujinghaoabcd.github.io/StarHub/\`
- 文档：\`https://hujinghaoabcd.github.io/StarHub/docs/\`

## 4. 本地开发

详见 [本地 OAuth 开发](development/local-oauth.md)。核心命令为：

\`\`\`bash
# 终端 1
npm run cloudflare:dev

# 终端 2
npm run dev
\`\`\`

## 5. 自托管前端

StarHub 前端是静态应用，可构建后交给任意静态服务器：

\`\`\`bash
VITE_API_BASE_URL=https://你的项目.pages.dev/api npm run build
\`\`\`

部署 \`dist/\` 即可。推荐继续复用 Cloudflare OAuth API，不要将 Client Secret 放入前端或 Nginx 静态配置。完整说明见 [自托管部署](deploy/self-host.md)。

## 6. 验证清单

1. \`/api/health\` 返回 \`configured: true\`；
2. GitHub OAuth 回调精确匹配前端根地址；
3. 浏览器请求 \`POST /api/oauth/token\`，而不是旧的 GET 接口；
4. 生产环境只允许配置的 Origin；
5. 登录完成后 URL 中不残留 \`code\` 与 \`state\`；
6. Client Secret 不出现在仓库、构建产物、浏览器存储或日志中。
`
await write('docs/DEPLOYMENT.md', deploymentDoc)

const selfHostDoc = `# 自托管部署

StarHub 前端可以部署在任意静态服务器，但 GitHub OAuth code 交换必须由可信服务端完成。推荐的最小维护方案是：**自托管前端 + 复用 Cloudflare Pages Functions OAuth API**。

## 环境要求

- Node.js >= 22.12.0
- npm >= 10
- Nginx、Apache、Caddy 或其他静态服务器

## 1. 构建前端

将 OAuth API 地址注入构建：

\`\`\`bash
npm ci
VITE_API_BASE_URL=https://你的项目.pages.dev/api npm run build
\`\`\`

构建结果位于 \`dist/\`。

## 2. Nginx 示例

\`\`\`nginx
server {
    listen 443 ssl http2;
    server_name starhub.example.com;

    ssl_certificate /etc/letsencrypt/live/starhub.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/starhub.example.com/privkey.pem;

    root /var/www/starhub/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

不需要在 Nginx 中代理本仓库已删除的旧 \`server/dev-server.js\`。浏览器会直接访问构建时配置的 Cloudflare API 地址。

## 3. OAuth 配置

GitHub OAuth App 的 Homepage URL 与 Authorization callback URL 都应指向自托管前端根地址，例如：

\`\`\`text
https://starhub.example.com/
\`\`\`

Cloudflare Production Variables and Secrets 同步改为：

\`\`\`text
ALLOWED_ORIGINS=https://starhub.example.com
GITHUB_REDIRECT_URI=https://starhub.example.com/
\`\`\`

修改后重新部署 Cloudflare Pages，并重新构建前端。

## 4. 完全自建 OAuth 后端

本仓库不再维护第二套 Node OAuth 服务。自行实现时必须兼容以下契约：

- \`POST /api/oauth/token\`；
- JSON 请求体包含 \`code\`、\`codeVerifier\`、\`redirectUri\`；
- 服务端执行 PKCE token 交换；
- 严格校验 Origin 与 redirect URI；
- Client Secret 只保存在服务端 Secret；
- 响应使用 \`Cache-Control: no-store\`；
- 错误响应不得泄露 Client Secret、authorization code 或 access token。

可参考 \`functions/api/oauth/token.ts\` 的实现，但不要把该 TypeScript 文件直接当作普通 Node/PM2 脚本运行。

## 5. 验证

1. 前端静态资源正常加载；
2. OAuth 回调返回前端根路径；
3. token 请求发往正确的 API 域名；
4. Cloudflare 的 \`ALLOWED_ORIGINS\` 与自托管域名一致；
5. 浏览器开发者工具中看不到 Client Secret。
`
await write('docs/deploy/self-host.md', selfHostDoc)

const localDevDoc = `# 本地 OAuth 开发

StarHub 本地开发使用两项服务：

- Vite 前端：\`http://localhost:5173\`；
- Cloudflare Pages Functions：\`http://localhost:8788\`。

Vite 将 \`/api\` 请求代理到 8788，因此浏览器始终以 5173 为 Origin。

## 1. 创建本地 OAuth App

建议为本地开发单独创建 GitHub OAuth App：

\`\`\`text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
\`\`\`

## 2. 配置变量

\`\`\`bash
cp .dev.vars.example .dev.vars
\`\`\`

\`.dev.vars\`：

\`\`\`env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
\`\`\`

\`.dev.vars\` 已被 Git 忽略。不要把 Client Secret 放入 \`VITE_*\` 变量、源码、Issue、日志或聊天记录。

## 3. 启动

\`\`\`bash
# 终端 1：构建并启动本地 Functions
npm run cloudflare:dev

# 终端 2：启动 Vite
npm run dev
\`\`\`

## 4. 验证

\`\`\`text
http://localhost:8788/api/health
\`\`\`

健康检查应返回 \`configured: true\`。随后访问 \`http://localhost:5173\` 完成 GitHub 登录。

## 5. 请求契约

前端通过 Vite 代理调用：

\`\`\`http
POST /api/oauth/token
Content-Type: application/json
\`\`\`

请求体：

\`\`\`json
{
  "code": "...",
  "codeVerifier": "...",
  "redirectUri": "http://localhost:5173/"
}
\`\`\`

旧的 \`GET /api/getToken\` 与 \`server/dev-server.js\` 已移除。
`
await write('docs/development/local-oauth.md', localDevDoc)

const verifier = `import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const forbidden = [
  'server/dev-server.js',
  'node server/dev-server.js',
  'npm run server:dev',
  'functions/api/getToken.ts',
  '/api/getToken',
  'localhost:7001'
]

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

async function collectMarkdown(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      output.push(...await collectMarkdown(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      output.push(fullPath)
    }
  }
  return output
}

if (await exists('server')) {
  throw new Error('Legacy server/ directory must not be restored')
}

const markdownFiles = [
  path.join(root, 'README.md'),
  path.join(root, 'README.en.md'),
  path.join(root, 'CONTRIBUTING.md'),
  ...await collectMarkdown(path.join(root, 'docs'))
]

for (const file of markdownFiles) {
  const source = await readFile(file, 'utf8')
  for (const token of forbidden) {
    if (source.includes(token)) {
      throw new Error(\`Legacy OAuth reference "\${token}" found in \${path.relative(root, file)}\`)
    }
  }
}

const viteConfig = await readFile(path.join(root, 'vite.config.ts'), 'utf8')
if (!viteConfig.includes("target: 'http://localhost:8788'")) {
  throw new Error('Vite /api proxy must target the local Wrangler port 8788')
}

const localGuide = await readFile(path.join(root, 'docs/development/local-oauth.md'), 'utf8')
for (const required of [
  'CLIENT_ID',
  'CLIENT_SECRET',
  'ALLOWED_ORIGINS',
  'GITHUB_REDIRECT_URI',
  'POST /api/oauth/token',
  'npm run cloudflare:dev'
]) {
  if (!localGuide.includes(required)) {
    throw new Error(\`Local OAuth guide is missing: \${required}\`)
  }
}

console.log(\`OAuth documentation verified across \${markdownFiles.length} Markdown files.\`)
`
await write('scripts/verify-oauth-docs.mjs', verifier)

const packageJson = JSON.parse(await read('package.json'))
packageJson.scripts['oauth:verify'] = 'node scripts/verify-oauth-docs.mjs'
if (!packageJson.scripts.check.includes('npm run oauth:verify')) {
  packageJson.scripts.check = packageJson.scripts.check.replace(
    'npm run cloudflare:type-check &&',
    'npm run cloudflare:type-check && npm run oauth:verify &&'
  )
}
await write('package.json', JSON.stringify(packageJson, null, 2))

let viteConfig = await read('vite.config.ts')
viteConfig = replaceRequired(
  viteConfig,
  "target: 'http://localhost:7001'",
  "target: 'http://localhost:8788'",
  'Vite OAuth proxy target'
)
viteConfig = viteConfig
  .split('// 本地开发时，/api 请求转发到本地 OAuth 服务').join('// 本地开发时，/api 请求转发到 Wrangler Pages Functions')
  .split('代理请求').join('API 代理请求')
  .split('代理响应').join('API 代理响应')
  .split('代理错误').join('API 代理错误')
await write('vite.config.ts', viteConfig)

await rm(path.join(root, 'server'), { recursive: true, force: true })
console.log('removed legacy server/ directory')
