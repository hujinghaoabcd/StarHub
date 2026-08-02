
interface Env {
  CLIENT_ID: string
  CLIENT_SECRET: string
  ALLOWED_ORIGINS: string
  GITHUB_REDIRECT_URI: string
}

interface TokenRequestBody {
  code?: unknown
  codeVerifier?: unknown
  redirectUri?: unknown
}

interface GitHubTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
}

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
}

function getAllowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin')
  if (!origin || !allowedOrigins(env).has(origin)) {
    return null
  }
  return origin
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  }
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(origin)
  })
}

function isValidCode(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && value.length <= 512
}

function isValidCodeVerifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 43 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._~-]+$/.test(value)
  )
}

export const onRequestOptions: PagesFunction<Env> = async ({ request, env }) => {
  const origin = getAllowedOrigin(request, env)
  if (!origin) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin)
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = getAllowedOrigin(request, env)
  if (!origin) {
    return Response.json({ error: 'origin_not_allowed' }, { status: 403 })
  }

  if (
    !env.CLIENT_ID ||
    !env.CLIENT_SECRET ||
    !env.GITHUB_REDIRECT_URI
  ) {
    return jsonResponse({ error: 'server_not_configured' }, 503, origin)
  }

  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    return jsonResponse({ error: 'content_type_must_be_json' }, 415, origin)
  }

  let payload: TokenRequestBody
  try {
    payload = await request.json<TokenRequestBody>()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, origin)
  }

  if (!isValidCode(payload.code)) {
    return jsonResponse({ error: 'invalid_code' }, 400, origin)
  }

  if (!isValidCodeVerifier(payload.codeVerifier)) {
    return jsonResponse({ error: 'invalid_code_verifier' }, 400, origin)
  }

  if (payload.redirectUri !== env.GITHUB_REDIRECT_URI) {
    return jsonResponse({ error: 'redirect_uri_mismatch' }, 400, origin)
  }

  const form = new URLSearchParams({
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    code: payload.code,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    code_verifier: payload.codeVerifier
  })

  try {
    const githubResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      }
    )

    const tokenData = await githubResponse.json<GitHubTokenResponse>()
    if (!githubResponse.ok || !tokenData.access_token) {
      return jsonResponse(
        {
          error: tokenData.error || 'github_token_exchange_failed',
          error_description: tokenData.error_description || undefined
        },
        400,
        origin
      )
    }

    return jsonResponse(
      {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'bearer',
        scope: tokenData.scope || ''
      },
      200,
      origin
    )
  } catch {
    return jsonResponse({ error: 'github_unavailable' }, 502, origin)
  }
}
