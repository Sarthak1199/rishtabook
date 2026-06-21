// Server-side in-memory cache for Prokerala guna match results
// Keyed by groomId (bride is always the same). Lives for the server process lifetime.

const cache = new Map<string, object>()

export function getCachedGuna(groomId: string): object | null {
  return cache.get(groomId) ?? null
}

export function setCachedGuna(groomId: string, result: object) {
  cache.set(groomId, result)
}
