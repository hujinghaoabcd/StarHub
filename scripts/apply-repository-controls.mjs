import { readFile, writeFile } from 'node:fs/promises'

const loginPath = 'src/pages/Login.vue'
const source = await readFile(loginPath, 'utf8')
const oldScope = "      scope: 'read:user'"
const newScope = "      scope: 'read:user public_repo'"

if (source.includes(newScope)) {
  console.log('OAuth scope already includes public_repo.')
} else if (source.includes(oldScope)) {
  await writeFile(loginPath, source.replace(oldScope, newScope))
  console.log('OAuth scope updated to read:user public_repo.')
} else {
  throw new Error('Could not locate the OAuth scope in src/pages/Login.vue')
}
