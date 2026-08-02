import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const assetsDirectory = path.join(root, 'dist', 'assets')
const viteConfig = await readFile(path.join(root, 'vite.config.ts'), 'utf8')

for (const requiredFlag of [
  '__INTLIFY_JIT_COMPILATION__: true',
  '__INTLIFY_DROP_MESSAGE_COMPILER__: false',
  '__VUE_I18N_LEGACY_API__: false'
]) {
  if (!viteConfig.includes(requiredFlag)) {
    throw new Error(`Missing CSP-safe vue-i18n build flag: ${requiredFlag}`)
  }
}

const JavaScriptFiles = (await readdir(assetsDirectory))
  .filter((file) => file.endsWith('.js'))
  .sort()

if (JavaScriptFiles.length === 0) {
  throw new Error('No JavaScript assets found. Run the production build first.')
}

const forbiddenPatterns = [
  {
    label: 'eval()',
    pattern: /(^|[^\w$.])eval\s*\(/g
  },
  {
    label: 'new Function()',
    pattern: /\bnew\s+Function\s*\(/g
  },
  {
    label: 'Function constructor with source text',
    pattern: /(^|[^\w$.])Function\s*\(\s*["'`]/g
  }
]

const violations = []

for (const file of JavaScriptFiles) {
  const source = await readFile(path.join(assetsDirectory, file), 'utf8')

  for (const { label, pattern } of forbiddenPatterns) {
    pattern.lastIndex = 0
    const match = pattern.exec(source)
    if (!match) {
      continue
    }

    const start = Math.max(0, match.index - 80)
    const end = Math.min(source.length, match.index + match[0].length + 120)
    violations.push({
      file,
      label,
      snippet: source.slice(start, end).replace(/\s+/g, ' ')
    })
  }
}

if (violations.length > 0) {
  const details = violations
    .map(({ file, label, snippet }) => `- ${file}: ${label}\n  ${snippet}`)
    .join('\n')

  throw new Error(
    `Production bundle contains dynamic JavaScript evaluation that violates the strict CSP:\n${details}`
  )
}

console.log(
  `Verified ${JavaScriptFiles.length} production JavaScript assets: no eval or Function constructor.`
)
