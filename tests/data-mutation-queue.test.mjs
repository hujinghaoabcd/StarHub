import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/services/dataMutationQueue.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const queue = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

test('runDataMutation executes scheduled mutations in order', async () => {
  const events = []

  const first = queue.runDataMutation(async () => {
    events.push('first:start')
    await new Promise(resolve => setTimeout(resolve, 20))
    events.push('first:end')
  })
  const second = queue.runDataMutation(async () => {
    events.push('second:start')
    events.push('second:end')
  })

  await Promise.all([first, second])
  assert.deepEqual(events, [
    'first:start',
    'first:end',
    'second:start',
    'second:end'
  ])
})

test('a rejected mutation does not poison later mutations', async () => {
  await assert.rejects(
    queue.runDataMutation(async () => {
      throw new Error('expected failure')
    }),
    /expected failure/
  )

  const value = await queue.runDataMutation(async () => 42)
  assert.equal(value, 42)
  await queue.waitForDataMutations()
})
