
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const outputDirectory = path.join(projectRoot, 'cloudflare-dist')

await rm(outputDirectory, { recursive: true, force: true })
await mkdir(outputDirectory, { recursive: true })

await writeFile(
  path.join(outputDirectory, 'index.html'),
  `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StarHub OAuth API</title>
  </head>
  <body>
    <main>
      <h1>StarHub OAuth API</h1>
      <p>该站点仅承载 StarHub 的 GitHub OAuth 服务端接口。</p>
      <p>健康检查：<a href="/api/health">/api/health</a></p>
    </main>
  </body>
</html>
`,
  'utf8'
)

await writeFile(
  path.join(outputDirectory, '_routes.json'),
  `${JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }, null, 2)}\n`,
  'utf8'
)

console.log('Cloudflare Pages output created in cloudflare-dist/')
