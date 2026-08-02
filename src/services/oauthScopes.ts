export function parseOAuthScopes(value: unknown): Set<string> {
  if (typeof value !== 'string') {
    return new Set()
  }

  return new Set(
    value
      .split(/[\s,]+/)
      .map(scope => scope.trim())
      .filter(Boolean)
  )
}

export function hasOAuthScope(value: unknown, requiredScope: string): boolean {
  const scopes = parseOAuthScopes(value)

  if (scopes.has(requiredScope)) {
    return true
  }

  if (requiredScope === 'public_repo' && scopes.has('repo')) {
    return true
  }

  if (requiredScope === 'read:user' && scopes.has('user')) {
    return true
  }

  return false
}
