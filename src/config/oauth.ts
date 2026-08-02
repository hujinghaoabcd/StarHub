
/**
 * GitHub OAuth public configuration.
 * Client ID may be exposed to the browser. Client Secret must only exist in
 * Cloudflare Pages Variables and Secrets.
 */

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '')

export const GITHUB_OAUTH_CONFIG = {
  CLIENT_ID:
    (import.meta.env.VITE_GITHUB_CLIENT_ID || '').trim() ||
    'Ov23liIm4iNdpnHwGLfp',
  API_BASE_URL:
    configuredApiBaseUrl || (import.meta.env.DEV ? '/api' : '')
}
