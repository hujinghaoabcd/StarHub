import type { ReadmeRenderContext } from './readmeMarkdown'
import type {
  ReadmeWorkerRequest,
  ReadmeWorkerResponse
} from '@/workers/readmeRenderer.worker'

const README_RENDER_TIMEOUT_MS = 12_000
let nextWorkerRequestId = 0
let sharedWorker: Worker | null = null

interface ActiveReadmeTask {
  id: number
  signal: AbortSignal
  timeoutId: ReturnType<typeof globalThis.setTimeout>
  handleAbort: () => void
  resolve: (html: string) => void
  reject: (error: unknown) => void
}

let activeTask: ActiveReadmeTask | null = null

export class ReadmeWorkerError extends Error {
  readonly code: NonNullable<ReadmeWorkerResponse['error']>['code']

  constructor(
    code: NonNullable<ReadmeWorkerResponse['error']>['code'],
    message: string
  ) {
    super(message)
    this.name = 'ReadmeWorkerError'
    this.code = code
  }
}

function abortError(): DOMException {
  return new DOMException('README rendering was cancelled', 'AbortError')
}

function terminateSharedWorker() {
  sharedWorker?.terminate()
  sharedWorker = null
}

function settleActiveTask(
  task: ActiveReadmeTask,
  callback: () => void,
  terminateWorker = false
) {
  if (activeTask !== task) return

  activeTask = null
  globalThis.clearTimeout(task.timeoutId)
  task.signal.removeEventListener('abort', task.handleAbort)
  if (terminateWorker) {
    terminateSharedWorker()
  }
  callback()
}

function cancelActiveTask() {
  const task = activeTask
  if (!task) return

  settleActiveTask(task, () => task.reject(abortError()), true)
}

function getSharedWorker(): Worker {
  if (sharedWorker) return sharedWorker

  const worker = new Worker(
    new URL('../workers/readmeRenderer.worker.ts', import.meta.url),
    { type: 'module', name: 'starhub-readme-renderer' }
  )
  worker.onerror = (event) => {
    if (worker !== sharedWorker || !activeTask) return

    const task = activeTask
    settleActiveTask(task, () => task.reject(new ReadmeWorkerError(
      'render_failed',
      event.message || 'README worker failed'
    )), true)
  }
  worker.onmessage = (event: MessageEvent<ReadmeWorkerResponse>) => {
    const task = activeTask
    if (!task || event.data.id !== task.id) return

    if (event.data.error) {
      settleActiveTask(task, () => task.reject(new ReadmeWorkerError(
        event.data.error!.code,
        event.data.error!.message
      )))
      return
    }

    settleActiveTask(task, () => task.resolve(event.data.html || ''))
  }
  sharedWorker = worker
  return worker
}

export function renderReadmeOffThread(
  rawReadme: string,
  context: ReadmeRenderContext,
  signal: AbortSignal
): Promise<string> {
  if (signal.aborted) {
    return Promise.reject(abortError())
  }

  cancelActiveTask()

  return new Promise((resolve, reject) => {
    const worker = getSharedWorker()
    const requestId = ++nextWorkerRequestId
    const handleAbort = () => settleActiveTask(
      task,
      () => reject(abortError()),
      true
    )
    const timeoutId = globalThis.setTimeout(() => {
      settleActiveTask(task, () => reject(new ReadmeWorkerError(
        'render_failed',
        'README rendering timed out'
      )), true)
    }, README_RENDER_TIMEOUT_MS)

    const task: ActiveReadmeTask = {
      id: requestId,
      signal,
      timeoutId,
      handleAbort,
      resolve,
      reject
    }
    activeTask = task
    signal.addEventListener('abort', handleAbort, { once: true })

    const request: ReadmeWorkerRequest = {
      id: requestId,
      rawReadme,
      context
    }
    worker.postMessage(request)
  })
}

export function shutdownReadmeRenderer() {
  cancelActiveTask()
  terminateSharedWorker()
}
