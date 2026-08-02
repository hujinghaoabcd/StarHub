import { readFile, writeFile } from 'node:fs/promises'

const files = [
  'README.md',
  'README.en.md',
  'CONTRIBUTING.md',
  'docs/CONTRIBUTING.md',
  'docs/DEPLOYMENT.md',
  'docs/guide/installation.md',
  'docs/reference/structure.md',
  'docs/deploy/self-host.md',
  'docs/troubleshooting/faq.md',
  'docs/TROUBLESHOOTING.md',
  'docs/troubleshooting/login.md'
]

const replacements = [
  ['node server/dev-server.js', 'npm run cloudflare:dev'],
  ['npm run server:dev', 'npm run cloudflare:dev'],
  ['server/dev-server.js', 'functions/api/oauth/token.ts'],
  ['http://localhost:7001', 'http://localhost:8788'],
  ['/api/getToken', '/api/oauth/token'],
  ['functions/api/getToken.ts', 'functions/api/oauth/token.ts'],
  ['getToken.ts', 'oauth/token.ts'],
  ['server/.env', '.dev.vars'],
  ['本地开发服务器', 'Cloudflare Pages Functions 本地服务'],
  ['local development server', 'Cloudflare Pages Functions local server'],
  ['Local development server', 'Cloudflare Pages Functions local server']
]

for (const file of files) {
  let source = await readFile(file, 'utf8')
  const original = source

  for (const [before, after] of replacements) {
    source = source.split(before).join(after)
  }

  if (source !== original) {
    await writeFile(file, source)
    console.log(`Updated ${file}`)
  }
}
