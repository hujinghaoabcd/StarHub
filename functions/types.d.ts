
type PagesFunction<Env = unknown> = (context: {
  request: Request
  env: Env
  params: Record<string, string | string[]>
  data: unknown
  functionPath: string
  waitUntil(promise: Promise<unknown>): void
  next(input?: Request | string, init?: RequestInit): Promise<Response>
}) => Response | Promise<Response>
