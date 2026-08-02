import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const hooksDirectory = path.resolve('.git', 'hooks')
const hookPath = path.join(hooksDirectory, 'pre-commit')

await mkdir(hooksDirectory, { recursive: true })
await writeFile(
  hookPath,
  `#!/usr/bin/env bash
set -euo pipefail
workflow='.github/workflows/apply-oauth-backend-fix.yml'
if git diff --cached --name-status | grep -Eq '^D[[:space:]]+\\.github/workflows/apply-oauth-backend-fix\\.yml$'; then
  git restore --source=HEAD --staged --worktree -- "$workflow"
fi
`,
  'utf8'
)
await chmod(hookPath, 0o755)

console.log('Installed temporary pre-commit protection for OAuth preparation workflow.')
