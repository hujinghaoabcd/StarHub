import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  MAX_HIGHLIGHT_CODE_CHARS,
  MAX_README_SOURCE_CHARS,
  ReadmeRenderLimitError,
  renderReadmeMarkdown,
  rewriteReadmeUrls
} from '../src/services/readmeMarkdown.ts'

const context = {
  owner: 'example',
  repo: 'project',
  defaultBranch: 'main'
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('README relative links are rewritten before worker rendering', () => {
  const rewritten = rewriteReadmeUrls(
    '![logo](./docs/logo.png)\n[guide](docs/guide.md)',
    context
  )

  assert.match(
    rewritten,
    /https:\/\/raw\.githubusercontent\.com\/example\/project\/main\/docs\/logo\.png/
  )
  assert.match(
    rewritten,
    /https:\/\/github\.com\/example\/project\/blob\/main\/docs\/guide\.md/
  )
})

test('oversized README source is rejected before parsing', () => {
  assert.throws(
    () => renderReadmeMarkdown(
      'x'.repeat(MAX_README_SOURCE_CHARS + 1),
      context
    ),
    error => error instanceof ReadmeRenderLimitError &&
      error.code === 'source_too_large'
  )
})

test('very large code blocks bypass syntax highlighting', () => {
  const largeCode = 'const value = "<unsafe>";\n'.repeat(
    Math.ceil(MAX_HIGHLIGHT_CODE_CHARS / 26) + 1
  )
  const html = renderReadmeMarkdown(
    `\`\`\`javascript\n${largeCode}\`\`\``,
    context
  )

  assert.match(html, /&lt;unsafe&gt;/)
  assert.doesNotMatch(html, /hljs-keyword/)
})

test('repeated bounded README renders stay within the regression budget', () => {
  const markdown = [
    '# Stress fixture',
    ...Array.from({ length: 400 }, (_, index) =>
      `- [item ${index}](./docs/${index}.md)`
    )
  ].join('\n')
  const startedAt = performance.now()

  for (let index = 0; index < 25; index++) {
    const html = renderReadmeMarkdown(markdown, context)
    assert.match(html, /Stress fixture/)
  }

  assert.ok(
    performance.now() - startedAt < 2_000,
    'bounded README rendering exceeded the 2 second regression budget'
  )
})

test('repository switching debounces, cancels, and renders off the main thread', async () => {
  const detail = await source('src/pages/Home/components/DetailView.vue')
  const renderer = await source('src/services/readmeRenderer.ts')
  const detailWrapper = await source(
    'src/pages/Home/components/RepositoryDetailView.vue'
  )

  assert.match(detail, /README_SELECTION_DEBOUNCE_MS/)
  assert.match(detail, /readmeDebounceTimer/)
  assert.match(
    detail,
    /getReadme\([\s\S]*if \(!isCurrentReadmeRequest\(requestId, controller\)\) return[\s\S]*renderReadmeOffThread/
  )
  assert.match(detail, /loading', 'lazy'/)
  assert.match(detail, /content-visibility:\s*auto/)
  assert.doesNotMatch(detail, /hljs\.highlight/)
  assert.doesNotMatch(detail, /marked\(rawReadme/)

  assert.match(renderer, /new Worker\(/)
  assert.match(renderer, /signal\.addEventListener\('abort'/)
  assert.match(renderer, /sharedWorker\?\.terminate\(\)/)
  assert.match(renderer, /sharedWorker/)
  assert.match(renderer, /shutdownReadmeRenderer/)
  assert.match(renderer, /README_RENDER_TIMEOUT_MS/)
  assert.match(detailWrapper, /:readme-only="true"/)
  assert.match(detailWrapper, /PAGES_SELECTION_DEBOUNCE_MS/)
  assert.match(detailWrapper, /pagesDebounceTimer/)
  assert.doesNotMatch(detailWrapper, /display:\s*none;[\s\S]*repo-card/)
})
