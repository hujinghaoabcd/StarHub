import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/services/oauthScopes.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const oauthScopes = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

test('parseOAuthScopes accepts comma and whitespace separated scopes', () => {
  assert.deepEqual(
    [...oauthScopes.parseOAuthScopes('read:user, public_repo gist')].sort(),
    ['gist', 'public_repo', 'read:user']
  )
})

test('parseOAuthScopes ignores empty and non-string values', () => {
  assert.deepEqual([...oauthScopes.parseOAuthScopes(' ,  ')], [])
  assert.deepEqual([...oauthScopes.parseOAuthScopes(undefined)], [])
})

test('hasOAuthScope checks exact normalized scope names', () => {
  assert.equal(
    oauthScopes.hasOAuthScope('read:user,public_repo', 'public_repo'),
    true
  )
  assert.equal(
    oauthScopes.hasOAuthScope('read:user,public_repo', 'repo'),
    false
  )
})
