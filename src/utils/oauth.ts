
const OAUTH_STATE_KEY = 'starhub-oauth-state'
const OAUTH_CODE_VERIFIER_KEY = 'starhub-oauth-code-verifier'

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  )
  const binary = Array.from(new Uint8Array(digest), (byte) =>
    String.fromCharCode(byte)
  ).join('')
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function getOAuthRedirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}

export async function createOAuthRequest(): Promise<{
  state: string
  codeVerifier: string
  codeChallenge: string
}> {
  const state = randomBase64Url(32)
  const codeVerifier = randomBase64Url(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)

  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  sessionStorage.setItem(OAUTH_CODE_VERIFIER_KEY, codeVerifier)

  return { state, codeVerifier, codeChallenge }
}

export function consumeOAuthRequest(returnedState: string): string {
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
  const codeVerifier = sessionStorage.getItem(OAUTH_CODE_VERIFIER_KEY)
  clearOAuthRequest()

  if (!expectedState || !codeVerifier || returnedState !== expectedState) {
    throw new Error('oauth_state_mismatch')
  }

  return codeVerifier
}

export function clearOAuthRequest(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_CODE_VERIFIER_KEY)
}
