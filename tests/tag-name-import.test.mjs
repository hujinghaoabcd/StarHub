import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/services/tagNameImport.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const tagNameImport = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

test('parses line and comma separated category names', () => {
  const result = tagNameImport.parseTagNameImport(
    'GIS\nGeoAI, 遥感；空间统计\nGIS'
  )

  assert.deepEqual(result.names, ['GIS', 'GeoAI', '遥感', '空间统计'])
  assert.equal(result.duplicates, 1)
  assert.equal(result.invalid, 0)
})

test('parses JSON arrays of strings and named objects', () => {
  const result = tagNameImport.parseTagNameImport(
    JSON.stringify(['交通预测', { name: '城市气候' }, { ignored: true }])
  )

  assert.deepEqual(result.names, ['交通预测', '城市气候'])
  assert.equal(result.invalid, 1)
})

test('extracts tag names from a StarHub backup without repository assignments', () => {
  const result = tagNameImport.parseTagNameImport(
    JSON.stringify({
      data: {
        tags: [
          { name: 'GWR', repos: [1, 2, 3] },
          { name: '时空图神经网络', repos: [4] }
        ]
      }
    })
  )

  assert.deepEqual(result.names, ['GWR', '时空图神经网络'])
})

test('rejects blank and overlong category names', () => {
  const result = tagNameImport.parseTagNameImport(
    JSON.stringify(['', ' '.repeat(4), 'x'.repeat(81), '有效分类'])
  )

  assert.deepEqual(result.names, ['有效分类'])
  assert.equal(result.invalid, 3)
})
