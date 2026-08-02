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

const javaScriptFiles = (await readdir(assetsDirectory))
  .filter((file) => file.endsWith('.js'))
  .sort()

if (javaScriptFiles.length === 0) {
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

// Element Plus currently bundles a utility with the conventional
// `self || Function('return this')()` global-object fallback. Browsers that
// can run StarHub always expose `self`, so the constructor branch is inert.
// Only this exact expression is ignored; all other source-text evaluation
// remains a build failure.
const inertGlobalFallback = /Function\(\s*(["'`])return this\1\s*\)\s*\(\s*\)/g
const violations = []

for (const file of javaScriptFiles) {
  const source = await readFile(path.join(assetsDirectory, file), 'utf8')
  const sourceForScan = source.replace(
    inertGlobalFallback,
    '/* inert browser global fallback */'
  )

  for (const { label, pattern } of forbiddenPatterns) {
    pattern.lastIndex = 0
    const match = pattern.exec(sourceForScan)
    if (!match) {
      continue
    }

    const start = Math.max(0, match.index - 80)
    const end = Math.min(
      sourceForScan.length,
      match.index + match[0].length + 120
    )
    violations.push({
      file,
      label,
      snippet: sourceForScan.slice(start, end).replace(/\s+/g, ' ')
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
  `Verified ${javaScriptFiles.length} production JavaScript assets: no executable eval or Function constructor.`
)
