import {
  ReadmeRenderLimitError,
  renderReadmeMarkdown,
  type ReadmeRenderContext,
  type ReadmeRenderLimitCode
} from '@/services/readmeMarkdown'

export interface ReadmeWorkerRequest {
  id: number
  rawReadme: string
  context: ReadmeRenderContext
}

export interface ReadmeWorkerResponse {
  id: number
  html?: string
  error?: {
    code: ReadmeRenderLimitCode | 'render_failed'
    message: string
  }
}

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<ReadmeWorkerRequest>) => void) | null
  postMessage(message: ReadmeWorkerResponse): void
}

workerScope.onmessage = (event) => {
  const { id, rawReadme, context } = event.data

  try {
    workerScope.postMessage({
      id,
      html: renderReadmeMarkdown(rawReadme, context)
    })
  } catch (error) {
    workerScope.postMessage({
      id,
      error: {
        code: error instanceof ReadmeRenderLimitError
          ? error.code
          : 'render_failed',
        message: error instanceof Error ? error.message : String(error)
      }
    })
  }
}
