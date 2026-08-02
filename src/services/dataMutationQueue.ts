let mutationTail: Promise<void> = Promise.resolve()

/**
 * Serialize IndexedDB mutations that span repositories, tags, or relations.
 * A rejected mutation does not poison the queue for later operations.
 */
export function runDataMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationTail.then(operation, operation)
  mutationTail = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

/** Wait until every mutation scheduled before this call has settled. */
export async function waitForDataMutations(): Promise<void> {
  await mutationTail
}
