import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule

async function importTypescriptSource(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText

  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
  )
}

function repository(id) {
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`
  }
}

test('pilot sampling is bounded, unique, and reproducible', async () => {
  const sampling = await importTypescriptSource(
    'src/services/classificationSampling.ts'
  )
  const repositories = Array.from({ length: 1_000 }, (_, index) =>
    repository(index + 1)
  )

  const first = sampling.selectClassificationSample(repositories, {
    size: 200,
    random: true,
    seed: 42
  })
  const repeated = sampling.selectClassificationSample(repositories, {
    size: 200,
    random: true,
    seed: 42
  })
  const different = sampling.selectClassificationSample(repositories, {
    size: 200,
    random: true,
    seed: 43
  })

  assert.equal(first.selectionMode, 'random')
  assert.equal(first.sampleSeed, 42)
  assert.equal(first.repositories.length, 200)
  assert.equal(new Set(first.repositories.map(item => item.id)).size, 200)
  assert.deepEqual(first.repositories, repeated.repositories)
  assert.notDeepEqual(first.repositories, different.repositories)

  const ordered = sampling.selectClassificationSample(repositories, {
    size: 100,
    random: false,
    seed: 42
  })
  assert.equal(ordered.selectionMode, 'ordered')
  assert.deepEqual(
    ordered.repositories.map(item => item.id),
    repositories.slice(0, 100).map(item => item.id)
  )

  const all = sampling.selectClassificationSample(repositories, {
    size: 'all',
    random: true,
    seed: 42
  })
  assert.equal(all.selectionMode, 'all')
  assert.equal(all.repositories.length, repositories.length)
  assert.notEqual(all.repositories, repositories)
})

test('human evaluation reports reviewed accuracy and correction patterns', async () => {
  const evaluation = await importTypescriptSource(
    'src/services/classificationEvaluation.ts'
  )
  const items = [
    {
      status: 'success',
      confidence: 0.9,
      modelCategoryId: 'web',
      categoryId: 'web',
      evaluation: 'correct'
    },
    {
      status: 'success',
      confidence: 0.8,
      modelCategoryId: 'web',
      categoryId: 'backend',
      evaluation: 'incorrect'
    },
    {
      status: 'success',
      confidence: 0.6,
      modelCategoryId: 'web',
      categoryId: 'backend',
      evaluation: 'incorrect'
    },
    {
      status: 'success',
      confidence: 0.5,
      modelCategoryId: 'data',
      categoryId: 'data'
    },
    {
      status: 'failed',
      confidence: 0,
      modelCategoryId: 'data',
      categoryId: 'data'
    }
  ]

  const summary = evaluation.buildClassificationEvaluationSummary(items)

  assert.equal(summary.evaluatedCount, 3)
  assert.equal(summary.correctCount, 1)
  assert.equal(summary.incorrectCount, 2)
  assert.equal(summary.unreviewedCount, 1)
  assert.equal(summary.lowConfidenceCount, 2)
  assert.equal(summary.accuracy, 1 / 3)
  assert.deepEqual(summary.corrections, [{
    modelCategoryId: 'web',
    reviewedCategoryId: 'backend',
    count: 2
  }])
})
