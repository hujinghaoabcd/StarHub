import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/utils/oauthCallback.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const oauthCallback = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

test('parseOAuthCallback accepts a complete GitHub callback', () => {
  assert.deepEqual(
    oauthCallback.parseOAuthCallback('?code=abc123&state=state456'),
    {
      type: 'starhub:oauth-callback',
      code: 'abc123',
      state: 'state456'
    }
  )
})

test('parseOAuthCallback rejects incomplete callback queries', () => {
  assert.equal(oauthCallback.parseOAuthCallback('?code=abc123'), null)
  assert.equal(oauthCallback.parseOAuthCallback('?state=state456'), null)
  assert.equal(oauthCallback.parseOAuthCallback(''), null)
})

test('OAuth callback channel names are isolated by state', () => {
  assert.equal(
    oauthCallback.getOAuthCallbackChannelName('state456'),
    'starhub:oauth-callback:state456'
  )
})

test('main relays popup callbacks before bootstrapping the Vue application', async () => {
  const mainSource = await readFile(
    new URL('../src/main.ts', import.meta.url),
    'utf8'
  )

  const relayCall = mainSource.lastIndexOf('relayOAuthPopupCallback()')
  const bootstrapCall = mainSource.lastIndexOf('bootstrapApplication()')

  assert.notEqual(relayCall, -1)
  assert.notEqual(bootstrapCall, -1)
  assert.ok(relayCall < bootstrapCall)
})
