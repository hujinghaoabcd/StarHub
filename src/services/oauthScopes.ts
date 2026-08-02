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
  return parseOAuthScopes(value).has(requiredScope)
}
