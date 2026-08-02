
const LEGACY_APP_TOKEN_KEY = 'app-token'
const GITHUB_TOKEN_KEY = 'github-token'

export const AuthToken = {
  getAppToken(): string | null {
    return this.getGithubToken()
  },

  getGithubToken(): string | null {
    return localStorage.getItem(GITHUB_TOKEN_KEY)
  },

  setGithubToken(githubToken: string): void {
    localStorage.removeItem(LEGACY_APP_TOKEN_KEY)
    localStorage.setItem(GITHUB_TOKEN_KEY, githubToken)
  },

  setToken(_appToken: string, githubToken: string): void {
    this.setGithubToken(githubToken)
  },

  clean(): void {
    localStorage.removeItem(LEGACY_APP_TOKEN_KEY)
    localStorage.removeItem(GITHUB_TOKEN_KEY)
  },

  exist(): boolean {
    return Boolean(this.getGithubToken())
  }
}
