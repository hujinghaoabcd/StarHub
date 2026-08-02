export const OAUTH_CALLBACK_MESSAGE_TYPE = 'starhub:oauth-callback' as const

export interface OAuthCallbackMessage {
  type: typeof OAUTH_CALLBACK_MESSAGE_TYPE
  code: string
  state: string
}

export function parseOAuthCallback(
  search: string
): OAuthCallbackMessage | null {
  const params = new URLSearchParams(search)
  const code = params.get('code')?.trim() || ''
  const state = params.get('state')?.trim() || ''

  if (!code || !state) {
    return null
  }

  return {
    type: OAUTH_CALLBACK_MESSAGE_TYPE,
    code,
    state
  }
}

export function getOAuthCallbackChannelName(state: string): string {
  return `starhub:oauth-callback:${state}`
}

/**
 * Relays a GitHub OAuth callback to the window that opened the popup.
 *
 * This must run before Vue and the router are mounted. Otherwise an already
 * authenticated user is redirected to /home and the callback query is never
 * handled by the login page.
 */
export function relayOAuthPopupCallback(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const message = parseOAuthCallback(window.location.search)
  if (!message) {
    return false
  }

  let delivered = false

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin)
      delivered = true
    }
  } catch {
    // BroadcastChannel below is the fallback when opener access was severed.
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(
        getOAuthCallbackChannelName(message.state)
      )
      channel.postMessage(message)
      channel.close()
      delivered = true
    } catch {
      // The opener path may still have delivered the callback.
    }
  }

  if (!delivered) {
    return false
  }

  window.history.replaceState(
    {},
    document.title,
    `${window.location.pathname}${window.location.hash || ''}`
  )

  document.documentElement.innerHTML =
    '<head><title>GitHub authorization complete</title></head>' +
    '<body style="margin:0;display:grid;place-items:center;min-height:100vh;' +
    'font-family:system-ui,sans-serif;background:#1c2333;color:#e8e8e8">' +
    '<p>GitHub 授权已完成，窗口正在关闭…</p></body>'

  window.setTimeout(() => window.close(), 80)
  return true
}
