import { access, readFile, readdir } from 'node:fs/promises'
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
      throw new Error(`Legacy OAuth reference "${token}" found in ${path.relative(root, file)}`)
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
    throw new Error(`Local OAuth guide is missing: ${required}`)
  }
}

console.log(`OAuth documentation verified across ${markdownFiles.length} Markdown files.`)
