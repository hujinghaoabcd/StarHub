import qs from 'query-string'
import { authApi } from '@/api/auth'
import { githubApi } from '@/api/github'
import { GITHUB_OAUTH_CONFIG } from '@/config/oauth'
import { openWindowCenter } from '@/utils'
import { AuthToken } from '@/utils/auth'
import {
  getOAuthCallbackChannelName,
  type OAuthCallbackMessage
} from '@/utils/oauthCallback'
import {
  clearOAuthRequest,
  consumeOAuthRequest,
  createOAuthRequest,
  getOAuthRedirectUri
} from '@/utils/oauth'
import { hasOAuthScope, parseOAuthScopes } from './oauthScopes'

export type OAuthPermissionErrorCode =
  | 'popup_blocked'
  | 'popup_closed'
  | 'authorization_denied'
  | 'authorization_timeout'
  | 'scope_not_granted'
  | 'invalid_callback'

export class OAuthPermissionError extends Error {
  constructor(
    public readonly code: OAuthPermissionErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'OAuthPermissionError'
  }
}

function getHeader(
  headers: Record<string, unknown> | undefined,
  name: string
): unknown {
  if (!headers) return undefined

  const direct = headers[name]
  if (direct !== undefined) return direct

  const lowerName = name.toLowerCase()
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === lowerName
  )
  return entry?.[1]
}

export async function currentTokenHasScope(
  requiredScope: string
): Promise<boolean | null> {
  const response = await githubApi.getLoginUser()
  const header = getHeader(
    response.headers as unknown as Record<string, unknown>,
    'x-oauth-scopes'
  )

  if (header === undefined || header === null || header === '') {
    return null
  }

  return hasOAuthScope(String(header), requiredScope)
}

export async function authorizeGitHubScopes(
  requestedScopes: readonly string[]
): Promise<Set<string>> {
  const clientId = GITHUB_OAUTH_CONFIG.CLIENT_ID
  if (!clientId) {
    throw new OAuthPermissionError(
      'invalid_callback',
      'GitHub OAuth Client ID is not configured.'
    )
  }

  const uniqueScopes = Array.from(new Set(requestedScopes.filter(Boolean)))
  const { state, codeChallenge } = await createOAuthRequest()
  const redirectUri = getOAuthRedirectUri()
  const authorizeUrl =
    'https://github.com/login/oauth/authorize?' +
    qs.stringify({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: uniqueScopes.join(' ')
    })

  const popup = openWindowCenter(
    authorizeUrl,
    'starhubPermissionUpgrade',
    600,
    700
  )

  if (!popup) {
    clearOAuthRequest()
    throw new OAuthPermissionError(
      'popup_blocked',
      'The browser blocked the GitHub authorization window.'
    )
  }

  return new Promise<Set<string>>((resolve, reject) => {
    let settled = false
    let popupClosedAt: number | null = null
    let callbackChannel: BroadcastChannel | null = null

    const cleanup = (closePopup: boolean) => {
      window.removeEventListener('message', handleMessage)
      callbackChannel?.removeEventListener('message', handleChannelMessage)
      callbackChannel?.close()
      window.clearInterval(popupTimer)
      window.clearTimeout(timeoutTimer)

      if (closePopup && !popup.closed) {
        popup.close()
      }
    }

    const fail = (error: OAuthPermissionError) => {
      if (settled) return
      settled = true
      cleanup(true)
      clearOAuthRequest()
      reject(error)
    }

    const succeed = (scopes: Set<string>) => {
      if (settled) return
      settled = true
      cleanup(true)
      resolve(scopes)
    }

    const processCallback = async (message: OAuthCallbackMessage) => {
      if (
        settled ||
        message?.type !== 'starhub:oauth-callback' ||
        message.state !== state
      ) {
        return
      }

      try {
        const codeVerifier = consumeOAuthRequest(message.state)
        const response = await authApi.getToken({
          code: message.code,
          codeVerifier,
          redirectUri
        })
        const grantedScopes = parseOAuthScopes(response.data.scope)
        const missingScope = uniqueScopes.find(
          scope => !hasOAuthScope(response.data.scope, scope)
        )

        if (missingScope) {
          fail(
            new OAuthPermissionError(
              'scope_not_granted',
              `GitHub did not grant the required scope: ${missingScope}`
            )
          )
          return
        }

        AuthToken.setGithubToken(
          `${response.data.token_type} ${response.data.access_token}`
        )
        succeed(grantedScopes)
      } catch (error) {
        console.error('GitHub permission upgrade failed:', error)
        fail(
          new OAuthPermissionError(
            'invalid_callback',
            'The GitHub authorization callback could not be verified.'
          )
        )
      }
    }

    const handleMessage = (event: MessageEvent<OAuthCallbackMessage>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== popup
      ) {
        return
      }

      void processCallback(event.data)
    }

    const handleChannelMessage = (
      event: MessageEvent<OAuthCallbackMessage>
    ) => {
      void processCallback(event.data)
    }

    if (typeof BroadcastChannel !== 'undefined') {
      callbackChannel = new BroadcastChannel(
        getOAuthCallbackChannelName(state)
      )
      callbackChannel.addEventListener('message', handleChannelMessage)
    }

    const popupTimer = window.setInterval(() => {
      if (popup.closed) {
        if (popupClosedAt === null) {
          popupClosedAt = Date.now()
          return
        }

        if (Date.now() - popupClosedAt >= 1_000) {
          fail(
            new OAuthPermissionError(
              'popup_closed',
              'The GitHub authorization window was closed.'
            )
          )
        }
        return
      }

      popupClosedAt = null

      try {
        const popupUrl = new URL(popup.location.href)
        if (
          popupUrl.origin === window.location.origin &&
          popupUrl.searchParams.has('error')
        ) {
          fail(
            new OAuthPermissionError(
              'authorization_denied',
              popupUrl.searchParams.get('error_description') ||
                'GitHub authorization was denied.'
            )
          )
        }
      } catch {
        // Cross-origin access is expected while the popup is on github.com.
      }
    }, 400)

    const timeoutTimer = window.setTimeout(() => {
      fail(
        new OAuthPermissionError(
          'authorization_timeout',
          'GitHub authorization timed out.'
        )
      )
    }, 120_000)

    window.addEventListener('message', handleMessage)
  })
}
