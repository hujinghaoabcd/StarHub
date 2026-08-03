import { Marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import { mangle } from 'marked-mangle'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/common'

export const MAX_README_SOURCE_CHARS = 300_000
export const MAX_README_HTML_CHARS = 900_000
export const MAX_HIGHLIGHT_CODE_CHARS = 20_000

export type ReadmeRenderLimitCode = 'source_too_large' | 'html_too_large'

export class ReadmeRenderLimitError extends Error {
  readonly code: ReadmeRenderLimitCode

  constructor(
    code: ReadmeRenderLimitCode,
    message: string
  ) {
    super(message)
    this.name = 'ReadmeRenderLimitError'
    this.code = code
  }
}

export interface ReadmeRenderContext {
  owner: string
  repo: string
  defaultBranch: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const readmeMarked = new Marked(
  gfmHeadingId(),
  mangle(),
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (code.length > MAX_HIGHLIGHT_CODE_CHARS) {
        return escapeHtml(code)
      }

      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    }
  }),
  {
    gfm: true,
    breaks: true
  }
)

export function rewriteReadmeUrls(
  rawReadme: string,
  context: ReadmeRenderContext
): string {
  const { owner, repo, defaultBranch } = context
  const rawBaseUrl =
    `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/`
  const repoBaseUrl =
    `https://github.com/${owner}/${repo}/blob/${defaultBranch}/`

  return rawReadme
    .replace(
      /!\[([^\]]*)\]\((?!https?:\/\/|data:)\.?\/?([^)]+)\)/g,
      `![$1](${rawBaseUrl}$2)`
    )
    .replace(
      /<img([^>]*?)src=["'](?!https?:\/\/|data:)\.?\/?([^"']+)["']/gi,
      `<img$1src="${rawBaseUrl}$2"`
    )
    .replace(
      /\[([^\]]+)\]\((?!https?:\/\/|#|mailto:)\.?\/?([^)]+)\)/g,
      `[$1](${repoBaseUrl}$2)`
    )
}

export function renderReadmeMarkdown(
  rawReadme: string,
  context: ReadmeRenderContext
): string {
  if (rawReadme.length > MAX_README_SOURCE_CHARS) {
    throw new ReadmeRenderLimitError(
      'source_too_large',
      'README is too large to render safely in the browser'
    )
  }

  const rewritten = rewriteReadmeUrls(rawReadme, context)
  const html = readmeMarked.parse(rewritten)
  if (typeof html !== 'string') {
    throw new Error('README renderer returned an asynchronous result')
  }

  if (html.length > MAX_README_HTML_CHARS) {
    throw new ReadmeRenderLimitError(
      'html_too_large',
      'Rendered README is too large to display safely in the browser'
    )
  }

  return html
}
