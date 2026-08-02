
import backendHttp from './backend'
import type { AxiosResponse } from 'axios'

export interface OAuthTokenRequest {
  code: string
  codeVerifier: string
  redirectUri: string
}

export interface OAuthTokenResponse {
  token_type: string
  access_token: string
  scope: string
}

export const authApi = {
  getToken(
    payload: OAuthTokenRequest
  ): Promise<AxiosResponse<OAuthTokenResponse>> {
    return backendHttp.post('/oauth/token', payload)
  }
}
