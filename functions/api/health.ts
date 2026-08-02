
interface Env {
  CLIENT_ID?: string
  CLIENT_SECRET?: string
  ALLOWED_ORIGINS?: string
  GITHUB_REDIRECT_URI?: string
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json(
    {
      status: 'ok',
      service: 'starhub-oauth',
      configured: Boolean(
        env.CLIENT_ID &&
        env.CLIENT_SECRET &&
        env.ALLOWED_ORIGINS &&
        env.GITHUB_REDIRECT_URI
      )
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  )
}
