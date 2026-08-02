import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('global stylesheet does not use Vue SFC :deep selectors', async () => {
  const styles = await readFile(
    new URL('../src/styles/main.scss', import.meta.url),
    'utf8'
  )

  assert.equal(styles.includes(':deep('), false)
})
