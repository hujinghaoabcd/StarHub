import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function normalizeBase(base) {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function runNpmScript(script, extraEnv) {
  const result = spawnSync(npmCommand, ['run', script], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: 'inherit'
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`npm run ${script} failed with exit code ${result.status}`)
  }
}

const repository = process.env.GITHUB_REPOSITORY || 'hujinghaoabcd/StarHub'
const repositoryName = repository.split('/').filter(Boolean).at(-1) || 'StarHub'
const appBase = normalizeBase(process.env.PAGES_BASE_PATH || `/${repositoryName}/`)
const docsBase = `${appBase}docs/`

console.log(`Building StarHub application for ${appBase}`)
runNpmScript('build', {
  VITE_BASE_PATH: appBase
})

console.log(`Building StarHub documentation for ${docsBase}`)
runNpmScript('docs:build', {
  VITEPRESS_BASE_PATH: docsBase
})

const appOutput = path.join(projectRoot, 'dist')
const docsOutput = path.join(projectRoot, 'docs', '.vitepress', 'dist')
const combinedDocsOutput = path.join(appOutput, 'docs')

await rm(combinedDocsOutput, { recursive: true, force: true })
await mkdir(combinedDocsOutput, { recursive: true })
await cp(docsOutput, combinedDocsOutput, { recursive: true })
await writeFile(path.join(appOutput, '.nojekyll'), '', 'utf8')
await writeFile(
  path.join(appOutput, 'deployment-info.json'),
  `${JSON.stringify({ appBase, docsBase }, null, 2)}\n`,
  'utf8'
)

console.log('GitHub Pages bundle created successfully:')
console.log(`- Application: dist/ -> ${appBase}`)
console.log(`- Documentation: dist/docs/ -> ${docsBase}`)
