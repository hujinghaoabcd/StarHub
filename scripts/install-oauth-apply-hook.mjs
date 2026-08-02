import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const hooksDirectory = path.resolve('.git', 'hooks')
const hookPath = path.join(hooksDirectory, 'pre-commit')

await mkdir(hooksDirectory, { recursive: true })
await writeFile(
  hookPath,
  `#!/usr/bin/env bash
set -euo pipefail
if ! git diff --cached --quiet -- .github/workflows; then
  git restore --source=HEAD --staged --worktree -- .github/workflows
fi
`,
  'utf8'
)
await chmod(hookPath, 0o755)

console.log('Installed temporary pre-commit protection for workflow files.')
